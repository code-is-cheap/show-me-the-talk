import { MessageData } from './MessageData.js';
import { ConversationElement } from './ConversationElement.js';
import { UserQuestion } from './UserQuestion.js';
import { AssistantResponse } from './AssistantResponse.js';
import { CodeBlock } from './CodeBlock.js';
import { ToolInteractionGroup, ToolInteractionPurpose } from './ToolInteractionGroup.js';
import { ContentImportance } from './ConversationElementType.js';
import { QuestionComplexity, QuestionIntent } from './QuestionTypes.js';
import { TokenUsage, ToolUse } from './ResponseTypes.js';

/**
 * Factory for creating enhanced domain model elements from DTOs
 */
export class ConversationElementFactory {
    /**
     * Create conversation elements from message DTOs
     */
    static createElementsFromMessages(messages: MessageData[]): ConversationElement[] {
        const elements: ConversationElement[] = [];
        
        messages.forEach((message, index) => {
            const turnNumber = Math.floor(index / 2) + 1;
            
            if (message.type === 'user') {
                const userQuestion = this.createUserQuestion(message, turnNumber, messages, index);
                elements.push(userQuestion);
            } else if (message.type === 'assistant') {
                const assistantResponse = this.createAssistantResponse(message, turnNumber);
                elements.push(assistantResponse);
                
                // Extract code blocks
                const codeBlocks = this.extractCodeBlocks(message, turnNumber);
                elements.push(...codeBlocks);
                
                // Create tool interaction group if tools were used
                if (message.metadata?.toolUses && message.metadata.toolUses.length > 0) {
                    const toolGroup = this.createToolInteractionGroup(message, turnNumber);
                    if (toolGroup) {
                        elements.push(toolGroup);
                    }
                }
            }
        });
        
        return elements;
    }

    /**
     * Create UserQuestion from message DTO
     */
    private static createUserQuestion(
        message: MessageData, 
        turnNumber: number, 
        allMessages: MessageData[], 
        currentIndex: number
    ): UserQuestion {
        // Determine if this is a follow-up question
        const isFollowUp = currentIndex > 0 && allMessages[currentIndex - 1]?.type === 'assistant';
        
        // Find previous question if this is a follow-up
        let previousQuestionId: string | undefined;
        if (isFollowUp) {
            for (let i = currentIndex - 1; i >= 0; i--) {
                if (allMessages[i].type === 'user') {
                    previousQuestionId = allMessages[i].id;
                    break;
                }
            }
        }
        
        // Determine complexity based on content
        const complexity = this.determineQuestionComplexity(message.content);
        
        // Determine intent based on content
        const intent = this.determineQuestionIntent(message.content);
        
        return new UserQuestion(
            message.id,
            new Date(message.timestamp),
            message.content,
            isFollowUp,
            previousQuestionId,
            complexity,
            intent,
            turnNumber
        );
    }

    /**
     * Create AssistantResponse from message DTO
     */
    private static createAssistantResponse(message: MessageData, turnNumber: number): AssistantResponse {
        const usage = new TokenUsage(
            message.metadata?.usage?.inputTokens || 0,
            message.metadata?.usage?.outputTokens || 0
        );
        
        // Extract tool uses
        const toolUses = (message.metadata?.toolUses || []).map(tool => 
            new ToolUse(tool.id, tool.name, tool.input)
        );
        
        // Extract code blocks for this response
        const codeBlocks = this.extractCodeBlocks(message, turnNumber);
        
        return new AssistantResponse(
            message.id,
            new Date(message.timestamp),
            message.content,
            codeBlocks,
            toolUses,
            message.metadata?.model || 'unknown',
            usage,
            undefined, // reasoning
            undefined, // confidence
            turnNumber
        );
    }

    /**
     * Extract code blocks from message content
     */
    private static extractCodeBlocks(message: MessageData, turnNumber: number): CodeBlock[] {
        const codeBlocks: CodeBlock[] = [];
        const content = message.content;
        
        // Regex to match code blocks
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        let blockIndex = 0;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
            const language = match[1] || 'text';
            const codeContent = match[2];
            
            const codeBlock = new CodeBlock(
                `${message.id}-code-${blockIndex}`,
                new Date(message.timestamp),
                language,
                codeContent,
                undefined, // filename
                undefined, // lineNumbers
                false, // isPartial
                undefined, // context
                turnNumber
            );
            
            codeBlocks.push(codeBlock);
            blockIndex++;
        }
        
        return codeBlocks;
    }

    /**
     * Create tool interaction group from message metadata
     */
    private static createToolInteractionGroup(message: MessageData, turnNumber: number): ToolInteractionGroup | null {
        const toolData = message.metadata?.toolUses;
        if (!toolData || toolData.length === 0) return null;
        
        const toolUses = toolData.map(tool => 
            new ToolUse(tool.id, tool.name, tool.input)
        );
        
        const purpose = this.determinePurpose(toolUses);
        
        return new ToolInteractionGroup(
            `${message.id}-tools`,
            new Date(message.timestamp),
            toolUses,
            purpose,
            undefined, // context
            true, // assume successful if no error info
            undefined, // totalDuration
            turnNumber
        );
    }

    private static determinePurpose(toolUses: ToolUse[]): ToolInteractionPurpose {
        const toolNames = toolUses.map(t => t.toolName.toLowerCase());
        
        if (toolNames.some(name => ['read', 'write', 'edit', 'ls'].some(op => name.includes(op)))) {
            return 'file-management';
        }
        
        if (toolNames.some(name => ['grep', 'glob', 'search'].some(op => name.includes(op)))) {
            return 'information-gathering';
        }
        
        if (toolNames.some(name => ['bash', 'command'].some(op => name.includes(op)))) {
            return 'system-operation';
        }
        
        return 'code-analysis';
    }

    /**
     * Determine content importance based on content analysis
     */
    private static determineContentImportance(content: string, type: 'user' | 'assistant'): ContentImportance {
        if (type === 'user') {
            return ContentImportance.PRIMARY;
        }
        
        // For assistant responses, check length and complexity
        if (content.length > 1000 || content.includes('```')) {
            return ContentImportance.PRIMARY;
        }
        
        return ContentImportance.SECONDARY;
    }

    /**
     * Determine code block importance
     */
    private static determineCodeImportance(language: string, content: string): ContentImportance {
        // Configuration files are usually less important
        if (['json', 'yaml', 'yml', 'toml'].includes(language.toLowerCase())) {
            return ContentImportance.TERTIARY;
        }
        
        // Large code blocks are important
        if (content.split('\n').length > 20) {
            return ContentImportance.PRIMARY;
        }
        
        return ContentImportance.SECONDARY;
    }

    /**
     * Determine tool interaction importance
     */
    private static determineToolImportance(toolUses: ToolUse[]): ContentImportance {
        // Critical operations are important
        if (toolUses.some(tool => tool.isCriticalOperation())) {
            return ContentImportance.PRIMARY;
        }
        
        // Large number of tools indicates complex operation
        if (toolUses.length > 5) {
            return ContentImportance.PRIMARY;
        }
        
        return ContentImportance.SECONDARY;
    }

    private static determineQuestionComplexity(content: string): QuestionComplexity {
        if (content.length > 500 || content.includes('```')) {
            return QuestionComplexity.COMPLEX;
        }
        
        if (content.length > 200) {
            return QuestionComplexity.MODERATE;
        }
        
        return QuestionComplexity.SIMPLE;
    }

    private static determineQuestionIntent(content: string): QuestionIntent {
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.includes('implement') || lowerContent.includes('create') || lowerContent.includes('build')) {
            return QuestionIntent.IMPLEMENTATION;
        }
        
        if (lowerContent.includes('error') || lowerContent.includes('bug') || lowerContent.includes('fix')) {
            return QuestionIntent.DEBUGGING;
        }
        
        if (lowerContent.includes('optimize') || lowerContent.includes('improve') || lowerContent.includes('performance')) {
            return QuestionIntent.OPTIMIZATION;
        }
        
        if (lowerContent.includes('learn') || lowerContent.includes('understand') || lowerContent.includes('explain')) {
            return QuestionIntent.LEARNING;
        }
        
        return QuestionIntent.GENERAL;
    }
}