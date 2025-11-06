/**
 * Word frequency entry with metadata
 */
export interface WordEntry {
    readonly text: string;
    readonly value: number;      // Frequency count
    readonly weight: number;      // TF-IDF weight
    readonly category?: string;   // Technical category (e.g., "language", "framework")
}

/**
 * N-gram phrase entry
 */
export interface PhraseEntry {
    readonly text: string;
    readonly frequency: number;
    readonly contexts: string[];  // Example contexts where phrase appears
}

/**
 * Semantic concept extracted from conversations
 */
export interface ConceptEntry {
    readonly concept: string;
    readonly relatedTerms: string[];
    readonly occurrences: number;
    readonly conversationIds: string[];
}

/**
 * Word cloud analysis modes
 */
export enum WordCloudMode {
    WORD = 'word',           // Single word frequency
    PHRASE = 'phrase',       // N-gram phrases
    CONCEPT = 'concept',     // Semantic concepts
}

/**
 * Complete word cloud data containing multiple analysis modes
 */
export class WordCloudData {
    constructor(
        public readonly words: WordEntry[],
        public readonly phrases: PhraseEntry[],
        public readonly concepts: ConceptEntry[],
        public readonly mode: WordCloudMode = WordCloudMode.WORD,
        public readonly totalTokens: number = 0,
        public readonly uniqueTokens: number = 0,
        public readonly generatedAt: Date = new Date()
    ) {}

    /**
     * Get top N entries for current mode
     */
    getTopEntries(limit: number): WordEntry[] | PhraseEntry[] | ConceptEntry[] {
        switch (this.mode) {
            case WordCloudMode.WORD:
                return this.words.slice(0, limit);
            case WordCloudMode.PHRASE:
                return this.phrases.slice(0, limit);
            case WordCloudMode.CONCEPT:
                return this.concepts.slice(0, limit);
        }
    }

    /**
     * Get entries filtered by category (for word mode)
     */
    getWordsByCategory(category: string): WordEntry[] {
        return this.words.filter(w => w.category === category);
    }

    /**
     * Calculate vocabulary richness (unique/total ratio)
     */
    getVocabularyRichness(): number {
        if (this.totalTokens === 0) return 0;
        return this.uniqueTokens / this.totalTokens;
    }

    /**
     * Export to format suitable for d3-cloud
     */
    toD3CloudFormat(mode: WordCloudMode = this.mode): Array<{ text: string; size: number }> {
        switch (mode) {
            case WordCloudMode.WORD:
                return this.words.map(w => ({ text: w.text, size: w.weight * 100 }));
            case WordCloudMode.PHRASE:
                return this.phrases.map(p => ({ text: p.text, size: p.frequency * 50 }));
            case WordCloudMode.CONCEPT:
                return this.concepts.map(c => ({ text: c.concept, size: c.occurrences * 30 }));
        }
    }
}
