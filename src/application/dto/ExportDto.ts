export interface ExportRequest {
    format: ExportFormat;
    outputPath: string;
    sessionId?: string;
    projectPath?: string;
    includeMetadata?: boolean;
    simplifyToolInteractions?: boolean;
}

export enum ExportFormat {
    JSON = 'json',
    MARKDOWN = 'markdown',
    SIMPLIFIED = 'simple',
    HTML = 'html'
}

export interface ExportDto {
    conversationIds: string[];
    format: 'json' | 'markdown' | 'simplified' | 'html';
    outputPath: string;
    includeMetadata?: boolean;
}

export interface ExportResult {
    success: boolean;
    outputPath: string;
    conversationCount: number;
    error?: string;
}

export interface ConversationDto {
    sessionId: string;
    projectPath: string;
    startTime: string;
    endTime?: string;
    messageCount: number;
    duration: number;
    messages: MessageDto[];
}

export interface MessageDto {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
    parentId?: string;
    metadata?: {
        model?: string;
        usage?: {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
        };
        toolUses?: ToolUseDto[];
    };
}

export interface ToolUseDto {
    id: string;
    name: string;
    input: Record<string, any>;
}