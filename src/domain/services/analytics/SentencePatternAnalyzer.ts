import { Conversation } from '../../models/Conversation.js';
import { SentenceAnalysisSummary, SentenceIntent, SentencePatternStat, SentenceSentiment } from '../../models/analytics/AnalyticsReport.js';

interface SentenceAccumulator {
    normalized: string;
    displaySentence: string;
    count: number;
    totalLength: number;
    intents: Map<SentenceIntent, number>;
    sentiments: Map<SentenceSentiment, number>;
    tags: Set<string>;
    conversationIds: Set<string>;
    contexts: Set<string>;
}

const INTENT_ORDER: SentenceIntent[] = ['issue', 'question', 'request', 'learning', 'planning', 'statement'];

interface SentenceSample {
    conversationId: string;
    projectName: string;
    fullText: string;
    sentence: string;
    normalized: string;
}

export class SentencePatternAnalyzer {
    analyze(conversations: Conversation[]): SentenceAnalysisSummary {
        const accumulators = new Map<string, SentenceAccumulator>();
        const intentDistribution = new Map<SentenceIntent, number>();
        let totalSentences = 0;
        let totalLength = 0;

        const samples = this.extractSentenceSamples(conversations);

        samples.forEach(sample => {
            const intent = this.detectIntent(sample.sentence);
            const sentiment = this.detectSentiment(sample.sentence);
            const tags = this.collectTags(sample.sentence, intent);
            const context = this.extractContext(sample.fullText, sample.sentence);

            totalSentences++;
            totalLength += sample.sentence.length;
            intentDistribution.set(intent, (intentDistribution.get(intent) || 0) + 1);

            if (!accumulators.has(sample.normalized)) {
                accumulators.set(sample.normalized, {
                    normalized: sample.normalized,
                    displaySentence: sample.sentence.trim(),
                    count: 0,
                    totalLength: 0,
                    intents: new Map(),
                    sentiments: new Map(),
                    tags: new Set<string>(),
                    conversationIds: new Set<string>(),
                    contexts: new Set<string>()
                });
            }

            const acc = accumulators.get(sample.normalized)!;
            acc.count++;
            acc.totalLength += sample.sentence.length;
            acc.intents.set(intent, (acc.intents.get(intent) || 0) + 1);
            acc.sentiments.set(sentiment, (acc.sentiments.get(sentiment) || 0) + 1);
            tags.forEach(tag => acc.tags.add(tag));
            acc.conversationIds.add(sample.conversationId);
            if (context) {
                acc.contexts.add(context);
            }
        });

        const statsArray = Array.from(accumulators.values()).map(acc => this.toSentenceStat(acc));
        const sorted = [...statsArray].sort((a, b) => b.frequency - a.frequency);
        const topSentences = sorted.slice(0, 5);
        const topQuestions = sorted.filter(stat => stat.intent === 'question').slice(0, 5);
        const troubleshootingSentences = sorted.filter(stat => stat.intent === 'issue').slice(0, 5);

        const totalUnique = accumulators.size;
        const averageSentenceLength = totalSentences ? totalLength / totalSentences : 0;
        const averageSentencesPerConversation = conversations.length
            ? totalSentences / conversations.length
            : 0;

        return {
            totalSentences,
            uniqueSentences: totalUnique,
            averageSentenceLength,
            averageSentencesPerConversation,
            intentBreakdown: this.buildIntentBreakdown(intentDistribution, totalSentences),
            topSentences,
            topQuestions,
            troubleshootingSentences
        };
    }

    public collectSentencePrompts(conversations: Conversation[], limit: number = 500): string[] {
        const samples = this.extractSentenceSamples(conversations);
        return samples
            .slice(0, limit)
            .map(sample => {
                const prefix = sample.projectName ? `[${sample.projectName}] ` : '';
                return `${prefix}${sample.sentence}`;
            });
    }

    private extractSentenceSamples(conversations: Conversation[]): SentenceSample[] {
        const samples: SentenceSample[] = [];

        conversations.forEach(conversation => {
            const projectName = conversation.projectContext?.name ?? '';
            const userMessages = conversation.getUserMessages();
            userMessages.forEach(message => {
                const content = message.getContent ? message.getContent() : (message as any).content || '';
                if (!content || !content.trim()) return;

                this.splitIntoSentences(content).forEach(sentence => {
                    if (sentence.length < 6) return;
                    const normalized = this.normalizeSentence(sentence);
                    if (!normalized) return;

                    samples.push({
                        conversationId: conversation.sessionId,
                        projectName,
                        fullText: content,
                        sentence: sentence.trim(),
                        normalized
                    });
                });
            });
        });

        return samples;
    }

    private splitIntoSentences(text: string): string[] {
        const cleaned = text
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]+`/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleaned) return [];

        return cleaned
            .replace(/([.!?。！？])\s+/g, '$1|')
            .replace(/\n+/g, '|')
            .split('|')
            .map(sentence => sentence.trim())
            .filter(sentence => sentence.length > 0 && /[a-zA-Z\u4e00-\u9fa5]/.test(sentence));
    }

    private normalizeSentence(sentence: string): string {
        return sentence
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private detectIntent(sentence: string): SentenceIntent {
        const lower = sentence.toLowerCase();
        if (/(error|exception|bug|crash|fail(ed)?|not working|stack trace|cannot|can't)/.test(lower)) {
            return 'issue';
        }
        if (lower.includes('?') || /^(how|what|why|can|could|would|is|are|do|does|should|any chance)\b/.test(lower)) {
            return 'question';
        }
        if (/(please|could you|can you|help me|show me|walk me|i need you to)/.test(lower)) {
            return 'request';
        }
        if (/(learn|explain|understand|difference|concept|meaning)/.test(lower)) {
            return 'learning';
        }
        if (/(plan|roadmap|strategy|next step|approach|timeline)/.test(lower)) {
            return 'planning';
        }
        return 'statement';
    }

    private detectSentiment(sentence: string): SentenceSentiment {
        const lower = sentence.toLowerCase();
        const positives = ['thank', 'thanks', 'appreciate', 'love', 'great', 'awesome', 'nice'];
        const negatives = ['hate', 'frustrated', "can't", 'cannot', 'stuck', 'annoyed', 'wtf', 'bad'];

        const positiveScore = positives.reduce((score, word) => score + (lower.includes(word) ? 1 : 0), 0);
        const negativeScore = negatives.reduce((score, word) => score + (lower.includes(word) ? 1 : 0), 0);

        if (positiveScore > negativeScore) return 'positive';
        if (negativeScore > positiveScore) return 'negative';
        return 'neutral';
    }

    private collectTags(sentence: string, intent: SentenceIntent): string[] {
        const tags = new Set<string>();
        switch (intent) {
            case 'issue':
                tags.add('troubleshooting');
                break;
            case 'question':
                tags.add('curiosity');
                break;
            case 'request':
                tags.add('actionable');
                break;
            case 'learning':
                tags.add('learning');
                break;
            case 'planning':
                tags.add('planning');
                break;
            default:
                tags.add('statement');
                break;
        }

        if (/refactor|optimiz(e|ation)|performance/.test(sentence.toLowerCase())) {
            tags.add('engineering');
        }

        return Array.from(tags);
    }

    private extractContext(fullText: string, sentence: string): string | null {
        const lowerFull = fullText.toLowerCase();
        const lowerSentence = sentence.toLowerCase().trim();
        const index = lowerFull.indexOf(lowerSentence);
        if (index === -1) return null;

        const contextRadius = 80;
        const start = Math.max(0, index - contextRadius);
        const end = Math.min(fullText.length, index + sentence.length + contextRadius);
        const snippet = fullText.substring(start, end).trim();
        const prefix = start > 0 ? '…' : '';
        const suffix = end < fullText.length ? '…' : '';
        return `${prefix}${snippet}${suffix}`;
    }

    private toSentenceStat(acc: SentenceAccumulator): SentencePatternStat {
        const intent = this.getTopCategory(acc.intents, 'statement');
        const sentiment = this.getTopCategory(acc.sentiments, 'neutral');
        return {
            sentence: acc.displaySentence,
            normalized: acc.normalized,
            frequency: acc.count,
            intent,
            sentiment,
            averageLength: acc.count ? acc.totalLength / acc.count : acc.displaySentence.length,
            tags: Array.from(acc.tags),
            conversationCount: acc.conversationIds.size,
            sampleContexts: Array.from(acc.contexts).slice(0, 3)
        };
    }

    private getTopCategory<T>(counts: Map<T, number>, fallback: T): T {
        let topCategory = fallback;
        let max = -1;
        counts.forEach((value, key) => {
            if (value > max) {
                max = value;
                topCategory = key;
            }
        });
        return topCategory;
    }

    private buildIntentBreakdown(
        distribution: Map<SentenceIntent, number>,
        total: number
    ) {
        return INTENT_ORDER.map(intent => {
            const count = distribution.get(intent) || 0;
            return {
                intent,
                count,
                percentage: total ? (count / total) * 100 : 0
            };
        });
    }
}
