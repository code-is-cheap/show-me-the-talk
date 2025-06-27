import { Message } from '../Message.js';

/**
 * 时间轴上的消息块，表示单个消息的可视化表示
 */
export interface MessageBlock {
    readonly messageIndex: number;
    readonly width: number;
    readonly type: MessageBlockType;
    readonly isKeyPoint: boolean;
    readonly segmentId?: string;
    readonly preview?: string;
}

/**
 * 消息块类型枚举
 */
export enum MessageBlockType {
    USER = 'user',
    ASSISTANT = 'assistant',
    TOOL_USE = 'tool'
}

/**
 * 时间轴布局数据
 */
export interface TimelineData {
    readonly messageBlocks: MessageBlock[];
    readonly totalWidth: number;
    readonly currentPosition: number;
}

/**
 * 消息块计算器 - 负责从消息生成消息块
 */
export class MessageBlockCalculator {
    /**
     * 计算消息块的宽度
     * 基于消息内容长度，范围 1-5 字符
     */
    static calculateWidth(message: Message): number {
        const contentLength = message.getContent().length;
        
        // 基于内容长度计算基础宽度
        let baseWidth = 1;
        if (contentLength > 1000) baseWidth = 5;
        else if (contentLength > 500) baseWidth = 4;
        else if (contentLength > 200) baseWidth = 3;
        else if (contentLength > 50) baseWidth = 2;
        
        // 工具使用增加宽度
        if (message.getType().toString() === 'assistant') {
            const assistantMessage = message as any;
            if (assistantMessage.getToolUses && assistantMessage.getToolUses().length > 0) {
                baseWidth += Math.min(assistantMessage.getToolUses().length, 2);
            }
        }
        
        // 代码块增加宽度
        const codeBlockCount = (message.getContent().match(/```/g) || []).length / 2;
        if (codeBlockCount > 0) {
            baseWidth += Math.min(Math.ceil(codeBlockCount), 2);
        }
        
        return Math.max(1, Math.min(baseWidth, 5));
    }

    /**
     * 确定消息块类型
     */
    static determineType(message: Message): MessageBlockType {
        if (message.getType().toString() === 'user') {
            return MessageBlockType.USER;
        } else if (message.getType().toString() === 'assistant') {
            // 如果主要是工具使用，标记为工具类型
            const assistantMessage = message as any;
            if (assistantMessage.getToolUses && 
                assistantMessage.getToolUses().length > 0 && 
                message.getContent().trim().length < 100) {
                return MessageBlockType.TOOL_USE;
            }
            return MessageBlockType.ASSISTANT;
        }
        
        return MessageBlockType.ASSISTANT; // 默认
    }

    /**
     * 检测是否为关键点消息
     * Phase 1 暂时返回 false，Phase 2 实现智能检测
     */
    static isKeyPoint(message: Message, index: number): boolean {
        // Phase 1: 基础关键点检测
        
        // 第一个消息总是关键点
        if (index === 0) return true;
        
        // 长消息可能是关键点
        if (message.getContent().length > 1000) return true;
        
        // 包含多个工具交互的消息
        if (message.getType().toString() === 'assistant') {
            const assistantMessage = message as any;
            if (assistantMessage.getToolUses && assistantMessage.getToolUses().length >= 3) {
                return true;
            }
        }
        
        // 包含代码块的消息
        const codeBlockCount = (message.getContent().match(/```/g) || []).length / 2;
        if (codeBlockCount >= 2) return true;
        
        // 错误或调试相关的消息
        const errorKeywords = ['error', 'bug', 'fix', 'debug', 'problem'];
        const hasErrorContent = errorKeywords.some(keyword => 
            message.getContent().toLowerCase().includes(keyword)
        );
        if (hasErrorContent) return true;
        
        return false;
    }

    /**
     * 生成消息预览文本
     * Phase 1 提供基础实现，Phase 3 增强
     */
    static generatePreview(message: Message): string {
        let preview = message.getContent().trim();
        
        // 移除代码块，简化预览
        preview = preview.replace(/```[\s\S]*?```/g, '[Code]');
        
        // 截断长文本
        if (preview.length > 100) {
            preview = preview.substring(0, 100) + '...';
        }
        
        // 添加工具使用信息
        if (message.getType().toString() === 'assistant') {
            const assistantMessage = message as any;
            if (assistantMessage.getToolUses && assistantMessage.getToolUses().length > 0) {
                const toolUses = assistantMessage.getToolUses();
                const toolNames = toolUses.map((t: any) => t.name).slice(0, 2);
                const toolSummary = toolNames.join(', ');
                const moreTools = toolUses.length > 2 ? ` +${toolUses.length - 2}` : '';
                preview += ` [Tools: ${toolSummary}${moreTools}]`;
            }
        }
        
        return preview;
    }

    /**
     * 从消息数组生成消息块数组
     */
    static generateMessageBlocks(messages: readonly Message[]): MessageBlock[] {
        return messages.map((message, index) => ({
            messageIndex: index,
            width: this.calculateWidth(message),
            type: this.determineType(message),
            isKeyPoint: this.isKeyPoint(message, index),
            preview: this.generatePreview(message)
        }));
    }

    /**
     * 计算时间轴总宽度
     */
    static calculateTotalWidth(blocks: MessageBlock[]): number {
        return blocks.reduce((total, block) => total + block.width, 0);
    }

    /**
     * 计算当前位置在时间轴上的位置
     */
    static calculateCurrentPosition(blocks: MessageBlock[], currentIndex: number): number {
        if (currentIndex < 0 || currentIndex >= blocks.length) {
            return 0;
        }
        
        let position = 0;
        for (let i = 0; i < currentIndex; i++) {
            position += blocks[i].width;
        }
        
        // 添加当前块的一半宽度，使指针指向块的中间
        position += blocks[currentIndex].width / 2;
        
        return position;
    }
}

/**
 * 时间轴数据构建器
 */
export class TimelineDataBuilder {
    /**
     * 从消息数组构建时间轴数据
     */
    static build(messages: readonly Message[], currentMessageIndex: number): TimelineData {
        const messageBlocks = MessageBlockCalculator.generateMessageBlocks(messages);
        const totalWidth = MessageBlockCalculator.calculateTotalWidth(messageBlocks);
        const currentPosition = MessageBlockCalculator.calculateCurrentPosition(messageBlocks, currentMessageIndex);
        
        return {
            messageBlocks,
            totalWidth,
            currentPosition
        };
    }
}