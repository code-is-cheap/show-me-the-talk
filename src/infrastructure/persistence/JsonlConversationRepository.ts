import { ConversationRepository } from '../../domain/repositories/ConversationRepository.js';
import { Conversation } from '../../domain/models/Conversation.js';
import { ProjectContext } from '../../domain/models/ProjectContext.js';
import { UserMessage, AssistantMessage, ToolUse, TokenUsage } from '../../domain/models/Message.js';
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
            const id = data.id || 'unknown';
            let timestamp = new Date();
            if (data.timestamp) {
                const parsedDate = new Date(data.timestamp);
                timestamp = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
            }
            const parentId = data.parentId || null;

            if (data.type === 'user') {
                return this.parseUserMessage(id, timestamp, parentId, data);
            } else if (data.type === 'assistant') {
                return this.parseAssistantMessage(id, timestamp, parentId, data);
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    private parseUserMessage(id: string, timestamp: Date, parentId: string | null, data: any): UserMessage {
        const content = data.content || '';
        return new UserMessage(id, timestamp, parentId, content);
    }

    private parseAssistantMessage(id: string, timestamp: Date, parentId: string | null, data: any): AssistantMessage {
        const textContent = data.content || '';
        const model = data.model || 'unknown';
        
        // Parse tool uses
        const toolUses: ToolUse[] = [];
        if (data.toolUse && Array.isArray(data.toolUse)) {
            for (const tool of data.toolUse) {
                toolUses.push(new ToolUse(tool.id || 'unknown', tool.name || 'unknown', tool.input || {}));
            }
        }

        // Parse token usage
        const usage = new TokenUsage(
            data.usage?.inputTokens || 0,
            data.usage?.outputTokens || 0,
            data.usage?.cacheCreationTokens || 0,
            data.usage?.cacheReadTokens || 0
        );

        return new AssistantMessage(id, timestamp, parentId, textContent, toolUses, model, usage);
    }
}