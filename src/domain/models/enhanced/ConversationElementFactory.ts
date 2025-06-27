import { UserQuestion } from './UserQuestion.js';
import { AssistantResponse } from './AssistantResponse.js';
import { CodeBlock } from './CodeBlock.js';
import { ToolInteractionGroup } from './ToolInteractionGroup.js';
import { ContentImportance } from './ConversationElementType.js';
import { TokenUsage, ToolUse } from './ResponseTypes.js';

interface MessageDto {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: {
        toolUses?: Array<{
            id: string;
            name: string;
            input: any;
        }>;
        usage?: {
            inputTokens: number;
            outputTokens: number;
        };
        model?: string;
    };
}

/**
 * Factory for creating enhanced domain model elements from DTOs
 */
export class ConversationElementFactory {
    /**
     * Create conversation elements from message DTOs
     */
    static createElementsFromMessages(messages: MessageDto[]): Array<UserQuestion | AssistantResponse | CodeBlock | ToolInteractionGroup> {
        const elements: Array<UserQuestion | AssistantResponse | CodeBlock | ToolInteractionGroup> = [];
        let turnNumber = 0;

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            if (message.type === 'user') {
                // Create UserQuestion
                const question = this.createUserQuestion(message, turnNumber);
                elements.push(question);
                turnNumber++;
            } else if (message.type === 'assistant') {
                // Create AssistantResponse with potential code blocks and tools
                const response = this.createAssistantResponse(message, messages, i, turnNumber);
                elements.push(response);

                // Extract code blocks if present
                const codeBlocks = this.extractCodeBlocks(message, turnNumber);
                elements.push(...codeBlocks);

                // Create tool interaction group if present
                const toolGroup = this.createToolInteractionGroup(message, turnNumber);
                if (toolGroup) {
                    elements.push(toolGroup);
                }
            }
        }

        return elements;
    }

    /**
     * Create UserQuestion from message DTO
     */
    static createUserQuestion(message: MessageDto, turnNumber: number): UserQuestion {
        const timestamp = new Date(message.timestamp);

        return new UserQuestion(
            message.id,
            timestamp,
            message.content,
            false, // isFollowUp
            undefined, // previousQuestionId
            undefined, // complexity - will be auto-determined
            undefined, // intent - will be auto-determined
            turnNumber
        );
    }

    /**
     * Create AssistantResponse from message DTO
     */
    static createAssistantResponse(message: MessageDto, allMessages: MessageDto[], currentIndex: number, turnNumber: number): AssistantResponse {
        const timestamp = new Date(message.timestamp);

        // Extract code blocks
        const codeBlocks = this.extractCodeBlocks(message, turnNumber);

        // Create tool interactions array - convert to proper ToolUse format
        const toolInteractions = message.metadata?.toolUses?.map(tool => {
            // Create a ToolUse instance
            return new ToolUse(
                tool.id,
                tool.name,
                tool.input,
                'Tool executed successfully',
                true,
                0,
                undefined
            );
        }) || [];

        // Create token usage
        const tokenUsage = message.metadata?.usage ?
            new TokenUsage(message.metadata.usage.inputTokens, message.metadata.usage.outputTokens) :
            new TokenUsage(0, 0);

        return new AssistantResponse(
            message.id,
            timestamp,
            message.content,
            codeBlocks,
            toolInteractions,
            message.metadata?.model || 'unknown',
            tokenUsage,
            undefined, // reasoning
            undefined, // confidence
            turnNumber
        );
    }

    /**
     * Extract code blocks from message content
     */
    static extractCodeBlocks(message: MessageDto, turnNumber: number): CodeBlock[] {
        const codeBlocks: CodeBlock[] = [];
        const content = message.content;

        // Regex to match code blocks: ```language\ncode\n```
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
        let match;
        let blockIndex = 0;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            const language = match[1] || 'text';
            const code = match[2];

            if (code.trim()) {
                const timestamp = new Date(message.timestamp);
                const importance = this.determineCodeImportance(code, language);

                const codeBlock = new CodeBlock(
                    `${message.id}-code-${blockIndex}`,
                    timestamp,
                    language,
                    code,
                    undefined, // filename
                    undefined, // lineNumbers
                    false, // isPartial
                    undefined, // context
                    turnNumber
                );

                codeBlocks.push(codeBlock);
                blockIndex++;
            }
        }

        return codeBlocks;
    }

    /**
     * Create tool interaction group from message metadata
     */
    static createToolInteractionGroup(message: MessageDto, turnNumber: number): ToolInteractionGroup | null {
        if (!message.metadata?.toolUses || message.metadata.toolUses.length === 0) {
            return null;
        }

        const timestamp = new Date(message.timestamp);

        // Convert to proper ToolUse format
        const toolUses = message.metadata.toolUses.map(tool => {
            return new ToolUse(
                tool.id,
                tool.name,
                tool.input,
                'Tool executed successfully',
                true,
                0,
                undefined
            );
        });

        // Determine purpose based on tool names
        const purpose = this.determinePurpose(message.metadata.toolUses);

        return new ToolInteractionGroup(
            `${message.id}-tools`,
            timestamp,
            toolUses,
            purpose,
            undefined, // context
            true, // isSuccessful
            undefined, // totalDuration
            turnNumber
        );
    }

    static determinePurpose(tools: Array<{ name: string; [key: string]: any }>): string {
        const toolNames = tools.map(t => t.name.toLowerCase());

        if (toolNames.some(name => ['read', 'write', 'edit', 'multiedit'].includes(name))) {
            return 'file-management';
        }

        if (toolNames.some(name => ['grep', 'glob', 'ls'].includes(name))) {
            return 'information-gathering';
        }

        if (toolNames.some(name => ['bash', 'task'].includes(name))) {
            return 'system-operation';
        }

        if (toolNames.some(name => name.includes('test') || name.includes('debug'))) {
            return 'debugging';
        }

        return 'information-gathering'; // default
    }

    /**
     * Determine content importance based on content analysis
     */
    static determineContentImportance(content: string): ContentImportance {
        const length = content.length;
        const hasCodeBlocks = content.includes('```');
        const hasComplexTerms = /\b(implement|create|build|design|architecture|system|complex|advanced)\b/i.test(content);
        const hasErrorTerms = /\b(error|bug|issue|problem|fix|debug)\b/i.test(content);

        // Primary importance for critical content
        if (hasErrorTerms || hasComplexTerms || hasCodeBlocks) {
            return ContentImportance.PRIMARY;
        }

        // Secondary importance for substantial content
        if (length > 200) {
            return ContentImportance.SECONDARY;
        }

        // Tertiary for simple content
        return ContentImportance.TERTIARY;
    }

    /**
     * Determine code block importance
     */
    static determineCodeImportance(code: string, language: string): ContentImportance {
        const lines = code.split('\n').length;
        const hasComplexPatterns = /\b(class|function|interface|async|await|import|export)\b/i.test(code);
        const isConfiguration = /\.(json|yaml|yml|toml|ini|config)$/i.test(language) ||
            language === 'json' || language === 'yaml';

        // Configuration and complex code is primary
        if (isConfiguration || hasComplexPatterns || lines > 10) {
            return ContentImportance.PRIMARY;
        }

        // Medium code blocks are secondary
        if (lines > 3) {
            return ContentImportance.SECONDARY;
        }

        return ContentImportance.TERTIARY;
    }

    /**
     * Determine tool interaction importance
     */
    static determineToolImportance(tools: Array<{ name: string; [key: string]: any }>): ContentImportance {
        const criticalTools = ['Write', 'Edit', 'MultiEdit', 'Read'];
        const hasCriticalTools = tools.some(tool => criticalTools.includes(tool.name));

        if (hasCriticalTools || tools.length > 3) {
            return ContentImportance.PRIMARY;
        }

        if (tools.length > 1) {
            return ContentImportance.SECONDARY;
        }

        return ContentImportance.TERTIARY;
    }
}