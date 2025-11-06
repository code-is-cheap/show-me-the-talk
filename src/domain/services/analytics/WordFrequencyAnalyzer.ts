import { Conversation } from '../../models/Conversation.js';
import { WordEntry, PhraseEntry, WordCloudData, WordCloudMode } from '../../models/analytics/index.js';
import { ConversationTextAnalyzer } from './ConversationTextAnalyzer.js';

/**
 * Configuration for word frequency analysis
 */
export interface FrequencyAnalysisConfig {
    minFrequency: number;           // Minimum frequency to include
    maxWords: number;               // Maximum number of words to return
    ngramSize: number[];            // N-gram sizes to extract (e.g., [2, 3])
    includeTechnicalTerms: boolean; // Whether to categorize technical terms
}

/**
 * Term frequency data
 */
interface TermFrequency {
    term: string;
    frequency: number;
    documents: Set<string>;  // Document IDs where term appears
}

/**
 * Analyzer for word frequency and N-gram extraction
 */
export class WordFrequencyAnalyzer {
    private textAnalyzer: ConversationTextAnalyzer;

    constructor(
        textAnalyzer?: ConversationTextAnalyzer
    ) {
        this.textAnalyzer = textAnalyzer || new ConversationTextAnalyzer();
    }

    /**
     * Analyze word frequencies from conversations
     */
    analyzeFrequencies(
        conversations: Conversation[],
        config: Partial<FrequencyAnalysisConfig> = {}
    ): WordCloudData {
        const fullConfig = this.getDefaultConfig(config);

        // Extract and analyze text
        const allTexts = this.textAnalyzer.extractFromConversations(conversations);
        const combinedAnalysis = this.textAnalyzer.analyzeConversations(conversations);

        // Calculate term frequencies
        const termFreqs = this.calculateTermFrequencies(allTexts);

        // Calculate TF-IDF weights
        const tfidfWeights = this.calculateTFIDF(termFreqs, conversations.length);

        // Generate word entries
        const words = this.generateWordEntries(
            tfidfWeights,
            fullConfig.minFrequency,
            fullConfig.maxWords,
            fullConfig.includeTechnicalTerms
        );

        // Extract N-gram phrases
        const phrases = this.extractNGrams(
            allTexts,
            fullConfig.ngramSize,
            fullConfig.minFrequency,
            fullConfig.maxWords
        );

        return new WordCloudData(
            words,
            phrases,
            [], // Concepts will be filled by SemanticConceptExtractor
            WordCloudMode.WORD,
            combinedAnalysis.wordCount,
            combinedAnalysis.uniqueWords
        );
    }

    /**
     * Calculate term frequencies across all texts
     */
    private calculateTermFrequencies(texts: any[]): Map<string, TermFrequency> {
        const frequencies = new Map<string, TermFrequency>();

        texts.forEach(text => {
            const tokens = this.textAnalyzer.tokenize(text.content);
            const filteredTokens = this.textAnalyzer.filterTokens(
                tokens,
                this.textAnalyzer.detectLanguage(text.content)
            );

            // Track unique terms per document
            const uniqueTerms = new Set(filteredTokens.map(t => t.toLowerCase()));

            uniqueTerms.forEach(term => {
                if (!frequencies.has(term)) {
                    frequencies.set(term, {
                        term,
                        frequency: 0,
                        documents: new Set()
                    });
                }

                const termData = frequencies.get(term)!;
                termData.frequency += filteredTokens.filter(t => t.toLowerCase() === term).length;
                termData.documents.add(text.conversationId);
            });
        });

        return frequencies;
    }

    /**
     * Calculate TF-IDF (Term Frequency-Inverse Document Frequency) weights
     */
    private calculateTFIDF(
        termFreqs: Map<string, TermFrequency>,
        totalDocuments: number
    ): Map<string, number> {
        const tfidf = new Map<string, number>();

        termFreqs.forEach((termData, term) => {
            // TF: Term frequency (normalized)
            const tf = termData.frequency;

            // IDF: Inverse document frequency
            const idf = Math.log(totalDocuments / termData.documents.size);

            // TF-IDF score
            tfidf.set(term, tf * idf);
        });

        return tfidf;
    }

    /**
     * Generate word entries with categories
     */
    private generateWordEntries(
        tfidfWeights: Map<string, number>,
        minFrequency: number,
        maxWords: number,
        includeTechnicalTerms: boolean
    ): WordEntry[] {
        const entries: WordEntry[] = [];

        tfidfWeights.forEach((weight, term) => {
            // Skip if below minimum frequency
            if (weight < minFrequency) return;

            // Categorize if enabled
            let category: string | undefined;
            if (includeTechnicalTerms) {
                category = this.categorizeTerm(term);
            }

            entries.push({
                text: term,
                value: Math.round(weight),
                weight,
                category
            });
        });

        // Sort by weight and limit
        entries.sort((a, b) => b.weight - a.weight);
        return entries.slice(0, maxWords);
    }

    /**
     * Extract N-gram phrases from text
     */
    private extractNGrams(
        texts: any[],
        ngramSizes: number[],
        minFrequency: number,
        maxPhrases: number
    ): PhraseEntry[] {
        const phrases = new Map<string, { count: number; contexts: Set<string> }>();

        texts.forEach(text => {
            const tokens = this.textAnalyzer.tokenize(text.content);
            const filteredTokens = this.textAnalyzer.filterTokens(
                tokens,
                this.textAnalyzer.detectLanguage(text.content)
            );

            // Extract N-grams for each size
            ngramSizes.forEach(n => {
                const ngrams = this.generateNGrams(filteredTokens, n);

                ngrams.forEach(ngram => {
                    const phrase = ngram.join(' ');

                    if (!phrases.has(phrase)) {
                        phrases.set(phrase, { count: 0, contexts: new Set() });
                    }

                    const phraseData = phrases.get(phrase)!;
                    phraseData.count++;

                    // Store context (surrounding words)
                    const context = this.getContext(text.content, phrase);
                    if (context) {
                        phraseData.contexts.add(context);
                    }
                });
            });
        });

        // Convert to PhraseEntry array
        const entries: PhraseEntry[] = [];
        phrases.forEach((data, phrase) => {
            if (data.count >= minFrequency) {
                entries.push({
                    text: phrase,
                    frequency: data.count,
                    contexts: Array.from(data.contexts).slice(0, 3) // Limit contexts
                });
            }
        });

        // Sort by frequency and limit
        entries.sort((a, b) => b.frequency - a.frequency);
        return entries.slice(0, maxPhrases);
    }

    /**
     * Generate N-grams from tokens
     */
    private generateNGrams(tokens: string[], n: number): string[][] {
        const ngrams: string[][] = [];

        for (let i = 0; i <= tokens.length - n; i++) {
            ngrams.push(tokens.slice(i, i + n));
        }

        return ngrams;
    }

    /**
     * Get context around a phrase
     */
    private getContext(text: string, phrase: string, contextLength: number = 50): string | null {
        const index = text.toLowerCase().indexOf(phrase.toLowerCase());
        if (index === -1) return null;

        const start = Math.max(0, index - contextLength);
        const end = Math.min(text.length, index + phrase.length + contextLength);

        let context = text.substring(start, end);

        // Add ellipsis if truncated
        if (start > 0) context = '...' + context;
        if (end < text.length) context = context + '...';

        return context.trim();
    }

    /**
     * Categorize a term as technical or general
     */
    private categorizeTerm(term: string): string | undefined {
        const lowerTerm = term.toLowerCase();

        // Programming languages
        if (this.isLanguage(lowerTerm)) return 'language';

        // Frameworks
        if (this.isFramework(lowerTerm)) return 'framework';

        // Tools
        if (this.isTool(lowerTerm)) return 'tool';

        // Concepts
        if (this.isConcept(lowerTerm)) return 'concept';

        return undefined;
    }

    private isLanguage(term: string): boolean {
        const languages = [
            'javascript', 'typescript', 'python', 'java', 'rust', 'go',
            'c++', 'cpp', 'c#', 'csharp', 'ruby', 'php', 'swift', 'kotlin',
            'scala', 'haskell', 'elixir', 'clojure', 'dart', 'lua'
        ];
        return languages.includes(term);
    }

    private isFramework(term: string): boolean {
        const frameworks = [
            'react', 'vue', 'angular', 'svelte', 'next', 'nextjs', 'nuxt',
            'express', 'fastify', 'koa', 'django', 'flask', 'spring',
            'laravel', 'rails', 'gin', 'fiber', 'actix'
        ];
        return frameworks.includes(term);
    }

    private isTool(term: string): boolean {
        const tools = [
            'git', 'github', 'gitlab', 'docker', 'kubernetes', 'k8s',
            'npm', 'yarn', 'pnpm', 'webpack', 'vite', 'rollup', 'parcel',
            'jest', 'vitest', 'mocha', 'cypress', 'playwright',
            'eslint', 'prettier', 'typescript', 'babel'
        ];
        return tools.includes(term);
    }

    private isConcept(term: string): boolean {
        const concepts = [
            'api', 'rest', 'graphql', 'grpc', 'websocket',
            'database', 'sql', 'nosql', 'redis', 'mongodb', 'postgres',
            'http', 'https', 'json', 'xml', 'yaml',
            'authentication', 'authorization', 'jwt', 'oauth',
            'testing', 'deployment', 'ci', 'cd', 'devops'
        ];
        return concepts.includes(term);
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(partial: Partial<FrequencyAnalysisConfig>): FrequencyAnalysisConfig {
        return {
            minFrequency: partial.minFrequency ?? 2,
            maxWords: partial.maxWords ?? 100,
            ngramSize: partial.ngramSize ?? [2, 3],
            includeTechnicalTerms: partial.includeTechnicalTerms ?? true
        };
    }

    /**
     * Analyze single conversation
     */
    analyzeSingleConversation(conversation: Conversation): WordCloudData {
        return this.analyzeFrequencies([conversation]);
    }

    /**
     * Get word frequency distribution
     */
    getFrequencyDistribution(conversations: Conversation[]): Map<number, number> {
        const distribution = new Map<number, number>();
        const wordCloud = this.analyzeFrequencies(conversations);

        wordCloud.words.forEach(word => {
            const freq = Math.floor(word.value / 10) * 10; // Group by 10s
            distribution.set(freq, (distribution.get(freq) || 0) + 1);
        });

        return distribution;
    }
}
