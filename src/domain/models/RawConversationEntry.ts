export type RawEntryType =
    | 'user'
    | 'assistant'
    | 'tool_result'
    | 'system'
    | 'file_snapshot'
    | 'summary'
    | 'queue'
    | 'unknown';

export interface RawConversationEntry {
    id: string;
    type: RawEntryType;
    timestamp: Date;
    parentId?: string | null;
    content: string;
    metadata?: Record<string, any>;
}
