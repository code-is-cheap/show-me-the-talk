/**
 * SpecStory数据源适配器
 * 读取SpecStory扩展保存的对话历史文件
 */

import { ConversationRepository } from '../../domain/repositories/ConversationRepository.js';
import { Conversation } from '../../domain/models/Conversation.js';
import { ProjectContext } from '../../domain/models/ProjectContext.js';
import { Message, UserMessage, AssistantMessage, TokenUsage } from '../../domain/models/Message.js';
import * as fs from 'fs';
import * as path from 'path';

export interface SpecStoryMetadata {
    id: string;
    title: string;
    timestamp: string;
    project: string;
    tags?: string[];
    model?: string;
    tokens?: {
        input: number;
        output: number;
    };
}

export interface SpecStoryFile {
    filepath: string;
    metadata: SpecStoryMetadata;
    content: string;
    messages: SpecStoryMessage[];
}

export interface SpecStoryMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: any;
}

export class SpecStoryRepository implements ConversationRepository {
    private readonly specStoryPath: string;

    constructor(projectRoot: string) {
        this.specStoryPath = path.resolve(projectRoot, '.specstory', 'history');
    }

    /**
     * 检查SpecStory目录是否存在
     */
    isAvailable(): boolean {
        try {
            return fs.existsSync(this.specStoryPath) && fs.statSync(this.specStoryPath).isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * 实现ConversationRepository接口 - 获取所有对话
     */
    async findAll(): Promise<Conversation[]> {
        if (!this.isAvailable()) {
            return [];
        }

        try {
            const specStoryFiles = await this.getSpecStoryFiles();
            const conversations: Conversation[] = [];

            for (const file of specStoryFiles) {
                const conversation = await this.convertToConversation(file);
                if (conversation) {
                    conversations.push(conversation);
                }
            }

            return conversations.sort((a, b) => 
                b.getStartTime().getTime() - a.getStartTime().getTime()
            );
        } catch (error) {
            console.warn('Failed to load SpecStory conversations:', error);
            return [];
        }
    }

    /**
     * 实现ConversationRepository接口 - 根据sessionId获取对话
     */
    async findBySessionId(sessionId: string): Promise<Conversation | null> {
        const conversations = await this.findAll();
        return conversations.find(c => c.sessionId === sessionId) || null;
    }

    /**
     * 实现ConversationRepository接口 - 根据项目上下文获取对话
     */
    async findByProjectContext(projectContext: ProjectContext): Promise<Conversation[]> {
        const conversations = await this.findAll();
        const projectPath = projectContext.getOriginalPath();
        
        return conversations.filter(c => 
            c.getProjectContext().getOriginalPath() === projectPath
        );
    }

    /**
     * 实现ConversationRepository接口 - 获取所有项目
     */
    async getAllProjects(): Promise<ProjectContext[]> {
        const conversations = await this.findAll();
        const projectPaths = new Set<string>();
        
        conversations.forEach(c => {
            projectPaths.add(c.getProjectContext().getOriginalPath());
        });

        return Array.from(projectPaths).map(path => 
            ProjectContext.fromEncodedDirectory(path)
        );
    }

    /**
     * 根据项目路径获取对话（向后兼容）
     */
    async getByProject(projectPath: string): Promise<Conversation[]> {
        const projectContext = ProjectContext.fromEncodedDirectory(projectPath);
        return this.findByProjectContext(projectContext);
    }

    /**
     * 根据时间范围获取对话（向后兼容）
     */
    async getByTimeRange(startTime: Date, endTime: Date): Promise<Conversation[]> {
        const conversations = await this.findAll();
        
        return conversations.filter(c => {
            const createdAt = c.getStartTime();
            return createdAt >= startTime && createdAt <= endTime;
        });
    }

    /**
     * 获取对话统计信息
     */
    async getStats(): Promise<{
        totalConversations: number;
        totalMessages: number;
        projectCounts: Record<string, number>;
        timeRange: { earliest: Date; latest: Date } | null;
    }> {
        const conversations = await this.findAll();
        
        if (conversations.length === 0) {
            return {
                totalConversations: 0,
                totalMessages: 0,
                projectCounts: {},
                timeRange: null
            };
        }

        const projectCounts: Record<string, number> = {};
        let totalMessages = 0;
        const timestamps: Date[] = [];

        conversations.forEach(c => {
            const projectPath = c.getProjectContext().getOriginalPath();
            projectCounts[projectPath] = (projectCounts[projectPath] || 0) + 1;
            totalMessages += c.getMessages().length;
            timestamps.push(c.getStartTime());
        });

        timestamps.sort((a, b) => a.getTime() - b.getTime());

        return {
            totalConversations: conversations.length,
            totalMessages,
            projectCounts,
            timeRange: {
                earliest: timestamps[0],
                latest: timestamps[timestamps.length - 1]
            }
        };
    }

    /**
     * 获取所有SpecStory文件
     */
    private async getSpecStoryFiles(): Promise<SpecStoryFile[]> {
        const files: SpecStoryFile[] = [];
        
        const scanDirectory = async (dir: string): Promise<void> => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    await scanDirectory(fullPath);
                } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
                    const file = await this.parseSpecStoryFile(fullPath);
                    if (file) {
                        files.push(file);
                    }
                }
            }
        };

        await scanDirectory(this.specStoryPath);
        return files;
    }

    /**
     * 解析单个SpecStory文件
     */
    private async parseSpecStoryFile(filepath: string): Promise<SpecStoryFile | null> {
        try {
            const content = fs.readFileSync(filepath, 'utf-8');
            const { metadata, mainContent } = this.parseFrontMatter(content);
            
            if (!metadata.id || !metadata.title) {
                return null; // 不是有效的SpecStory文件
            }

            const messages = this.parseMessages(mainContent);
            
            return {
                filepath,
                metadata,
                content: mainContent,
                messages
            };
        } catch (error) {
            console.warn(`Failed to parse SpecStory file ${filepath}:`, error);
            return null;
        }
    }

    /**
     * 解析YAML front matter
     */
    private parseFrontMatter(content: string): { metadata: SpecStoryMetadata; mainContent: string } {
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontMatterRegex);
        
        if (!match) {
            // 没有front matter，使用默认元数据
            return {
                metadata: {
                    id: Date.now().toString(),
                    title: 'Untitled Conversation',
                    timestamp: new Date().toISOString(),
                    project: 'unknown'
                },
                mainContent: content
            };
        }

        const [, frontMatter, mainContent] = match;
        
        // 简单的YAML解析（仅支持基本键值对）
        const metadata: any = {
            id: Date.now().toString(),
            title: 'Untitled Conversation',
            timestamp: new Date().toISOString(),
            project: 'unknown'
        };

        frontMatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
                metadata[key] = value;
            }
        });

        return { metadata, mainContent };
    }

    /**
     * 解析消息内容
     */
    private parseMessages(content: string): SpecStoryMessage[] {
        const messages: SpecStoryMessage[] = [];
        const lines = content.split('\n');
        
        let currentMessage: Partial<SpecStoryMessage> | null = null;
        let contentLines: string[] = [];

        for (const line of lines) {
            if (this.isUserMessage(line)) {
                // 保存之前的消息
                if (currentMessage) {
                    currentMessage.content = contentLines.join('\n').trim();
                    if (currentMessage.content) {
                        messages.push(currentMessage as SpecStoryMessage);
                    }
                }
                
                // 开始新的用户消息
                currentMessage = this.parseUserMessage(line);
                contentLines = [];
            } else if (this.isAssistantMessage(line)) {
                // 保存之前的消息
                if (currentMessage) {
                    currentMessage.content = contentLines.join('\n').trim();
                    if (currentMessage.content) {
                        messages.push(currentMessage as SpecStoryMessage);
                    }
                }
                
                // 开始新的助手消息
                currentMessage = this.parseAssistantMessage(line);
                contentLines = [];
            } else if (currentMessage) {
                // 添加到当前消息内容
                contentLines.push(line);
            }
        }

        // 保存最后一条消息
        if (currentMessage) {
            currentMessage.content = contentLines.join('\n').trim();
            if (currentMessage.content) {
                messages.push(currentMessage as SpecStoryMessage);
            }
        }

        return messages;
    }

    /**
     * 检查是否为用户消息
     */
    private isUserMessage(line: string): boolean {
        return /^##?\s*(User|Human|Question):/i.test(line.trim()) ||
               /^>\s*/i.test(line.trim());
    }

    /**
     * 检查是否为助手消息
     */
    private isAssistantMessage(line: string): boolean {
        return /^##?\s*(Assistant|AI|Claude|Answer):/i.test(line.trim());
    }

    /**
     * 解析用户消息
     */
    private parseUserMessage(line: string): Partial<SpecStoryMessage> {
        return {
            role: 'user',
            timestamp: new Date(),
            content: ''
        };
    }

    /**
     * 解析助手消息
     */
    private parseAssistantMessage(line: string): Partial<SpecStoryMessage> {
        return {
            role: 'assistant',
            timestamp: new Date(),
            content: ''
        };
    }

    /**
     * 将SpecStory文件转换为Conversation对象
     */
    private async convertToConversation(file: SpecStoryFile): Promise<Conversation | null> {
        try {
            const messages = file.messages.map((msg, index) => {
                if (msg.role === 'user') {
                    return new UserMessage(
                        `${file.metadata.id}-${index}`,
                        msg.timestamp,
                        null,
                        msg.content
                    );
                } else {
                    return new AssistantMessage(
                        `${file.metadata.id}-${index}`,
                        msg.timestamp,
                        null,
                        msg.content,
                        [], // tool uses
                        file.metadata.model || 'unknown',
                        new TokenUsage(0, 0) // usage
                    );
                }
            });

            const projectContext = ProjectContext.fromEncodedDirectory(file.metadata.project);

            const conversation = new Conversation(
                file.metadata.id,
                projectContext,
                new Date(file.metadata.timestamp),
                messages.length > 0 ? messages[messages.length - 1].timestamp : undefined
            );
            
            // Add messages
            for (const message of messages) {
                conversation.addMessage(message);
            }
            
            // Set metadata
            conversation.setMetadata({
                tags: file.metadata.tags || []
            });
            
            return conversation;
        } catch (error) {
            console.warn(`Failed to convert SpecStory file to conversation:`, error);
            return null;
        }
    }

    /**
     * 获取SpecStory数据源信息
     */
    getSourceInfo(): {
        type: 'specstory';
        path: string;
        available: boolean;
        fileCount: number;
    } {
        let fileCount = 0;
        
        if (this.isAvailable()) {
            try {
                const countFiles = (dir: string): number => {
                    let count = 0;
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            count += countFiles(fullPath);
                        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
                            count++;
                        }
                    }
                    return count;
                };
                
                fileCount = countFiles(this.specStoryPath);
            } catch {
                // Ignore errors in counting
            }
        }

        return {
            type: 'specstory',
            path: this.specStoryPath,
            available: this.isAvailable(),
            fileCount
        };
    }
}