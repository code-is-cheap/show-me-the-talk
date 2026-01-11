import { ConversationRepository } from '../../domain/repositories/ConversationRepository.js';
import { ConversationService, ConversationMetrics } from '../../domain/services/ConversationService.js';
import { ProjectContext } from '../../domain/models/ProjectContext.js';
import { ConversationFilter, FilterCriteria, ConversationScore, ConversationCategory } from '../../domain/services/ConversationFilter.js';
import { ExportRequest, ExportResult, ConversationDto, MessageDto, RawEntryDto } from '../dto/ExportDto.js';
import { ExportRepository } from '../../domain/repositories/ExportRepository.js';
import { Conversation } from '../../domain/models/Conversation.js';
import { Message } from '../../domain/models/Message.js';

export class ConversationApplicationService {
    private readonly conversationFilter = new ConversationFilter();

    constructor(
        private readonly conversationRepository: ConversationRepository,
        private readonly exportRepository: ExportRepository
    ) {}

    async getAllConversations(): Promise<ConversationDto[]> {
        const conversations = await this.conversationRepository.findAll();
        return conversations.map(conversation => this.mapToDto(conversation));
    }

    async getConversationsByProject(projectPath: string): Promise<ConversationDto[]> {
        const projectContext = ProjectContext.fromEncodedDirectory(projectPath);
        const conversations = await this.conversationRepository.findByProjectContext(projectContext);
        return conversations.map(conversation => this.mapToDto(conversation));
    }

    async getConversationById(sessionId: string): Promise<ConversationDto | null> {
        const conversation = await this.conversationRepository.findBySessionId(sessionId);
        return conversation ? this.mapToDto(conversation) : null;
    }

    async exportConversations(request: ExportRequest): Promise<ExportResult> {
        try {
            let conversations: Conversation[];

            if (request.sessionId) {
                const conversation = await this.conversationRepository.findBySessionId(request.sessionId);
                conversations = conversation ? [conversation] : [];
            } else if (request.projectPath) {
                const projectContext = ProjectContext.fromEncodedDirectory(request.projectPath);
                conversations = await this.conversationRepository.findByProjectContext(projectContext);
            } else {
                conversations = await this.conversationRepository.findAll();
            }

            if (request.simplifyToolInteractions) {
                conversations = ConversationService.filterMeaningfulConversations(conversations);
            }

            const exportData = {
                exportDate: new Date().toISOString(),
                exportTimestamp: new Date(),
                conversations: conversations.map(conversation => this.mapToDto(conversation, { includeRaw: request.includeRaw })),
                projects: [], // Add projects data if needed
                totalConversations: conversations.length,
                totalMessages: conversations.reduce((sum, conv) => sum + conv.getMessageCount(), 0),
                totalProjects: 1, // Assuming single project for now
                includeMetadata: request.includeMetadata || false,
                includeRaw: request.includeRaw || false,
                metrics: request.includeMetadata ? ConversationService.calculateConversationMetrics(conversations) : undefined
            };

            await this.exportRepository.export(exportData, request.format, request.outputPath);

            return {
                success: true,
                outputPath: request.outputPath,
                conversationCount: conversations.length
            };
        } catch (error) {
            return {
                success: false,
                outputPath: request.outputPath,
                conversationCount: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getConversationMetrics(): Promise<ConversationMetrics> {
        const conversations = await this.conversationRepository.findAll();
        return ConversationService.calculateConversationMetrics(conversations);
    }

    async getCategorizedConversations() {
        const conversations = await this.conversationRepository.findAll();
        return ConversationService.categorizeConversations(conversations);
    }

    // New filtering and search methods
    async getFilteredConversations(criteria: FilterCriteria): Promise<ConversationDto[]> {
        const allConversations = await this.conversationRepository.findAll();
        const filtered = this.conversationFilter.filterConversations(allConversations, criteria);
        return filtered.map(conversation => this.mapToDto(conversation));
    }

    async searchConversations(query: string, limit?: number): Promise<ConversationScore[]> {
        const allConversations = await this.conversationRepository.findAll();
        return this.conversationFilter.searchConversations(allConversations, query, limit);
    }

    async getConversationsByCategory(category: ConversationCategory): Promise<ConversationDto[]> {
        const allConversations = await this.conversationRepository.findAll();
        const filtered = this.conversationFilter.filterConversations(allConversations, { category });
        return filtered.map(conversation => this.mapToDto(conversation));
    }

    async getProjectsWithStats(): Promise<Map<string, {
        conversations: ConversationDto[];
        stats: ReturnType<ConversationFilter['getProjectStats']>;
    }>> {
        const allConversations = await this.conversationRepository.findAll();
        const grouped = this.conversationFilter.groupByProject(allConversations);
        const result = new Map();

        for (const [projectName, conversations] of grouped) {
            result.set(projectName, {
                conversations: conversations.map(conv => this.mapToDto(conv)),
                stats: this.conversationFilter.getProjectStats(conversations)
            });
        }

        return result;
    }

    async categorizeConversation(sessionId: string): Promise<ConversationCategory | null> {
        const conversation = await this.conversationRepository.findBySessionId(sessionId);
        if (!conversation) {
            return null;
        }
        return this.conversationFilter.categorizeConversation(conversation);
    }

    // Enhanced export with filtering support
    async exportFilteredConversations(request: ExportRequest & { filterCriteria?: FilterCriteria }): Promise<ExportResult> {
        try {
            let conversations: Conversation[];

            if (request.sessionId) {
                const conversation = await this.conversationRepository.findBySessionId(request.sessionId);
                conversations = conversation ? [conversation] : [];
            } else if (request.projectPath) {
                const projectContext = ProjectContext.fromEncodedDirectory(request.projectPath);
                conversations = await this.conversationRepository.findByProjectContext(projectContext);
            } else {
                conversations = await this.conversationRepository.findAll();
            }

            // Apply filtering if criteria provided
            if (request.filterCriteria) {
                conversations = this.conversationFilter.filterConversations(conversations, request.filterCriteria);
            }

            if (request.simplifyToolInteractions) {
                conversations = ConversationService.filterMeaningfulConversations(conversations);
            }

            const exportData = {
                exportDate: new Date().toISOString(),
                exportTimestamp: new Date(),
                conversations: conversations.map(conversation => this.mapToDto(conversation, { includeRaw: request.includeRaw })),
                projects: [], // Add projects data if needed
                totalConversations: conversations.length,
                totalMessages: conversations.reduce((sum, conv) => sum + conv.getMessageCount(), 0),
                totalProjects: 1, // Assuming single project for now
                includeMetadata: request.includeMetadata || false,
                includeRaw: request.includeRaw || false,
                metrics: request.includeMetadata ? ConversationService.calculateConversationMetrics(conversations) : undefined
            };

            await this.exportRepository.export(exportData, request.format, request.outputPath);

            return {
                success: true,
                outputPath: request.outputPath,
                conversationCount: conversations.length
            };
        } catch (error) {
            return {
                success: false,
                outputPath: request.outputPath,
                conversationCount: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private mapToDto = (conversation: Conversation, options: { includeRaw?: boolean } = {}): ConversationDto => {
        const dto: ConversationDto = {
            sessionId: conversation.sessionId,
            projectPath: conversation.getProjectContext().getOriginalPath(),
            startTime: conversation.getStartTime().toISOString(),
            endTime: conversation.getEndTime()?.toISOString(),
            messageCount: conversation.getMessageCount(),
            duration: conversation.getDuration(),
            messages: conversation.getMessages().map((message): MessageDto => ({
                id: message.id,
                type: message.getType(),
                content: message.getContent(),
                timestamp: message.timestamp.toISOString(),
                parentId: message.parentId || undefined,
                metadata: this.extractMessageMetadata(message)
            }))
        };

        if (options.includeRaw) {
            dto.rawEntries = conversation.getRawEntries().map((entry): RawEntryDto => ({
                id: entry.id,
                type: entry.type,
                content: entry.content,
                timestamp: entry.timestamp.toISOString(),
                parentId: entry.parentId || undefined,
                metadata: entry.metadata
            }));
        }

        return dto;
    };

    private extractMessageMetadata(message: Message): MessageDto['metadata'] {
        // Extract metadata based on message type
        if (message.getType() === 'assistant') {
            const assistantMessage = message as any;
            return {
                model: assistantMessage.getModel?.(),
                usage: assistantMessage.getUsage?.() ? {
                    inputTokens: assistantMessage.getUsage().inputTokens,
                    outputTokens: assistantMessage.getUsage().outputTokens,
                    totalTokens: assistantMessage.getUsage().getTotalTokens()
                } : undefined,
                toolUses: assistantMessage.getToolUses?.()?.map((tool: any) => ({
                    id: tool.id,
                    name: tool.name,
                    input: tool.input
                }))
            };
        }
        return undefined;
    }
}
