import { ConversationElementType, ContentImportance } from './ConversationElementType.js';
import { SemanticContext } from '../rendering/SemanticContext.js';
import { RenderableContent } from '../rendering/RenderableContent.js';
import { ConversationRenderVisitor } from '../rendering/ConversationRenderVisitor.js';

/**
 * 对话元素抽象基类
 * 所有对话元素的基础抽象，定义了通用的行为和属性
 */
export abstract class ConversationElement {
    constructor(
        public readonly id: string,
        public readonly timestamp: Date,
        public readonly type: ConversationElementType,
        public readonly importance: ContentImportance,
        public readonly turnNumber: number = 1
    ) {}

    /**
     * 访问者模式核心方法
     * 允许不同的渲染器处理这个元素
     */
    abstract accept(visitor: ConversationRenderVisitor): RenderableContent;

    /**
     * 获取语义上下文
     * 提供元素的语义信息用于渲染决策
     */
    abstract getSemanticContext(): SemanticContext;

    /**
     * 获取内容摘要
     * 用于列表显示和快速预览
     */
    abstract getSummary(): string;

    /**
     * 检查是否包含特定类型的内容
     * 用于过滤和分类
     */
    abstract hasContentType(type: string): boolean;

    /**
     * 检查是否为主要内容
     */
    isPrimary(): boolean {
        return this.importance === ContentImportance.PRIMARY;
    }

    /**
     * 检查是否为次要内容
     */
    isSecondary(): boolean {
        return this.importance === ContentImportance.SECONDARY;
    }

    /**
     * 检查是否为三级内容
     */
    isTertiary(): boolean {
        return this.importance === ContentImportance.TERTIARY;
    }

    /**
     * 获取元素的唯一标识符
     */
    getUniqueId(): string {
        return `${this.type}-${this.id}-${this.turnNumber}`;
    }

    /**
     * 比较两个元素的时间顺序
     */
    compareTo(other: ConversationElement): number {
        return this.timestamp.getTime() - other.timestamp.getTime();
    }

    /**
     * 检查是否在指定时间范围内
     */
    isWithinTimeRange(startTime?: Date, endTime?: Date): boolean {
        if (startTime && this.timestamp < startTime) return false;
        if (endTime && this.timestamp > endTime) return false;
        return true;
    }

    /**
     * 转换为JSON表示（用于序列化）
     */
    toJSON(): Record<string, any> {
        return {
            id: this.id,
            timestamp: this.timestamp.toISOString(),
            type: this.type,
            importance: this.importance,
            turnNumber: this.turnNumber,
            summary: this.getSummary()
        };
    }
}