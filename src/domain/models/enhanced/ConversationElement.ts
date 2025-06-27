import { ContentImportance } from './ConversationElementType.js';

/**
 * 对话元素抽象基类
 * 所有对话元素的基础抽象，定义了通用的行为和属性
 */
export class ConversationElement {
    public readonly id: string;
    public readonly timestamp: Date;
    public readonly type: string;
    public readonly importance: ContentImportance;
    public readonly turnNumber: number;

    constructor(
        id: string,
        timestamp: Date,
        type: string,
        importance: ContentImportance,
        turnNumber: number = 0
    ) {
        this.id = id;
        this.timestamp = timestamp;
        this.type = type;
        this.importance = importance;
        this.turnNumber = turnNumber;
    }

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
        if (this.turnNumber !== other.turnNumber) {
            return this.turnNumber - other.turnNumber;
        }
        return this.timestamp.getTime() - other.timestamp.getTime();
    }

    /**
     * 检查是否在指定时间范围内
     */
    isWithinTimeRange(startTime?: Date, endTime?: Date): boolean {
        if (startTime && this.timestamp < startTime) {
            return false;
        }
        if (endTime && this.timestamp > endTime) {
            return false;
        }
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
            summary: (this as any).getSummary?.(),
            semanticContext: (this as any).getSemanticContext?.()
        };
    }
}