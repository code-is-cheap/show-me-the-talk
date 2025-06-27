export abstract class Message {
    constructor(
        public readonly id: string,
        public readonly timestamp: Date,
        public readonly parentId: string | null
    ) {}

    abstract getContent(): string;
    abstract getType(): MessageType;
}

export class UserMessage extends Message {
    constructor(
        id: string,
        timestamp: Date,
        parentId: string | null,
        private readonly content: string | ToolInteraction[]
    ) {
        super(id, timestamp, parentId);
    }

    getContent(): string {
        if (typeof this.content === 'string') {
            return this.content;
        }

        // Handle tool interactions
        return this.content
            .map(interaction => interaction.getSummary())
            .join('; ');
    }

    getType(): MessageType {
        return MessageType.USER;
    }

    hasToolInteractions(): boolean {
        return Array.isArray(this.content);
    }

    getToolInteractions(): ToolInteraction[] {
        return Array.isArray(this.content) ? this.content : [];
    }
}

export class AssistantMessage extends Message {
    constructor(
        id: string,
        timestamp: Date,
        parentId: string | null,
        private readonly textContent: string,
        private readonly toolUses: ToolUse[],
        private readonly model: string,
        private readonly usage: TokenUsage
    ) {
        super(id, timestamp, parentId);
    }

    getContent(): string {
        // If there's text content, return it
        if (this.textContent && this.textContent.trim() !== '') {
            return this.textContent;
        }

        // If no text but has tool uses, show detailed tool usage
        if (this.toolUses.length > 0) {
            const toolDetails = this.toolUses.map(tool => {
                const input = tool.input;
                
                // Show details for common tools
                if (tool.name === 'Bash') {
                    const command = input.command || '';
                    const description = input.description || '';
                    return `🔧 Bash: ${command}${description ? ` (${description})` : ''}`;
                } else if (tool.name === 'Read') {
                    const filePath = input.file_path || '';
                    return `📖 Read: ${filePath}`;
                } else if (tool.name === 'Edit') {
                    const filePath = input.file_path || '';
                    return `✏️ Edit: ${filePath}`;
                } else if (tool.name === 'Write') {
                    const filePath = input.file_path || '';
                    return `📝 Write: ${filePath}`;
                } else if (tool.name === 'Glob') {
                    const pattern = input.pattern || '';
                    return `🔍 Glob: ${pattern}`;
                } else if (tool.name === 'Grep') {
                    const pattern = input.pattern || '';
                    return `🔍 Grep: ${pattern}`;
                } else if (tool.name === 'TodoWrite') {
                    const todoCount = input.todos?.length || 0;
                    return `📋 TodoWrite: ${todoCount} items`;
                } else if (tool.name === 'TodoRead') {
                    return `📋 TodoRead`;
                } else {
                    // Generic tool display
                    const mainInput = Object.keys(input)[0];
                    const value = mainInput ? input[mainInput] : '';
                    return `🔨 ${tool.name}: ${typeof value === 'string' ? value.substring(0, 50) : JSON.stringify(value).substring(0, 50)}`;
                }
            });

            return toolDetails.join('\n');
        }

        // Fallback for truly empty messages
        return '[Empty assistant message]';
    }

    getType(): MessageType {
        return MessageType.ASSISTANT;
    }

    getModel(): string {
        return this.model;
    }

    getUsage(): TokenUsage {
        return this.usage;
    }

    getToolUses(): ToolUse[] {
        return this.toolUses;
    }
}

export enum MessageType {
    USER = 'user',
    ASSISTANT = 'assistant'
}

export class ToolInteraction {
    constructor(
        private readonly toolUseId: string,
        private readonly type: string,
        private readonly content: string,
        private readonly isError: boolean = false
    ) {}

    getSummary(): string {
        if (this.isError) {
            return `[Error: ${this.content.substring(0, 50)}...]`;
        }

        const lines = this.content.split('\n');
        if (lines[0] && lines[0].includes('/')) {
            return `[Viewed: ${lines[0]}]`;
        }

        return `[Tool result: ${lines[0]?.substring(0, 50)}...]`;
    }

    getToolUseId(): string {
        return this.toolUseId;
    }

    getType(): string {
        return this.type;
    }

    getContent(): string {
        return this.content;
    }

    isErrorResult(): boolean {
        return this.isError;
    }
}

export class ToolUse {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly input: Record<string, any>
    ) {}
}

export class TokenUsage {
    constructor(
        public readonly inputTokens: number,
        public readonly outputTokens: number,
        public readonly cacheCreationTokens: number = 0,
        public readonly cacheReadTokens: number = 0
    ) {}

    getTotalTokens(): number {
        return this.inputTokens + this.outputTokens;
    }
}