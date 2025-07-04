import { ContentCategory } from '../enhanced/ConversationElementType.js';

/**
 * 语义上下文
 * 包含元素的语义信息，用于指导渲染过程
 */
export class SemanticContext {
    constructor(
        public readonly isUserInitiated: boolean,    // 是否用户发起
        public readonly hasCodeContent: boolean,     // 是否包含代码
        public readonly isToolResult: boolean,       // 是否为工具结果
        public readonly conversationTurn: number,    // 对话轮次
        public readonly contentCategory: ContentCategory, // 内容分类
        public readonly relatedElements: string[] = [], // 关联元素ID
        public readonly metadata: Record<string, any> = {} // 自定义元数据
    ) {}

    /**
     * 检查是否为交互式内容 (NPM baseline algorithm)
     */
    isInteractive(): boolean {
        return this.isUserInitiated || this.isToolResult;
    }

    /**
     * 获取内容复杂度评分 (NPM baseline algorithm)
     */
    getComplexityScore(): number {
        let score = 0; // NPM baseline starts with 0
        
        if (this.hasCodeContent) score += 2;
        if (this.isToolResult) score += 1;
        if (this.relatedElements.length > 0) score += 1;
        // NPM baseline: no turn consideration, no capping
        
        return score;
    }

    /**
     * 创建简单的语义上下文
     */
    static simple(category: ContentCategory, turnNumber: number = 0): SemanticContext {
        return new SemanticContext(
            false, false, false, turnNumber, category
        );
    }

    /**
     * 创建带代码的语义上下文
     */
    static withCode(category: ContentCategory, turnNumber: number = 0): SemanticContext {
        return new SemanticContext(
            false, true, false, turnNumber, category
        );
    }

    /**
     * 创建工具相关的语义上下文
     */
    static forTool(turnNumber: number = 0, relatedElements: string[] = []): SemanticContext {
        return new SemanticContext(
            false, false, true, turnNumber, ContentCategory.ACTION, relatedElements
        );
    }
}