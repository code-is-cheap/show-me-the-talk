import { Conversation } from '../models/Conversation.js';

export interface FilterCriteria {
    projectPath?: string;
    category?: ConversationCategory;
    searchQuery?: string;
    dateRange?: {
        startDate: Date;
        endDate: Date;
    };
    minComplexity?: number;
    maxComplexity?: number;
    hasCodeBlocks?: boolean;
    hasToolInteractions?: boolean;
    messageCountRange?: {
        min: number;
        max: number;
    };
}

export type ConversationCategory = 'learning' | 'implementation' | 'debugging' | 'review' | 'general' | 'complex';

export interface ConversationScore {
    conversation: Conversation;
    relevanceScore: number;
    complexity: number;
    category: ConversationCategory;
    matchedTerms: string[];
}

/**
 * Domain service for filtering and categorizing conversations
 */
export class ConversationFilter {
    /**
     * Filter conversations based on criteria
     */
    filterConversations(conversations: Conversation[], criteria: FilterCriteria): Conversation[] {
        return conversations.filter(conversation => {
            // Project path filter
            if (criteria.projectPath && conversation.getProjectContext().path !== criteria.projectPath) {
                return false;
            }

            // Category filter
            if (criteria.category && this.categorizeConversation(conversation) !== criteria.category) {
                return false;
            }

            // Search query filter
            if (criteria.searchQuery && !this.matchesSearchQuery(conversation, criteria.searchQuery)) {
                return false;
            }

            // Date range filter
            if (criteria.dateRange) {
                const startTime = conversation.getStartTime();
                if (startTime < criteria.dateRange.startDate || startTime > criteria.dateRange.endDate) {
                    return false;
                }
            }

            // Complexity filter
            const complexity = this.calculateComplexity(conversation);
            if (criteria.minComplexity !== undefined && complexity < criteria.minComplexity) {
                return false;
            }
            if (criteria.maxComplexity !== undefined && complexity > criteria.maxComplexity) {
                return false;
            }

            // Code blocks filter
            if (criteria.hasCodeBlocks !== undefined && this.hasCodeBlocks(conversation) !== criteria.hasCodeBlocks) {
                return false;
            }

            // Tool interactions filter
            if (criteria.hasToolInteractions !== undefined && this.hasToolInteractions(conversation) !== criteria.hasToolInteractions) {
                return false;
            }

            // Message count filter
            if (criteria.messageCountRange) {
                const messageCount = conversation.getMessageCount();
                if (messageCount < criteria.messageCountRange.min || messageCount > criteria.messageCountRange.max) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Search and rank conversations by relevance
     */
    searchConversations(conversations: Conversation[], query: string, limit: number = 10): ConversationScore[] {
        const scores: ConversationScore[] = conversations
            .map(conversation => ({
                conversation,
                relevanceScore: this.calculateRelevanceScore(conversation, query),
                complexity: this.calculateComplexity(conversation),
                category: this.categorizeConversation(conversation),
                matchedTerms: [] // Could be enhanced to return actual matched terms
            }))
            .filter(score => score.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore);

        return scores.slice(0, limit);
    }

    /**
     * Categorize a conversation based on its content
     */
    categorizeConversation(conversation: Conversation): ConversationCategory {
        if (this.isLearningConversation(conversation)) {
            return 'learning';
        }
        if (this.isDebuggingConversation(conversation)) {
            return 'debugging';
        }
        if (this.isReviewConversation(conversation)) {
            return 'review';
        }
        if (this.isImplementationConversation(conversation)) {
            return 'implementation';
        }
        if (this.calculateComplexity(conversation) > 8) {
            return 'complex';
        }
        return 'general';
    }

    /**
     * Group conversations by project
     */
    groupByProject(conversations: Conversation[]): Map<string, Conversation[]> {
        const groups = new Map<string, Conversation[]>();

        for (const conversation of conversations) {
            const projectPath = conversation.getProjectContext().path;
            if (!groups.has(projectPath)) {
                groups.set(projectPath, []);
            }
            groups.get(projectPath)!.push(conversation);
        }

        return groups;
    }

    /**
     * Get conversation statistics for a project
     */
    getProjectStats(conversations: Conversation[]): {
        total: number;
        byCategory: Record<ConversationCategory, number>;
        dateRange: { earliest: Date; latest: Date } | null;
        avgComplexity: number;
    } {
        const stats = {
            total: conversations.length,
            byCategory: {
                'learning': 0,
                'implementation': 0,
                'debugging': 0,
                'review': 0,
                'general': 0,
                'complex': 0
            } as Record<ConversationCategory, number>,
            dateRange: null as { earliest: Date; latest: Date } | null,
            avgComplexity: 0
        };

        if (conversations.length === 0) {
            return stats;
        }

        let totalComplexity = 0;
        let earliestDate: Date | null = null;
        let latestDate: Date | null = null;

        for (const conversation of conversations) {
            // Category count
            const category = this.categorizeConversation(conversation);
            stats.byCategory[category]++;

            // Complexity
            totalComplexity += this.calculateComplexity(conversation);

            // Date range
            const startTime = conversation.getStartTime();
            if (!earliestDate || startTime < earliestDate) {
                earliestDate = startTime;
            }
            if (!latestDate || startTime > latestDate) {
                latestDate = startTime;
            }
        }

        stats.avgComplexity = totalComplexity / conversations.length;
        if (earliestDate && latestDate) {
            stats.dateRange = { earliest: earliestDate, latest: latestDate };
        }

        return stats;
    }

    calculateComplexity(conversation: Conversation): number {
        let complexity = 0;

        // Base complexity from message count
        complexity += Math.min(conversation.getMessageCount() * 0.5, 5);

        // Code complexity
        if (this.hasCodeBlocks(conversation)) {
            complexity += 3;
        }

        // Tool usage complexity
        if (this.hasToolInteractions(conversation)) {
            complexity += 2;
        }

        // Duration complexity
        const duration = conversation.getDuration();
        if (duration > 3600000) { // More than 1 hour
            complexity += 2;
        }

        // Word count complexity
        const wordCount = conversation.getWordCount();
        if (wordCount > 1000) {
            complexity += Math.min(wordCount / 500, 3);
        }

        return Math.min(complexity, 10); // Cap at 10
    }

    private matchesSearchQuery(conversation: Conversation, query: string): boolean {
        const searchableContent = conversation.getSearchableContent();
        const queryTerms = query.toLowerCase().split(/\s+/);
        
        return queryTerms.every(term => searchableContent.includes(term));
    }

    private calculateRelevanceScore(conversation: Conversation, query: string): number {
        const content = conversation.getSearchableContent();
        const queryTerms = query.toLowerCase().split(/\s+/);
        let score = 0;

        for (const term of queryTerms) {
            const matches = (content.match(new RegExp(term, 'gi')) || []).length;
            score += matches;
        }

        // Boost score for title matches
        const title = conversation.title.toLowerCase();
        for (const term of queryTerms) {
            if (title.includes(term)) {
                score += 5;
            }
        }

        return score;
    }

    private hasCodeBlocks(conversation: Conversation): boolean {
        return conversation.hasCodeBlocks();
    }

    private hasToolInteractions(conversation: Conversation): boolean {
        return conversation.hasToolInteractions();
    }

    private isDebuggingConversation(conversation: Conversation): boolean {
        const content = conversation.getSearchableContent();
        const debugKeywords = ['error', 'bug', 'fix', 'debug', 'issue', 'problem', 'broken', 'crash'];
        return debugKeywords.some(keyword => content.includes(keyword));
    }

    private isReviewConversation(conversation: Conversation): boolean {
        const content = conversation.getSearchableContent();
        const reviewKeywords = ['review', 'feedback', 'improve', 'optimize', 'refactor', 'suggest'];
        return reviewKeywords.some(keyword => content.includes(keyword));
    }

    private isLearningConversation(conversation: Conversation): boolean {
        const content = conversation.getSearchableContent();
        const learningKeywords = ['how', 'what', 'why', 'explain', 'learn', 'understand', 'tutorial', 'example'];
        return learningKeywords.some(keyword => content.includes(keyword));
    }

    private isImplementationConversation(conversation: Conversation): boolean {
        const content = conversation.getSearchableContent();
        const implKeywords = ['implement', 'create', 'build', 'develop', 'add', 'feature', 'function'];
        return implKeywords.some(keyword => content.includes(keyword)) && this.hasCodeBlocks(conversation);
    }
}