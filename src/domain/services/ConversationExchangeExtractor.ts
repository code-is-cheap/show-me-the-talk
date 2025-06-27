/**
 * Conversation Exchange Extractor
 *
 * Domain service for extracting meaningful exchanges from conversations.
 * Moved from infrastructure layer to follow DDD principles.
 */

import { Conversation } from '../models/Conversation.js';
import { UserMessage, AssistantMessage, ToolInteraction } from '../models/Message.js';

export interface ConversationExchange {
    userMessage: UserMessage;
    assistantResponse: AssistantMessage;
    toolInteractions: ToolInteraction[];
    timestamp: Date;
    messageIndices: number[];
}

export interface ExchangeMetrics {
    totalExchanges: number;
    meaningfulExchanges: number;
    meaningfulPercentage: number;
    totalUserWords: number;
    totalAssistantWords: number;
    avgUserWordsPerExchange: number;
    avgAssistantWordsPerExchange: number;
    exchangesWithTools: number;
    toolUsagePercentage: number;
    avgResponseTimeMs: number;
}

export class ConversationExchangeExtractor {
    /**
     * Extract meaningful question-answer exchanges from a conversation
     */
    extractExchanges(conversation: Conversation): ConversationExchange[] {
        const exchanges: ConversationExchange[] = [];
        const messages = conversation.messages;
        
        for (let i = 0; i < messages.length - 1; i++) {
            const currentMessage = messages[i];
            const nextMessage = messages[i + 1];
            
            // Look for user-assistant pairs
            if (currentMessage.getType().toString() === 'user' && nextMessage.getType().toString() === 'assistant') {
                const userMessage = currentMessage as UserMessage;
                const assistantMessage = nextMessage as AssistantMessage;
                
                const exchange: ConversationExchange = {
                    userMessage,
                    assistantResponse: assistantMessage,
                    toolInteractions: [], // Will be populated from assistant message tools
                    timestamp: userMessage.timestamp,
                    messageIndices: [i, i + 1]
                };
                
                exchanges.push(exchange);
            }
        }
        
        return exchanges;
    }

    /**
     * Filter exchanges to only include meaningful conversations
     */
    filterMeaningfulExchanges(exchanges: ConversationExchange[]): ConversationExchange[] {
        return exchanges.filter(exchange => this.isExchangeMeaningful(exchange));
    }

    /**
     * Determine if an exchange represents meaningful conversation
     */
    private isExchangeMeaningful(exchange: ConversationExchange): boolean {
        const userContent = exchange.userMessage.getContent().trim();
        const assistantContent = exchange.assistantResponse.getContent().trim();
        
        // Filter out very short exchanges
        if (userContent.length < 10 || assistantContent.length < 20) {
            return false;
        }
        
        // Filter out purely confirmatory exchanges
        const confirmationPattern = /^(yes|no|ok|okay|thanks|thank you|sure|got it)\.?$/i;
        if (confirmationPattern.test(userContent) || confirmationPattern.test(assistantContent)) {
            return false;
        }
        
        // Include exchanges with tool usage
        if (exchange.toolInteractions.length > 0) {
            return true;
        }
        
        // Include exchanges with substantial content
        if (userContent.length > 50 && assistantContent.length > 100) {
            return true;
        }
        
        // Include exchanges with code content
        if (userContent.includes('```') || assistantContent.includes('```')) {
            return true;
        }
        
        return false;
    }

    /**
     * Group exchanges by conversation topic or theme
     */
    groupExchangesByTopic(exchanges: ConversationExchange[]): Map<string, ConversationExchange[]> {
        const topicGroups = new Map<string, ConversationExchange[]>();
        
        for (const exchange of exchanges) {
            const topic = this.inferTopic(exchange);
            
            if (!topicGroups.has(topic)) {
                topicGroups.set(topic, []);
            }
            
            topicGroups.get(topic)!.push(exchange);
        }
        
        return topicGroups;
    }

    /**
     * Calculate metrics for exchanges
     */
    calculateExchangeMetrics(exchanges: ConversationExchange[]): ExchangeMetrics {
        const meaningfulExchanges = this.filterMeaningfulExchanges(exchanges);
        
        const totalUserWords = exchanges.reduce((sum, ex) => 
            sum + this.countWords(ex.userMessage.getContent()), 0);
        
        const totalAssistantWords = exchanges.reduce((sum, ex) => 
            sum + this.countWords(ex.assistantResponse.getContent()), 0);
        
        const exchangesWithTools = exchanges.filter(ex => ex.toolInteractions.length > 0).length;
        
        const avgResponseTime = this.calculateAverageResponseTime(exchanges);
        
        return {
            totalExchanges: exchanges.length,
            meaningfulExchanges: meaningfulExchanges.length,
            meaningfulPercentage: exchanges.length > 0 ? 
                (meaningfulExchanges.length / exchanges.length) * 100 : 0,
            totalUserWords,
            totalAssistantWords,
            avgUserWordsPerExchange: exchanges.length > 0 ? 
                totalUserWords / exchanges.length : 0,
            avgAssistantWordsPerExchange: exchanges.length > 0 ? 
                totalAssistantWords / exchanges.length : 0,
            exchangesWithTools,
            toolUsagePercentage: exchanges.length > 0 ? 
                (exchangesWithTools / exchanges.length) * 100 : 0,
            avgResponseTimeMs: avgResponseTime
        };
    }

    private createEmptyAssistantMessage(): AssistantMessage {
        // This is a placeholder implementation
        // In practice, this should use the proper AssistantMessage constructor
        const emptyMessage = new (AssistantMessage as any)(
            'empty',
            new Date(),
            null,
            '',
            [],
            '',
            { inputTokens: 0, outputTokens: 0 }
        );
        return emptyMessage;
    }

    private inferTopic(exchange: ConversationExchange): string {
        const userContent = exchange.userMessage.getContent().toLowerCase();
        const assistantContent = exchange.assistantResponse.getContent().toLowerCase();
        const allContent = userContent + ' ' + assistantContent;
        
        // Programming language detection
        const languages = ['javascript', 'typescript', 'python', 'java', 'react', 'vue', 'angular'];
        for (const lang of languages) {
            if (allContent.includes(lang)) {
                return `Programming: ${lang}`;
            }
        }
        
        // Task type detection
        if (allContent.includes('debug') || allContent.includes('error') || allContent.includes('fix')) {
            return 'Debugging';
        }
        
        if (allContent.includes('implement') || allContent.includes('create') || allContent.includes('build')) {
            return 'Implementation';
        }
        
        if (allContent.includes('explain') || allContent.includes('understand') || allContent.includes('learn')) {
            return 'Learning';
        }
        
        if (allContent.includes('review') || allContent.includes('feedback') || allContent.includes('improve')) {
            return 'Code Review';
        }
        
        // Tool usage detection
        if (exchange.toolInteractions.length > 0) {
            const primaryTool = exchange.toolInteractions[0].getType();
            return `Tool Usage: ${primaryTool}`;
        }
        
        return 'General Discussion';
    }

    private countWords(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    private calculateAverageResponseTime(exchanges: ConversationExchange[]): number {
        if (exchanges.length < 2) return 0;
        
        const responseTimes: number[] = [];
        
        for (let i = 0; i < exchanges.length - 1; i++) {
            const currentExchange = exchanges[i];
            const nextExchange = exchanges[i + 1];
            
            const responseTime = nextExchange.timestamp.getTime() - currentExchange.timestamp.getTime();
            if (responseTime > 0 && responseTime < 24 * 60 * 60 * 1000) { // Less than 24 hours
                responseTimes.push(responseTime);
            }
        }
        
        if (responseTimes.length === 0) return 0;
        
        return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }
}