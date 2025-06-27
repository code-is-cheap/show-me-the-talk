/**
 * Domain interface for message data
 *
 * This interface isolates the domain layer from specific DTO implementations
 * while providing all necessary data for creating conversation elements.
 */
export interface MessageData {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: {
        usage?: {
            inputTokens: number;
            outputTokens: number;
        };
        model?: string;
        toolUses?: Array<{
            id: string;
            name: string;
            input: any;
        }>;
    };
}