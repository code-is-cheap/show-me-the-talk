import { Conversation } from '../models/Conversation.js';

export class ConversationService {
    static filterMeaningfulConversations(conversations: Conversation[]): Conversation[] {
        return conversations.filter(conversation => 
            conversation.hasMessages() && 
            conversation.getMeaningfulExchanges().length > 0
        );
    }

    static extractQuestionAnswerPairs(conversation: Conversation): QuestionAnswerPair[] {
        const exchanges = conversation.getMeaningfulExchanges();
        
        return exchanges
            .filter(exchange => exchange.hasTextualContent())
            .map(exchange => {
                const summary = exchange.getSummary();
                return {
                    question: summary.question,
                    answer: summary.answer,
                    timestamp: summary.timestamp,
                    projectContext: conversation.getProjectContext().path,
                    sessionId: conversation.sessionId
                };
            });
    }

    static categorizeConversations(conversations: Conversation[]): ConversationCategories {
        const categories: ConversationCategories = {
            debugging: [],
            architecture: [],
            implementation: [],
            refactoring: [],
            learning: [],
            other: []
        };

        for (const conversation of conversations) {
            const category = this.categorizeConversation(conversation);
            categories[category].push(conversation);
        }

        return categories;
    }

    private static categorizeConversation(conversation: Conversation): ConversationCategory {
        const searchableContent = conversation.getSearchableContent();

        // Learning patterns - prioritize these as they're often the most valuable
        if (this.containsKeywords(searchableContent, [
            'how to', 'what is', 'can you explain', 'help me understand',
            'how do i', 'what does', 'why does', 'difference between',
            'best practice', 'recommend', 'should i', 'tutorial',
            'example', 'learn', 'new to'
        ])) {
            return 'learning';
        }

        // Debugging patterns
        if (this.containsKeywords(searchableContent, [
            'error', 'bug', 'issue', 'problem', 'fix', 'broken',
            'not working', 'fails', 'crash', 'exception',
            'debug', 'troubleshoot', 'wrong'
        ])) {
            return 'debugging';
        }

        // Architecture patterns
        if (this.containsKeywords(searchableContent, [
            'architecture', 'design pattern', 'structure', 'organize',
            'module', 'component', 'system design', 'scalable',
            'maintainable', 'separation of concerns', 'dependency injection'
        ])) {
            return 'architecture';
        }

        // Refactoring patterns
        if (this.containsKeywords(searchableContent, [
            'refactor', 'improve', 'optimize', 'clean up',
            'better way', 'rewrite', 'restructure', 'simplify',
            'performance', 'efficient'
        ])) {
            return 'refactoring';
        }

        // Implementation patterns
        if (this.containsKeywords(searchableContent, [
            'implement', 'create', 'build', 'add feature',
            'develop', 'code', 'function', 'class',
            'method', 'algorithm'
        ]) && conversation.hasCodeBlocks()) {
            return 'implementation';
        }

        return 'other';
    }

    private static containsKeywords(content: string, keywords: string[]): boolean {
        const lowerContent = content.toLowerCase();
        return keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));
    }

    static calculateConversationMetrics(conversations: Conversation[]): ConversationMetrics {
        const metrics: ConversationMetrics = {
            totalConversations: conversations.length,
            totalMessages: 0,
            averageMessagesPerConversation: 0,
            averageDurationMs: 0,
            projectCounts: {},
            dateRange: {
                earliest: null,
                latest: null
            }
        };

        if (conversations.length === 0) {
            return metrics;
        }

        let totalDuration = 0;

        for (const conversation of conversations) {
            metrics.totalMessages += conversation.getMessageCount();
            totalDuration += conversation.getDuration();

            // Project counts
            const projectPath = conversation.getProjectContext().path;
            metrics.projectCounts[projectPath] = (metrics.projectCounts[projectPath] || 0) + 1;

            // Date range
            const startTime = conversation.getStartTime();
            if (!metrics.dateRange.earliest || startTime < metrics.dateRange.earliest) {
                metrics.dateRange.earliest = startTime;
            }
            if (!metrics.dateRange.latest || startTime > metrics.dateRange.latest) {
                metrics.dateRange.latest = startTime;
            }
        }

        metrics.averageMessagesPerConversation = metrics.totalMessages / conversations.length;
        metrics.averageDurationMs = totalDuration / conversations.length;

        return metrics;
    }
}

export interface QuestionAnswerPair {
    question: string;
    answer: string;
    timestamp: Date;
    projectContext: string;
    sessionId: string;
}

export type ConversationCategory = 'debugging' | 'architecture' | 'implementation' | 'refactoring' | 'learning' | 'other';

export interface ConversationCategories {
    debugging: Conversation[];
    architecture: Conversation[];
    implementation: Conversation[];
    refactoring: Conversation[];
    learning: Conversation[];
    other: Conversation[];
}

export interface ConversationMetrics {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    averageDurationMs: number;
    projectCounts: Record<string, number>;
    dateRange: {
        earliest: Date | null;
        latest: Date | null;
    };
}