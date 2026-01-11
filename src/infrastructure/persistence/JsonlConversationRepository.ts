import { ConversationRepository } from '../../domain/repositories/ConversationRepository.js';
import { Conversation } from '../../domain/models/Conversation.js';
import { ProjectContext } from '../../domain/models/ProjectContext.js';
import { UserMessage, AssistantMessage, ToolUse, TokenUsage, ToolInteraction } from '../../domain/models/Message.js';
import { RawConversationEntry } from '../../domain/models/RawConversationEntry.js';
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';

export class JsonlConversationRepository implements ConversationRepository {
    constructor(private readonly claudeDir: string) {}

    async findAll(): Promise<Conversation[]> {
        try {
            const projectsDir = join(this.claudeDir, 'projects');
            const projectDirs = await readdir(projectsDir, { withFileTypes: true });
            
            const conversations: Conversation[] = [];
            
            for (const dirent of projectDirs) {
                if (dirent.isDirectory()) {
                    const projectPath = join(projectsDir, dirent.name);
                    const projectConversations = await this.loadProjectConversations(dirent.name, projectPath);
                    conversations.push(...projectConversations);
                }
            }
            
            return conversations;
        } catch (error) {
            console.warn('Failed to load conversations:', error);
            return [];
        }
    }

    async findBySessionId(sessionId: string): Promise<Conversation | null> {
        const conversations = await this.findAll();
        return conversations.find(conv => conv.sessionId === sessionId) || null;
    }

    async findByProjectContext(projectContext: ProjectContext): Promise<Conversation[]> {
        const conversations = await this.findAll();
        return conversations.filter(conv => 
            conv.getProjectContext().path === projectContext.path
        );
    }

    async getAllProjects(): Promise<ProjectContext[]> {
        try {
            const projectsDir = join(this.claudeDir, 'projects');
            const projectDirs = await readdir(projectsDir, { withFileTypes: true });
            
            return projectDirs
                .filter(dirent => dirent.isDirectory())
                .map(dirent => ProjectContext.fromEncodedDirectory(dirent.name));
        } catch (error) {
            return [];
        }
    }

    private async loadProjectConversations(projectName: string, projectPath: string): Promise<Conversation[]> {
        try {
            const files = await readdir(projectPath);
            const jsonlFiles = files.filter(file => file.endsWith('.jsonl'));
            
            const conversations: Conversation[] = [];
            
            for (const file of jsonlFiles) {
                const filePath = join(projectPath, file);
                try {
                    const conversation = await this.parseConversationFile(filePath, projectName);
                    if (conversation) {
                        conversations.push(conversation);
                    }
                } catch (error) {
                    console.warn(`Failed to parse conversation file ${filePath}:`, error);
                }
            }
            
            return conversations;
        } catch (error) {
            return [];
        }
    }

    private async parseConversationFile(filePath: string, projectName: string): Promise<Conversation | null> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
                return null;
            }

            // Extract session ID from filename
            const filename = basename(filePath, '.jsonl');
            const sessionId = filename;
            
            const projectContext = ProjectContext.fromEncodedDirectory(projectName);
            
            // Parse first message to get start time
            const firstLine = JSON.parse(lines[0]);
            const startTime = this.extractTimestamp(firstLine);
            
            const conversation = new Conversation(sessionId, projectContext, startTime);
            
            for (const line of lines) {
                try {
                    const messageData = JSON.parse(line);
                    const rawEntries = this.parseRawEntries(messageData);
                    rawEntries.forEach(entry => conversation.addRawEntry(entry));

                    const message = this.parseMessage(messageData);
                    if (message) {
                        conversation.addMessage(message);
                    }
                } catch (error) {
                    console.warn('Failed to parse message:', error);
                }
            }
            
            return conversation.hasMessages() ? conversation : null;
        } catch (error) {
            console.warn(`Error parsing conversation file ${filePath}:`, error);
            return null;
        }
    }

    private parseMessage(data: any): UserMessage | AssistantMessage | null {
        try {
            const id = data.uuid;
            // Validate ID exists
            if (!id || typeof id !== 'string') {
                return null;
            }
            // Validate timestamp before creating Date object
            const timestampValue = data.timestamp;
            if (!timestampValue || typeof timestampValue !== 'string') {
                return null;
            }
            const timestamp = new Date(timestampValue);
            // Check if Date is valid
            if (isNaN(timestamp.getTime())) {
                return null;
            }
            const parentId = data.parentUuid;

            if (data.type === 'user') {
                // Check if this is a tool result message
                if (Array.isArray(data.message?.content)) {
                    const hasOnlyToolResults = data.message.content.every((item: any) => item.type === 'tool_result');
                    if (hasOnlyToolResults) {
                        // Skip tool result messages - they are not real user messages
                        return null;
                    }
                }
                return this.parseUserMessage(id, timestamp, parentId, data.message);
            } else if (data.type === 'assistant') {
                return this.parseAssistantMessage(id, timestamp, parentId, data.message);
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    private parseRawEntries(data: any): RawConversationEntry[] {
        const entries: RawConversationEntry[] = [];
        const timestamp = this.extractTimestamp(data);
        const parentId = data.parentUuid ?? data.logicalParentUuid ?? null;
        const baseId = this.extractEntryId(data);

        if (!data || typeof data !== 'object') {
            return entries;
        }

        switch (data.type) {
            case 'user': {
                const messageData = data.message || {};
                const content = messageData.content;

                if (typeof content === 'string') {
                    entries.push({
                        id: baseId,
                        type: 'user',
                        timestamp,
                        parentId,
                        content,
                        metadata: { messageId: baseId }
                    });
                    return entries;
                }

                if (Array.isArray(content)) {
                    const textParts: string[] = [];
                    let textEntryIndex = 0;

                    const flushText = () => {
                        if (textParts.length === 0) return;
                        entries.push({
                            id: `${baseId}:text:${textEntryIndex++}`,
                            type: 'user',
                            timestamp,
                            parentId,
                            content: textParts.join('\n'),
                            metadata: { messageId: baseId }
                        });
                        textParts.length = 0;
                    };

                    content.forEach((item: any, index: number) => {
                        if (!item || typeof item !== 'object') {
                            return;
                        }

                        if (item.type === 'tool_result') {
                            flushText();
                            entries.push({
                                id: `${baseId}:tool:${index}`,
                                type: 'tool_result',
                                timestamp,
                                parentId,
                                content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
                                metadata: {
                                    messageId: baseId,
                                    toolUseId: item.tool_use_id,
                                    isError: item.is_error || false
                                }
                            });
                            return;
                        }

                        if (item.type === 'text' || item.type === 'input_text') {
                            textParts.push(item.text || '');
                            return;
                        }

                        if (item.type === 'image' || item.type === 'image_url') {
                            textParts.push('[Image attached]');
                            return;
                        }

                        if (item.text) {
                            textParts.push(`[${item.type}: ${item.text}]`);
                        }
                    });

                    flushText();
                }
                return entries;
            }
            case 'assistant': {
                const messageData = data.message || {};
                const contentItems = Array.isArray(messageData.content) ? messageData.content : [];
                const textParts: string[] = [];
                const toolUses: ToolUse[] = [];

                if (typeof messageData.content === 'string') {
                    textParts.push(messageData.content);
                }

                for (const item of contentItems) {
                    if (!item || typeof item !== 'object') continue;
                    if (item.type === 'text') {
                        if (item.text) textParts.push(item.text);
                    } else if (item.type === 'tool_use') {
                        toolUses.push(new ToolUse(item.id, item.name, item.input || {}));
                    } else if (item.text) {
                        textParts.push(`[${item.type}: ${item.text}]`);
                    }
                }

                const usage = messageData.usage ? {
                    inputTokens: messageData.usage.input_tokens || 0,
                    outputTokens: messageData.usage.output_tokens || 0,
                    cacheCreationTokens: messageData.usage.cache_creation_input_tokens || 0,
                    cacheReadTokens: messageData.usage.cache_read_input_tokens || 0
                } : undefined;

                if (textParts.length === 0 && toolUses.length === 0 && !messageData.model && !usage) {
                    return entries;
                }

                entries.push({
                    id: baseId,
                    type: 'assistant',
                    timestamp,
                    parentId,
                    content: textParts.join('\n'),
                    metadata: {
                        messageId: baseId,
                        model: messageData.model,
                        toolUses: toolUses.map(tool => ({
                            id: tool.id,
                            name: tool.name,
                            input: tool.input
                        })),
                        usage
                    }
                });
                return entries;
            }
            case 'file-history-snapshot': {
                const snapshot = data.snapshot || {};
                const files = snapshot.trackedFileBackups ? Object.keys(snapshot.trackedFileBackups) : [];
                entries.push({
                    id: baseId,
                    type: 'file_snapshot',
                    timestamp,
                    parentId,
                    content: `File snapshot: ${files.length} file${files.length === 1 ? '' : 's'}`,
                    metadata: {
                        messageId: baseId,
                        files,
                        isSnapshotUpdate: data.isSnapshotUpdate || false,
                        snapshotMessageId: data.messageId
                    }
                });
                return entries;
            }
            case 'summary': {
                entries.push({
                    id: baseId,
                    type: 'summary',
                    timestamp,
                    parentId,
                    content: data.summary || '',
                    metadata: {
                        messageId: baseId,
                        leafUuid: data.leafUuid
                    }
                });
                return entries;
            }
            case 'queue-operation': {
                const operation = data.operation || 'queue';
                const content = data.content || '';
                entries.push({
                    id: baseId,
                    type: 'queue',
                    timestamp,
                    parentId,
                    content: `${operation}: ${content}`.trim(),
                    metadata: {
                        messageId: baseId,
                        operation
                    }
                });
                return entries;
            }
            case 'system': {
                entries.push({
                    id: baseId,
                    type: 'system',
                    timestamp,
                    parentId,
                    content: data.content || data.subtype || 'system event',
                    metadata: {
                        messageId: baseId,
                        subtype: data.subtype,
                        level: data.level,
                        isMeta: data.isMeta,
                        compactMetadata: data.compactMetadata
                    }
                });
                return entries;
            }
            default: {
                entries.push({
                    id: baseId,
                    type: 'unknown',
                    timestamp,
                    parentId,
                    content: data.content ? String(data.content) : JSON.stringify(data),
                    metadata: { messageId: baseId }
                });
                return entries;
            }
        }
    }

    private extractEntryId(data: any): string {
        return data.uuid ||
            data.messageId ||
            data.id ||
            data?.message?.id ||
            `${data.type || 'entry'}-${Date.now()}`;
    }

    private extractTimestamp(data: any): Date {
        const candidates = [
            data?.timestamp,
            data?.snapshot?.timestamp,
            data?.message?.timestamp
        ];
        for (const candidate of candidates) {
            const parsed = this.parseTimestamp(candidate);
            if (parsed) return parsed;
        }
        return new Date();
    }

    private parseTimestamp(value: any): Date | null {
        if (!value) return null;
        if (typeof value === 'string' || typeof value === 'number') {
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return null;
    }

    private parseUserMessage(id: string, timestamp: Date, parentId: string | null, messageData: any): UserMessage {
        if (typeof messageData.content === 'string') {
            return new UserMessage(id, timestamp, parentId, messageData.content);
        } else if (Array.isArray(messageData.content)) {
            // Check if this is a tool result message
            const hasToolResults = messageData.content.some((item: any) => item.type === 'tool_result');
            if (hasToolResults) {
                // Handle tool results
                const toolInteractions = messageData.content
                    .filter((item: any) => item.type === 'tool_result')
                    .map((item: any) => new ToolInteraction(
                        item.tool_use_id, 
                        item.type, 
                        typeof item.content === 'string' ? item.content : JSON.stringify(item.content), 
                        item.is_error || false
                    ));
                return new UserMessage(id, timestamp, parentId, toolInteractions);
            } else {
                // Handle regular text content in array format
                const textParts: string[] = [];
                for (const item of messageData.content) {
                    if (item.type === 'text') {
                        textParts.push(item.text);
                    } else if (item.type === 'image') {
                        textParts.push('[Image attached]');
                    }
                }
                return new UserMessage(id, timestamp, parentId, textParts.join('\n'));
            }
        } else {
            // Fallback for unknown format
            return new UserMessage(id, timestamp, parentId, '');
        }
    }

    private parseAssistantMessage(id: string, timestamp: Date, parentId: string | null, messageData: any): AssistantMessage {
        // Ensure content is an array before processing
        const content = Array.isArray(messageData.content) ? messageData.content : [];
        
        // Extract and process all content types
        const textParts: string[] = [];
        const toolUses: ToolUse[] = [];
        
        for (const item of content) {
            if (item.type === 'text') {
                if (item.text) {
                    textParts.push(item.text);
                }
            } else if (item.type === 'tool_use') {
                toolUses.push(new ToolUse(item.id, item.name, item.input));
            } else {
                // Handle unknown types gracefully
                if (item.text) {
                    textParts.push(`[${item.type}: ${item.text}]`);
                } else {
                    textParts.push(`[${item.type} content]`);
                }
            }
        }
        
        const textContent = textParts.join('\n') || '';
        
        // Extract usage information
        const usage = messageData.usage ? 
            new TokenUsage(
                messageData.usage.input_tokens || 0,
                messageData.usage.output_tokens || 0,
                messageData.usage.cache_creation_input_tokens || 0,
                messageData.usage.cache_read_input_tokens || 0
            ) : new TokenUsage(0, 0, 0, 0);

        return new AssistantMessage(id, timestamp, parentId, textContent, toolUses, messageData.model || 'unknown', usage);
    }
}
