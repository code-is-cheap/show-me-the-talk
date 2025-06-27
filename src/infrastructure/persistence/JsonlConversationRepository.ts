import { ConversationRepository } from '../../domain/repositories/ConversationRepository.js';
import { Conversation } from '../../domain/models/Conversation.js';
import { ProjectContext } from '../../domain/models/ProjectContext.js';
import { UserMessage, AssistantMessage, ToolUse, TokenUsage, ToolInteraction } from '../../domain/models/Message.js';
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
            let startTime = new Date();
            if (firstLine.timestamp) {
                const parsedDate = new Date(firstLine.timestamp);
                startTime = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
            }
            
            const conversation = new Conversation(sessionId, projectContext, startTime);
            
            for (const line of lines) {
                try {
                    const messageData = JSON.parse(line);
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