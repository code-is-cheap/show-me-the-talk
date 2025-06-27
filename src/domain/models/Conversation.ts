import { Message, MessageType } from './Message.js';
import { ProjectContext } from './ProjectContext.js';
import { ConversationCategory } from '../services/ConversationFilter.js';

export interface ConversationMetadata {
    category?: ConversationCategory;
    complexity?: number;
    tags?: string[];
    hasCodeBlocks?: boolean;
    hasToolInteractions?: boolean;
    wordCount?: number;
    lastAnalyzed?: Date;
}

export class Conversation {
    private endedAt?: Date;
    private _messages: Message[] = [];
    private _metadata: ConversationMetadata = {};

    constructor(
        public readonly sessionId: string,
        public readonly projectContext: ProjectContext,
        private readonly startedAt: Date,
        endedAt?: Date
    ) {
        this.endedAt = endedAt;
    }

    addMessage(message: Message): void {
        this._messages.push(message);
        this.endedAt = message.timestamp;
    }

    getMessages(): readonly Message[] {
        return [...this._messages];
    }

    getMessageCount(): number {
        return this._messages.length;
    }

    getUserMessages(): Message[] {
        return this._messages.filter(msg => {
            if (msg.getType) {
                return msg.getType() === MessageType.USER;
            }
            return (msg as any).role === 'user';
        });
    }

    getAssistantMessages(): Message[] {
        return this._messages.filter(msg => {
            if (msg.getType) {
                return msg.getType() === MessageType.ASSISTANT;
            }
            return (msg as any).role === 'assistant';
        });
    }

    getDuration(): number {
        if (!this.endedAt) return 0;
        return this.endedAt.getTime() - this.startedAt.getTime();
    }

    getStartTime(): Date {
        return this.startedAt;
    }

    getEndTime(): Date | undefined {
        return this.endedAt;
    }

    getProjectContext(): ProjectContext {
        return this.projectContext;
    }

    hasMessages(): boolean {
        return this._messages.length > 0;
    }

    // Additional methods for TUI compatibility
    get id(): string {
        return this.sessionId;
    }

    get updatedAt(): Date {
        return this.endedAt || this.startedAt;
    }

    getSummary(): string {
        const exchanges = this.getMeaningfulExchanges();
        if (exchanges.length === 0) {
            return 'Empty conversation';
        }

        const firstExchange = exchanges[0];
        const userContent = firstExchange.userMessage.getContent();

        // Extract first meaningful part of the question
        const summary = userContent.length > 60
            ? userContent.substring(0, 60) + '...'
            : userContent;

        return summary || 'Conversation';
    }

    // Allow access to messages for compatibility
    get messages(): readonly Message[] {
        return this.getMessages();
    }

    // Metadata management
    getMetadata(): ConversationMetadata {
        return { ...this._metadata };
    }

    setMetadata(metadata: Partial<ConversationMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
    }

    updateMetadata<K extends keyof ConversationMetadata>(key: K, value: ConversationMetadata[K]): void {
        this._metadata[key] = value;
    }

    // Enhanced analysis methods
    get title(): string {
        // Try to generate a meaningful title from the first user message
        const firstUserMessage = this.getUserMessages()[0];
        if (!firstUserMessage) {
            return `Conversation ${this.sessionId.slice(0, 8)}`;
        }

        const content = firstUserMessage.getContent ? firstUserMessage.getContent() : (firstUserMessage as any).content || '';
        if (content.length <= 50) {
            return content;
        }

        // Find a natural break point
        const sentences = content.split(/[.!?]+/);
        if (sentences.length > 0 && sentences[0].length <= 80) {
            return sentences[0].trim();
        }

        // Fallback to truncation
        return content.substring(0, 50) + '...';
    }

    getWordCount(): number {
        if (this._metadata.wordCount !== undefined) {
            return this._metadata.wordCount;
        }

        const wordCount = this._messages.reduce((count, message) => {
            const content = message.getContent ? message.getContent() : (message as any).content || '';
            return count + content.split(/\s+/).length;
        }, 0);

        this._metadata.wordCount = wordCount;
        return wordCount;
    }

    hasCodeBlocks(): boolean {
        if (this._metadata.hasCodeBlocks !== undefined) {
            return this._metadata.hasCodeBlocks;
        }

        const hasCode = this._messages.some(message => {
            const content = message.getContent ? message.getContent() : (message as any).content || '';
            return content.includes('```');
        });

        this._metadata.hasCodeBlocks = hasCode;
        return hasCode;
    }

    hasToolInteractions(): boolean {
        if (this._metadata.hasToolInteractions !== undefined) {
            return this._metadata.hasToolInteractions;
        }

        const hasTools = this._messages.some(message => (message as any).toolUse && (message as any).toolUse.length > 0);
        this._metadata.hasToolInteractions = hasTools;
        return hasTools;
    }

    getExchangeCount(): number {
        return this.getMeaningfulExchanges().length;
    }

    // Enhanced search support
    getSearchableContent(): string {
        return [
            this.title,
            this.projectContext?.name || '',
            ...this._messages.map(m => m.getContent ? m.getContent() : (m as any).content || '')
        ].join(' ').toLowerCase();
    }

    // Get first few words for quick identification
    getPreview(): string {
        const firstUserMessage = this.getUserMessages()[0];
        if (!firstUserMessage) {
            return 'No content';
        }

        const content = firstUserMessage.getContent ? firstUserMessage.getContent() : (firstUserMessage as any).content || '';
        const words = content.split(/\s+/).slice(0, 15);
        return words.join(' ') + (content.split(/\s+/).length > 15 ? '...' : '');
    }

    // Business logic: Filter out tool-only interactions for simplified export
    getMeaningfulExchanges(): ConversationExchange[] {
        const exchanges: ConversationExchange[] = [];
        let currentUserMessage: Message | null = null;
        let currentAssistantResponses: Message[] = [];

        for (const message of this._messages) {
            if (message.getType() === MessageType.USER) {
                // Save previous exchange if exists
                if (currentUserMessage && currentAssistantResponses.length > 0) {
                    exchanges.push(new ConversationExchange(currentUserMessage, currentAssistantResponses));
                }

                // Start new exchange
                currentUserMessage = message;
                currentAssistantResponses = [];
            } else if (message.getType() === MessageType.ASSISTANT && currentUserMessage) {
                currentAssistantResponses.push(message);
            }
        }

        // Add final exchange
        if (currentUserMessage && currentAssistantResponses.length > 0) {
            exchanges.push(new ConversationExchange(currentUserMessage, currentAssistantResponses));
        }

        return exchanges;
    }
}

export class ConversationExchange {
    constructor(
        public readonly userMessage: Message,
        public readonly assistantResponses: Message[]
    ) {}

    hasTextualContent(): boolean {
        // Check if user message has meaningful content (not just tool results)
        const userContent = this.userMessage.getContent();
        if (userContent.startsWith('[Tool') || userContent.startsWith('[Error')) {
            return false;
        }

        // Check if assistant has text responses
        return this.assistantResponses.some(response => 
            response.getContent() && response.getContent().trim().length > 0
        );
    }

    getSummary(): { question: string; answer: string; timestamp: Date } {
        const userContent = this.userMessage.getContent();
        const assistantContent = this.assistantResponses
            .map(response => response.getContent())
            .filter(content => content && content.trim().length > 0)
            .join('\n');

        return {
            question: userContent,
            answer: assistantContent,
            timestamp: this.userMessage.timestamp
        };
    }
}