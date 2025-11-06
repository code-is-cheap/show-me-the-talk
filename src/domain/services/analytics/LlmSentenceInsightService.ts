import { Conversation } from '../../models/Conversation.js';
import { SentenceAnalysisSummary, SentencePatternStat, SentenceIntent, SentenceSentiment } from '../../models/analytics/AnalyticsReport.js';
import { SentencePatternAnalyzer } from './SentencePatternAnalyzer.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

type LlmMode = 'auto' | 'mock' | 'live';

interface LlmSentenceInsightOptions {
    endpoint?: string;
    apiKey?: string;
    model?: string;
    maxSentences?: number;
    maxTokens?: number;
    mode?: LlmMode;
    fixturePath?: string;
    cachePath?: string;
}

export class LlmSentenceInsightService {
    private readonly endpoint?: string;
    private readonly apiKey?: string;
    private readonly model?: string;
    private readonly maxSentences: number;
    private readonly maxTokens: number;
    private readonly mode: LlmMode;
    private readonly fixturePath: string;
    private readonly cachePath?: string;

    constructor(options: LlmSentenceInsightOptions = {}) {
        this.endpoint = options.endpoint
            ?? process.env.ANALYTICS_LLM_ENDPOINT
            ?? process.env.ANTHROPIC_BASE_URL
            ?? 'https://open.bigmodel.cn/api/anthropic/v1/messages';
        this.apiKey = options.apiKey ?? process.env.ANALYTICS_LLM_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN;
        this.model = options.model ?? process.env.ANALYTICS_LLM_MODEL ?? 'GLM-4.6';
        this.maxSentences = options.maxSentences ?? 500;
        this.maxTokens = options.maxTokens ?? Number(process.env.ANALYTICS_LLM_MAX_TOKENS ?? 1024);
        const envMode = (options.mode ?? process.env.ANALYTICS_LLM_MODE ?? 'auto').toString().toLowerCase();
        this.mode = (['auto', 'mock', 'live'].includes(envMode) ? envMode : 'auto') as LlmMode;
        this.fixturePath = options.fixturePath
            ?? process.env.ANALYTICS_LLM_FIXTURE
            ?? resolve(process.cwd(), 'tests/fixtures/llm/sentence-insights.mock.json');
        this.cachePath = options.cachePath ?? process.env.ANALYTICS_LLM_CACHE_PATH;
    }

    isEnabled(): boolean {
        return Boolean(this.endpoint && this.apiKey);
    }

    async enhanceAnalysis(
        conversations: Conversation[],
        analyzer: SentencePatternAnalyzer,
        fallback: SentenceAnalysisSummary
    ): Promise<SentenceAnalysisSummary> {
        if (this.mode === 'mock') {
            const mock = this.loadFixtureSummary();
            return mock ? this.mergeWithFallback(mock, fallback) : fallback;
        }

        const liveEnabled = this.isEnabled();
        if (!liveEnabled && (this.mode === 'live')) {
            console.warn('[LLM Sentence Insights] Live mode requested but endpoint/api key missing.');
            return fallback;
        }

        if (!liveEnabled) {
            return fallback;
        }

        const sentences = analyzer.collectSentencePrompts(conversations, this.maxSentences);
        if (sentences.length === 0) {
            return fallback;
        }

        try {
            const body = this.buildAnthropicPayload(sentences, fallback);
            const response = await fetch(this.endpoint!, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey!
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                console.warn('[LLM Sentence Insights] HTTP error', response.status, response.statusText);
                return fallback;
            }

            const data = await response.json();
            const parsed = this.parseAnthropicResponse(data);
            if (parsed && this.cachePath) {
                try {
                    writeFileSync(this.cachePath, JSON.stringify(parsed, null, 2));
                } catch (cacheError) {
                    console.warn('[LLM Sentence Insights] Failed to write cache', cacheError);
                }
            }

            const normalized = this.mergeWithFallback(parsed, fallback);
            return normalized;
        } catch (error) {
            console.warn('[LLM Sentence Insights] Request failed', error);
            return fallback;
        }
    }

    private loadFixtureSummary(): SentenceAnalysisSummary | null {
        if (!this.fixturePath || !existsSync(this.fixturePath)) {
            console.warn('[LLM Sentence Insights] Mock mode enabled but fixture not found', this.fixturePath);
            return null;
        }

        try {
            const raw = readFileSync(this.fixturePath, 'utf8');
            const parsed = JSON.parse(raw);
            return this.normalizeResponse(parsed);
        } catch (error) {
            console.warn('[LLM Sentence Insights] Failed to load fixture', error);
            return null;
        }
    }

    private buildAnthropicPayload(
        sentences: string[],
        fallback: SentenceAnalysisSummary
    ) {
        const sentenceBlock = sentences
            .map((sentence, index) => `${index + 1}. ${sentence}`)
            .join('\n');

        const fallbackBlock = JSON.stringify(fallback, null, 2);

        const systemPrompt = `You are an analytics assistant who summarizes developer conversations.
Analyze the provided sentences and return JSON matching this TypeScript type:
{
  "totalSentences": number,
  "uniqueSentences": number,
  "averageSentenceLength": number,
  "averageSentencesPerConversation": number,
  "intentBreakdown": Array<{ "intent": "question" | "request" | "issue" | "learning" | "planning" | "statement", "count": number, "percentage": number }> ,
  "topSentences": SentenceEntry[],
  "topQuestions": SentenceEntry[],
  "troubleshootingSentences": SentenceEntry[]
}
Where SentenceEntry = {
  "sentence": string,
  "normalized": string,
  "frequency": number,
  "intent": "question" | "request" | "issue" | "learning" | "planning" | "statement",
  "sentiment": "positive" | "neutral" | "negative",
  "averageLength": number,
  "tags": string[],
  "conversationCount": number,
  "sampleContexts": string[]
}.
Always respond with valid JSON and no prose.`;

        const userPrompt = `Here are up to ${sentences.length} recent user sentences (one per line):\n${sentenceBlock}\n\nHere is a fallback analytics summary you may refine or improve:\n${fallbackBlock}`;

        return {
            model: this.model,
            max_tokens: this.maxTokens,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        };
    }

    private parseAnthropicResponse(payload: any): SentenceAnalysisSummary | null {
        if (!payload) return null;
        const content = Array.isArray(payload.content) ? payload.content : [];
        const textChunk = content.find((part: any) => part?.type === 'text')?.text
            ?? (typeof payload.content === 'string' ? payload.content : undefined);
        if (!textChunk) return null;

        try {
            const parsed = JSON.parse(textChunk);
            return this.normalizeResponse(parsed);
        } catch (error) {
            console.warn('[LLM Sentence Insights] Failed to parse JSON response', error);
            return null;
        }
    }

    private normalizeResponse(candidate: Partial<SentenceAnalysisSummary> | undefined): SentenceAnalysisSummary | null {
        if (!candidate) return null;

        const validateStatArray = (entries?: SentencePatternStat[]): SentencePatternStat[] | undefined => {
            if (!Array.isArray(entries)) return undefined;
            return entries
                .filter(entry => typeof entry?.sentence === 'string' && entry.sentence.length > 0)
                .map(entry => ({
                    sentence: entry.sentence,
                    normalized: entry.normalized || entry.sentence.toLowerCase(),
                    frequency: typeof entry.frequency === 'number' ? entry.frequency : 0,
                    intent: this.ensureIntent(entry.intent),
                    sentiment: this.ensureSentiment(entry.sentiment),
                    averageLength: typeof entry.averageLength === 'number' ? entry.averageLength : entry.sentence.length,
                    tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 5).map(String) : [],
                    conversationCount: typeof entry.conversationCount === 'number' ? entry.conversationCount : entry.frequency,
                    sampleContexts: Array.isArray(entry.sampleContexts) ? entry.sampleContexts.slice(0, 3).map(String) : []
                }));
        };

        return {
            totalSentences: candidate.totalSentences ?? 0,
            uniqueSentences: candidate.uniqueSentences ?? 0,
            averageSentenceLength: candidate.averageSentenceLength ?? 0,
            averageSentencesPerConversation: candidate.averageSentencesPerConversation ?? 0,
            intentBreakdown: Array.isArray(candidate.intentBreakdown) && candidate.intentBreakdown.length
                ? candidate.intentBreakdown.map(item => ({
                    intent: this.ensureIntent(item.intent),
                    count: typeof item.count === 'number' ? item.count : 0,
                    percentage: typeof item.percentage === 'number' ? item.percentage : 0
                }))
                : [],
            topSentences: validateStatArray(candidate.topSentences) || [],
            topQuestions: validateStatArray(candidate.topQuestions) || [],
            troubleshootingSentences: validateStatArray(candidate.troubleshootingSentences) || []
        };
    }

    private mergeWithFallback(
        candidate: SentenceAnalysisSummary | null,
        fallback: SentenceAnalysisSummary
    ): SentenceAnalysisSummary {
        if (!candidate) return fallback;

        const mergeArray = (
            primary: SentencePatternStat[] | undefined,
            secondary: SentencePatternStat[]
        ) => (primary && primary.length ? primary : secondary);

        return {
            totalSentences: candidate.totalSentences || fallback.totalSentences,
            uniqueSentences: candidate.uniqueSentences || fallback.uniqueSentences,
            averageSentenceLength: candidate.averageSentenceLength || fallback.averageSentenceLength,
            averageSentencesPerConversation: candidate.averageSentencesPerConversation || fallback.averageSentencesPerConversation,
            intentBreakdown: candidate.intentBreakdown && candidate.intentBreakdown.length
                ? candidate.intentBreakdown
                : fallback.intentBreakdown,
            topSentences: mergeArray(candidate.topSentences, fallback.topSentences),
            topQuestions: mergeArray(candidate.topQuestions, fallback.topQuestions),
            troubleshootingSentences: mergeArray(candidate.troubleshootingSentences, fallback.troubleshootingSentences)
        };
    }

    private ensureIntent(intent?: SentenceIntent | string): SentenceIntent {
        const normalized = String(intent || '').toLowerCase();
        const intents: SentenceIntent[] = ['question', 'request', 'issue', 'learning', 'planning', 'statement'];
        return intents.includes(normalized as SentenceIntent) ? (normalized as SentenceIntent) : 'statement';
    }

    private ensureSentiment(sentiment?: SentenceSentiment | string): SentenceSentiment {
        const normalized = String(sentiment || '').toLowerCase();
        const sentiments: SentenceSentiment[] = ['positive', 'neutral', 'negative'];
        return sentiments.includes(normalized as SentenceSentiment) ? (normalized as SentenceSentiment) : 'neutral';
    }
}
