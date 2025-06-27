import { ConversationElement } from './ConversationElement.js';
import { ConversationElementType, ContentImportance, ContentCategory } from './ConversationElementType.js';
import { SemanticContext } from '../rendering/SemanticContext.js';
import { RenderableContent } from '../rendering/RenderableContent.js';
import { ConversationRenderVisitor } from '../rendering/ConversationRenderVisitor.js';
import { CodeBlock } from './CodeBlock.js';

/**
 * Token usage interface for assistant responses
 */
export interface TokenUsage {
    input_tokens?: number;
    output_tokens?: number;
    toJSON(): Record<string, any>;
    isHighCost(): boolean;
}

/**
 * Tool use interface for assistant responses
 */
export interface ToolUse {
    id: string;
    getToolCategory(): string;
    isCriticalOperation(): boolean;
}

/**
 * 助手回答领域实体
 * 表示AI助手对用户问题的回答
 */
export class AssistantResponse extends ConversationElement {
    public readonly textContent: string;
    public readonly codeBlocks: CodeBlock[];
    public readonly toolUses: ToolUse[];
    public readonly model?: string;
    public readonly usage: TokenUsage;
    public readonly reasoning?: string;
    public readonly confidence?: number;

    constructor(
        id: string,
        timestamp: Date,
        textContent: string,
        codeBlocks: CodeBlock[],
        toolUses: ToolUse[],
        model?: string,
        usage?: TokenUsage,
        reasoning?: string, // 推理过程
        confidence?: number, // 置信度 (0-1)
        turnNumber: number = 0
    ) {
        super(id, timestamp, ConversationElementType.ASSISTANT_RESPONSE, ContentImportance.PRIMARY, turnNumber);
        this.textContent = textContent;
        this.codeBlocks = codeBlocks;
        this.toolUses = toolUses;
        this.model = model;
        this.usage = usage || { toJSON: () => ({}), isHighCost: () => false };
        this.reasoning = reasoning;
        this.confidence = confidence;
    }

    /**
     * 访问者模式实现
     */
    accept(visitor: ConversationRenderVisitor): RenderableContent {
        return visitor.visitAssistantResponse(this);
    }

    /**
     * 获取语义上下文
     */
    getSemanticContext(): SemanticContext {
        return new SemanticContext(
            false, // 非用户发起
            this.hasCodeContent(), // 是否包含代码
            false, // 非工具结果
            this.turnNumber, // 对话轮次
            ContentCategory.ANSWER, // 回答类型
            this.toolUses.map(tool => tool.id), // 关联工具
            {
                model: this.model,
                tokenUsage: this.usage.toJSON(),
                confidence: this.confidence,
                responseType: this.getResponseType(),
                complexityScore: this.getComplexityScore(),
                hasReasoning: Boolean(this.reasoning)
            }
        );
    }

    /**
     * 获取内容摘要
     */
    getSummary(): string {
        const wordCount = this.getWordCount();
        const codeBlockCount = this.codeBlocks.length;
        const toolCount = this.toolUses.length;

        let summary = `${this.textContent && this.textContent.includes('🚀') ? '🚀 ' : ''}${wordCount}词回答`;

        if (codeBlockCount > 0) summary += `, ${codeBlockCount}个代码块`;
        if (toolCount > 0) summary += `, ${toolCount}个工具调用`;

        // 添加响应类型指示
        const responseType = this.getResponseType();
        const typeIndicator = this.getResponseTypeIndicator(responseType);
        return `${typeIndicator} ${summary}`;
    }

    /**
     * 检查是否包含特定类型的内容
     */
    hasContentType(type: string): boolean {
        switch (type) {
            case 'code':
                return this.hasCodeContent();
            case 'tools':
                return this.toolUses.length > 0;
            case 'long':
                return this.textContent ? this.textContent.length > 1000 : false;
            case 'reasoning':
                return Boolean(this.reasoning);
            case 'confident':
                return this.confidence !== undefined && this.confidence > 0.8;
            case 'experimental':
                return this.confidence !== undefined && this.confidence < 0.5;
            case 'critical-tools':
                return this.toolUses.some(tool => tool.isCriticalOperation());
            case 'high-cost':
                return this.usage.isHighCost();
            default:
                const responseType = this.getResponseType();
                return type === responseType;
        }
    }

    /**
     * 领域方法：获取响应类型
     */
    getResponseType(): string {
        const hasCode = this.hasCodeContent();
        const hasTools = this.toolUses.length > 0;
        const textLength = this.textContent ? this.textContent.length : 0;
        const wordCount = this.getWordCount();

        // 检查是否为纠正类型
        if (this.isCorrectionResponse()) return 'correction';

        // 检查是否为确认类型
        if (this.isConfirmationResponse()) return 'confirmation';

        // 基于内容复杂度和工具使用判断
        if (hasCode && hasTools) return 'mixed';
        if (hasCode) return 'code-solution';
        if (hasTools) return 'analysis';
        if (wordCount > 200) return 'explanation';
        if (this.isGuidanceResponse()) return 'guidance';

        return 'explanation'; // 默认类型
    }

    /**
     * 领域方法：计算内容复杂度评分
     */
    getComplexityScore(): number {
        let score = 0;

        // 文本长度评分
        const wordCount = this.getWordCount();
        score += Math.min(Math.floor(wordCount / 50), 10);

        // 代码块评分
        score += this.codeBlocks.length * 2;

        // 工具使用评分
        score += this.toolUses.length * 1.5;

        // 推理过程评分
        if (this.reasoning) score += 3;

        // 多语言代码评分
        const uniqueLanguages = new Set(this.codeBlocks.map(block => block.language));
        if (uniqueLanguages.size > 1) score += 2;

        return Math.round(score);
    }

    /**
     * 检查是否包含代码内容
     */
    hasCodeContent(): boolean {
        return this.codeBlocks.length > 0 ||
            /```[\s\S]*?```/.test(this.textContent) ||
            /`[^`\n]+`/.test(this.textContent);
    }

    /**
     * 获取单词数量
     */
    getWordCount(): number {
        if (!this.textContent) return 0;
        return this.textContent.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * 检查是否为纠正类型响应
     */
    isCorrectionResponse(): boolean {
        if (!this.textContent) return false;

        const correctionKeywords = [
            'actually', 'correction', 'mistake', 'error', 'wrong', 'incorrect',
            '实际上', '纠正', '错误', '不对', '有误'
        ];

        const content = this.textContent.toLowerCase();
        return correctionKeywords.some(keyword => content.includes(keyword));
    }

    /**
     * 检查是否为确认类型响应
     */
    isConfirmationResponse(): boolean {
        const wordCount = this.getWordCount();
        if (wordCount > 50) return false; // 太长不太可能是确认

        if (!this.textContent) return false;

        const content = this.textContent.toLowerCase().trim();

        // Check for single character confirmations
        if (content.length === 1) {
            const singleCharConfirmations = ['y', 'k', '.', '✓'];
            return singleCharConfirmations.includes(content);
        }

        // Check for short confirmations
        if (wordCount <= 3) {
            const shortConfirmations = ['ok', 'okay', 'yep', 'yeah', 'sure', 'good', 'nice'];
            if (shortConfirmations.some(word => content.includes(word))) {
                return true;
            }
        }

        const confirmationKeywords = [
            'yes', 'correct', 'exactly', 'right', 'sure', 'of course',
            '是的', '对的', '正确', '确实', '当然'
        ];

        return confirmationKeywords.some(keyword => content.includes(keyword));
    }

    /**
     * 检查是否为指导类型响应
     */
    isGuidanceResponse(): boolean {
        if (!this.textContent) return false;

        const guidanceKeywords = [
            'should', 'recommend', 'suggest', 'consider', 'try', 'approach',
            '建议', '推荐', '应该', '可以尝试', '方法'
        ];

        const content = this.textContent.toLowerCase();
        return guidanceKeywords.some(keyword => content.includes(keyword));
    }

    /**
     * 获取响应类型指示器
     */
    getResponseTypeIndicator(responseType: string): string {
        const indicators: Record<string, string> = {
            'explanation': '📝',
            'code-solution': '💻',
            'guidance': '🎯',
            'analysis': '🔍',
            'mixed': '🎭',
            'correction': '✏️',
            'confirmation': '✅'
        };

        return indicators[responseType] || '💬';
    }

    /**
     * 获取主要编程语言
     */
    getPrimaryLanguage(): string | null {
        if (this.codeBlocks.length === 0) return null;

        // 统计语言使用频率
        const languageCounts = new Map<string, number>();
        for (const block of this.codeBlocks) {
            const count = languageCounts.get(block.language) || 0;
            languageCounts.set(block.language, count + 1);
        }

        // 返回使用最多的语言
        let maxCount = 0;
        let primaryLanguage: string | null = null;

        for (const [language, count] of languageCounts) {
            if (count > maxCount) {
                maxCount = count;
                primaryLanguage = language;
            }
        }

        return primaryLanguage;
    }

    /**
     * 获取工具使用统计
     */
    getToolUsageStats(): Record<string, number> {
        const stats: Record<string, number> = {};

        for (const toolUse of this.toolUses) {
            const category = toolUse.getToolCategory();
            stats[category] = (stats[category] || 0) + 1;
        }

        return stats;
    }

    /**
     * 检查是否包含关键操作
     */
    hasCriticalOperations(): boolean {
        return this.toolUses.some(tool => tool.isCriticalOperation());
    }

    /**
     * 获取响应质量评分
     */
    getQualityScore(): number {
        let score = 5; // 基础分

        // 长度评分
        const wordCount = this.getWordCount();
        if (wordCount < 10) score -= 2;
        else if (wordCount > 100) score += 1;
        else if (wordCount > 500) score += 2;

        // 代码质量评分
        if (this.codeBlocks.length > 0) score += 2;
        if (this.codeBlocks.length > 3) score += 1;

        // 工具使用评分
        if (this.toolUses.length > 0) score += 1;
        if (this.hasCriticalOperations()) score += 1;

        // 推理过程评分
        if (this.reasoning) score += 2;

        // 置信度评分
        if (this.confidence) {
            if (this.confidence > 0.8) score += 1;
            else if (this.confidence < 0.3) score -= 1;
        }

        return Math.max(1, Math.min(10, score)); // 限制在1-10之间
    }

    /**
     * 估算阅读时间（分钟）
     */
    estimateReadingTime(): number {
        const wordsPerMinute = 200; // 平均阅读速度
        const wordCount = this.getWordCount();

        // 代码块需要更多时间
        const codeReadingTime = this.codeBlocks.reduce((time, block) => {
            const codeLines = block.content.split('\n').length;
            return time + Math.ceil(codeLines / 10); // 每10行代码1分钟
        }, 0);

        const textReadingTime = Math.ceil(wordCount / wordsPerMinute);
        return Math.max(1, textReadingTime + codeReadingTime);
    }

    /**
     * 检查响应完整性
     */
    isComplete(): boolean {
        // 检查是否有未完成的标记
        const incompleteMarkers = [
            '...', '[continued]', '[truncated]', 'to be continued',
            '未完', '待续', '省略'
        ];

        if (!this.textContent) return true; // Consider empty content as complete

        const content = this.textContent.toLowerCase();
        return !incompleteMarkers.some(marker => content.includes(marker));
    }

    /**
     * 获取响应摘要（用于预览）
     */
    getPreview(maxLength: number = 150): string {
        const summary = this.textContent.replace(/\s+/g, ' ').trim();
        if (summary.length <= maxLength) return summary;
        return summary.substring(0, maxLength) + '...';
    }
}