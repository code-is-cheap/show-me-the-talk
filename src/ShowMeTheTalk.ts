import { Container } from './infrastructure/container/Container.js';
import { ConversationApplicationService } from './application/services/ConversationApplicationService.js';
import { ExportRequest, ExportResult, ExportFormat } from './application/dto/ExportDto.js';
import { ConversationMetrics } from './domain/services/ConversationService.js';

/**
 * Main facade for the Show Me The Talk library
 * Provides a simple, clean API for consuming applications
 */
export class ShowMeTheTalk {
    private readonly conversationService: ConversationApplicationService;

    constructor(claudeDir: string = './claude') {
        const container = Container.createConfiguredContainer(claudeDir);
        this.conversationService = container.get('ConversationApplicationService') as ConversationApplicationService;
    }

    /**
     * Get all conversations
     */
    async getAllConversations() {
        return await this.conversationService.getAllConversations();
    }

    /**
     * Get a specific conversation by session ID
     */
    async getConversation(sessionId: string) {
        return await this.conversationService.getConversationById(sessionId);
    }

    /**
     * Get conversations for a specific project
     */
    async getProjectConversations(projectPath: string) {
        return await this.conversationService.getConversationsByProject(projectPath);
    }

    /**
     * Export conversations to file
     */
    async export(options: {
        format: 'json' | 'markdown' | 'simple' | 'html';
        outputPath: string;
        sessionId?: string;
        projectPath?: string;
        includeMetadata?: boolean;
        simplifyToolInteractions?: boolean;
        includeRaw?: boolean;
    }): Promise<ExportResult> {
        const request: ExportRequest = {
            format: this.mapFormat(options.format),
            outputPath: options.outputPath,
            sessionId: options.sessionId,
            projectPath: options.projectPath,
            includeMetadata: options.includeMetadata ?? false,
            simplifyToolInteractions: options.simplifyToolInteractions ?? true,
            includeRaw: options.includeRaw ?? false
        };

        return await this.conversationService.exportConversations(request);
    }

    /**
     * Get conversation statistics and metrics
     */
    async getMetrics(): Promise<ConversationMetrics> {
        return await this.conversationService.getConversationMetrics();
    }

    /**
     * Get conversations categorized by type
     */
    async getCategorizedConversations() {
        return await this.conversationService.getCategorizedConversations();
    }

    private mapFormat(format: 'json' | 'markdown' | 'simple' | 'html'): ExportFormat {
        switch (format) {
            case 'json': return ExportFormat.JSON;
            case 'markdown': return ExportFormat.MARKDOWN;
            case 'simple': return ExportFormat.SIMPLIFIED;
            case 'html': return ExportFormat.HTML;
            default: throw new Error(`Unsupported format: ${format}`);
        }
    }
}

export type { ExportResult } from './application/dto/ExportDto.js';
export type { ConversationMetrics } from './domain/services/ConversationService.js';
