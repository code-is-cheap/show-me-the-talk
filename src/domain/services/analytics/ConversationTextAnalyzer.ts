import { Conversation } from '../../models/Conversation.js';
import { Message } from '../../models/Message.js';
import { removeStopwords, eng, zho } from 'stopword';

/**
 * Extracted text with metadata
 */
export interface ExtractedText {
    readonly content: string;
    readonly source: 'user' | 'assistant' | 'mixed';
    readonly conversationId: string;
    readonly timestamp: Date;
}

/**
 * Tokenized text with context
 */
export interface TokenizedText {
    readonly tokens: string[];
    readonly originalText: string;
    readonly language: 'en' | 'zh' | 'mixed';
    readonly conversationId: string;
}

/**
 * Text analysis result
 */
export interface TextAnalysisResult {
    readonly allText: string;
    readonly tokens: string[];
    readonly filteredTokens: string[];
    readonly wordCount: number;
    readonly uniqueWords: number;
    readonly language: 'en' | 'zh' | 'mixed';
}

/**
 * Service for extracting and analyzing text from conversations
 */
export class ConversationTextAnalyzer {
    private readonly minWordLength: number;
    private readonly maxWordLength: number;

    constructor(
        minWordLength: number = 2,
        maxWordLength: number = 50
    ) {
        this.minWordLength = minWordLength;
        this.maxWordLength = maxWordLength;
    }

    /**
     * Extract all text content from a conversation
     */
    extractText(conversation: Conversation): ExtractedText[] {
        const extracted: ExtractedText[] = [];

        for (const message of conversation.getMessages()) {
            const content = this.getMessageContent(message);
            if (!content || content.trim().length === 0) continue;

            extracted.push({
                content,
                source: this.getMessageSource(message),
                conversationId: conversation.sessionId,
                timestamp: message.timestamp
            });
        }

        return extracted;
    }

    /**
     * Extract text from multiple conversations
     */
    extractFromConversations(conversations: Conversation[]): ExtractedText[] {
        return conversations.flatMap(c => this.extractText(c));
    }

    /**
     * Analyze text content from conversations
     */
    analyzeConversations(conversations: Conversation[]): TextAnalysisResult {
        const allTexts = this.extractFromConversations(conversations);
        const combinedText = allTexts.map(t => t.content).join(' ');

        return this.analyzeText(combinedText);
    }

    /**
     * Analyze single text string
     */
    analyzeText(text: string): TextAnalysisResult {
        // Detect language
        const language = this.detectLanguage(text);

        // Tokenize
        const tokens = this.tokenize(text);

        // Filter stop words and apply length constraints
        const filteredTokens = this.filterTokens(tokens, language);

        // Calculate statistics
        const uniqueWords = new Set(filteredTokens).size;

        return {
            allText: text,
            tokens,
            filteredTokens,
            wordCount: tokens.length,
            uniqueWords,
            language
        };
    }

    /**
     * Tokenize text into words
     */
    tokenize(text: string): string[] {
        // Normalize text
        const normalized = this.normalizeText(text);

        // Split on whitespace and punctuation, but preserve technical terms
        const tokens = normalized
            .split(/[\s,;:!?()[\]{}'"<>\/\\]+/)
            .filter(token => token.length > 0);

        return tokens;
    }

    /**
     * Filter tokens by removing stop words and applying length constraints
     */
    filterTokens(tokens: string[], language: 'en' | 'zh' | 'mixed'): string[] {
        // Apply stop words removal
        let filtered = this.removeStopWords(tokens, language);

        // Apply length constraints
        filtered = filtered.filter(
            token => token.length >= this.minWordLength && token.length <= this.maxWordLength
        );

        // Remove tokens that are only numbers
        filtered = filtered.filter(token => !/^\d+$/.test(token));

        // Remove tokens that are only special characters
        filtered = filtered.filter(token => /[a-zA-Z\u4e00-\u9fa5]/.test(token));

        return filtered;
    }

    /**
     * Remove stop words from tokens
     */
    removeStopWords(tokens: string[], language: 'en' | 'zh' | 'mixed'): string[] {
        const lowerTokens = tokens.map(t => t.toLowerCase());

        switch (language) {
            case 'en':
                return removeStopwords(lowerTokens, eng);
            case 'zh':
                return removeStopwords(lowerTokens, zho);
            case 'mixed':
                // Remove both English and Chinese stop words
                const afterEng = removeStopwords(lowerTokens, eng);
                return removeStopwords(afterEng, zho);
        }
    }

    /**
     * Detect primary language in text
     */
    detectLanguage(text: string): 'en' | 'zh' | 'mixed' {
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
        const totalChars = chineseChars + englishChars;

        if (totalChars === 0) return 'en';

        const chineseRatio = chineseChars / totalChars;

        if (chineseRatio > 0.7) return 'zh';
        if (chineseRatio < 0.3) return 'en';
        return 'mixed';
    }

    /**
     * Normalize text for analysis
     */
    private normalizeText(text: string): string {
        return text
            // Remove URLs
            .replace(/https?:\/\/[^\s]+/g, '')
            // Remove email addresses
            .replace(/[\w.-]+@[\w.-]+\.\w+/g, '')
            // Remove markdown code blocks
            .replace(/```[\s\S]*?```/g, '')
            // Remove inline code
            .replace(/`[^`]+`/g, '')
            // Remove special markdown formatting
            .replace(/[*_~`]/g, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Get content from message
     */
    private getMessageContent(message: Message): string {
        if (message.getContent) {
            return message.getContent();
        }
        return (message as any).content || '';
    }

    /**
     * Get message source (user or assistant)
     */
    private getMessageSource(message: Message): 'user' | 'assistant' | 'mixed' {
        if (message.getType) {
            const type = message.getType();
            return type.toLowerCase() as 'user' | 'assistant';
        }
        const role = (message as any).role;
        return role === 'user' ? 'user' : 'assistant';
    }

    /**
     * Extract technical terms from text
     */
    extractTechnicalTerms(text: string): string[] {
        const technicalPatterns = [
            // Programming languages
            /\b(javascript|typescript|python|java|rust|go|c\+\+|c#|ruby|php|swift|kotlin)\b/gi,
            // Frameworks
            /\b(react|vue|angular|next\.js|express|django|flask|spring|laravel)\b/gi,
            // Tools
            /\b(git|docker|kubernetes|npm|yarn|webpack|vite|jest|vitest)\b/gi,
            // Concepts
            /\b(api|rest|graphql|sql|nosql|http|https|json|xml|yaml)\b/gi,
        ];

        const terms = new Set<string>();

        technicalPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => terms.add(match.toLowerCase()));
            }
        });

        return Array.from(terms);
    }

    /**
     * Group text by time period
     */
    groupByTimePeriod(
        texts: ExtractedText[],
        periodType: 'day' | 'week' | 'month'
    ): Map<string, ExtractedText[]> {
        const groups = new Map<string, ExtractedText[]>();

        texts.forEach(text => {
            const key = this.getTimePeriodKey(text.timestamp, periodType);
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(text);
        });

        return groups;
    }

    /**
     * Get time period key for grouping
     */
    private getTimePeriodKey(date: Date, periodType: 'day' | 'week' | 'month'): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        switch (periodType) {
            case 'day':
                return `${year}-${month}-${day}`;
            case 'week':
                const weekNum = this.getWeekNumber(date);
                return `${year}-W${String(weekNum).padStart(2, '0')}`;
            case 'month':
                return `${year}-${month}`;
        }
    }

    /**
     * Get ISO week number
     */
    private getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
}
