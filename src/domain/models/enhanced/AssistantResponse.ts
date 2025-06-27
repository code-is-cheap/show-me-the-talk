import { ConversationElement } from './ConversationElement.js';
import { ConversationElementType, ContentImportance, ContentCategory } from './ConversationElementType.js';
import { ResponseType, TokenUsage, ToolUse } from './ResponseTypes.js';
import { SemanticContext } from '../rendering/SemanticContext.js';
import { RenderableContent } from '../rendering/RenderableContent.js';
import { ConversationRenderVisitor } from '../rendering/ConversationRenderVisitor.js';
import { CodeBlock } from './CodeBlock.js';

/**
 * 助手回答领域实体
 * 表示AI助手对用户问题的回答
 */
export class AssistantResponse extends ConversationElement {
    constructor(
        id: string,
        timestamp: Date,
        public readonly textContent: string,
        public readonly codeBlocks: CodeBlock[],
        public readonly toolUses: ToolUse[],
        public readonly model: string,
        public readonly usage: TokenUsage,
        public readonly reasoning?: string, // 推理过程
        public readonly confidence?: number, // 置信度 (0-1)
        turnNumber: number = 1
    ) {
        super(id, timestamp, ConversationElementType.ASSISTANT_RESPONSE, ContentImportance.PRIMARY, turnNumber);
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
            false, // 不是用户发起
            this.hasCodeContent(),
            this.toolUses.length > 0, // 有工具使用即为工具结果
            this.turnNumber,
            ContentCategory.ANSWER,
            this.codeBlocks.map(cb => cb.id).concat(this.toolUses.map(tu => tu.id)),
            {
                model: this.model,
                tokenUsage: this.usage.toJSON(),
                responseType: this.getResponseType(),
                confidence: this.confidence
            }
        );
    }

    /**
     * 获取内容摘要
     */
    getSummary(): string {
        const responseType = this.getResponseType();
        const wordCount = this.getWordCount();
        const hasCode = this.hasCodeContent() ? ' (with code)' : '';
        const hasTools = this.toolUses.length > 0 ? ` (${this.toolUses.length} tools)` : '';
        
        const preview = this.textContent.length > 80 
            ? this.textContent.substring(0, 80) + '...'
            : this.textContent;
            
        return `${responseType}: ${preview} [${wordCount} words${hasCode}${hasTools}]`;
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
            case 'explanation':
                return this.getResponseType() === 'explanation';
            case 'solution':
                return this.getResponseType() === 'code-solution';
            case 'guidance':
                return this.getResponseType() === 'guidance';
            default:
                return false;
        }
    }

    /**
     * 领域方法：获取响应类型
     */
    getResponseType(): ResponseType {
        const content = this.textContent.toLowerCase();
        
        if (this.isCorrectionResponse()) return 'correction';
        if (this.isConfirmationResponse()) return 'confirmation';
        if (this.isGuidanceResponse()) return 'guidance';
        
        if (this.codeBlocks.length > 0) {
            return this.textContent.length > 500 ? 'mixed' : 'code-solution';
        }
        
        if (this.toolUses.length > 0) {
            return 'analysis';
        }
        
        return 'explanation';
    }

    /**
     * 领域方法：计算内容复杂度评分
     */
    getComplexityScore(): number {
        let score = 1;
        
        // 基于文本长度
        const wordCount = this.getWordCount();
        if (wordCount > 1000) score += 3;
        else if (wordCount > 500) score += 2;
        else if (wordCount > 200) score += 1;
        
        // 基于代码块数量和复杂度
        if (this.codeBlocks.length > 0) {
            score += Math.min(this.codeBlocks.length, 2);
            const avgCodeComplexity = this.codeBlocks.reduce((sum, cb) => sum + cb.getComplexityScore(), 0) / this.codeBlocks.length;
            score += Math.ceil(avgCodeComplexity / 2);
        }
        
        // 基于工具使用
        if (this.toolUses.length > 0) {
            score += Math.min(this.toolUses.length, 2);
            if (this.hasCriticalOperations()) score += 1;
        }
        
        // 基于模型复杂度
        if (this.model.includes('gpt-4') || this.model.includes('claude')) {
            score += 1;
        }
        
        return Math.min(score, 5);
    }

    /**
     * 检查是否包含代码内容
     */
    hasCodeContent(): boolean {
        return this.codeBlocks.length > 0 || 
               this.textContent.includes('```') ||
               this.textContent.includes('`');
    }

    /**
     * 获取单词数量
     */
    private getWordCount(): number {
        return this.textContent.trim().split(/\s+/).length;
    }

    /**
     * 检查是否为纠正类型响应
     */
    private isCorrectionResponse(): boolean {
        return this.getResponseTypeIndicator(['incorrect', 'wrong', 'mistake', 'correct', 'fix']);
    }

    /**
     * 检查是否为确认类型响应
     */
    private isConfirmationResponse(): boolean {
        return this.getResponseTypeIndicator(['yes', 'correct', 'exactly', 'right', 'confirm']);
    }

    /**
     * 检查是否为指导类型响应
     */
    private isGuidanceResponse(): boolean {
        return this.getResponseTypeIndicator(['should', 'recommend', 'suggest', 'consider', 'try']);
    }

    /**
     * 获取响应类型指示器
     */
    private getResponseTypeIndicator(keywords: string[]): boolean {
        const content = this.textContent.toLowerCase();
        return keywords.some(keyword => content.includes(keyword));
    }

    /**
     * 获取主要编程语言
     */
    getPrimaryLanguage(): string | null {
        if (this.codeBlocks.length === 0) return null;
        
        const languages = this.codeBlocks.map(cb => cb.language);
        const languageCount = languages.reduce((acc, lang) => {
            acc[lang] = (acc[lang] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(languageCount)
            .sort(([, a], [, b]) => b - a)[0][0];
    }

    /**
     * 获取工具使用统计
     */
    getToolUsageStats(): Record<string, number> {
        return this.toolUses.reduce((stats, tool) => {
            const category = tool.getToolCategory();
            stats[category] = (stats[category] || 0) + 1;
            return stats;
        }, {} as Record<string, number>);
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
        let score = 3; // 基础分数
        
        // 基于token使用效率
        const efficiency = this.usage.getCostEfficiency();
        if (efficiency > 2) score += 1;
        else if (efficiency < 0.5) score -= 1;
        
        // 基于置信度
        if (this.confidence !== undefined) {
            if (this.confidence > 0.8) score += 1;
            else if (this.confidence < 0.5) score -= 1;
        }
        
        // 基于完整性
        if (this.isComplete()) score += 1;
        
        // 基于工具使用成功率
        if (this.toolUses.length > 0) {
            const successRate = this.toolUses.filter(t => t.isSuccessful).length / this.toolUses.length;
            if (successRate > 0.8) score += 1;
            else if (successRate < 0.5) score -= 1;
        }
        
        return Math.max(1, Math.min(5, score));
    }

    /**
     * 估算阅读时间（分钟）
     */
    estimateReadingTime(): number {
        const wordCount = this.getWordCount();
        const wordsPerMinute = 200;
        
        let time = wordCount / wordsPerMinute;
        
        // 代码块阅读时间
        time += this.codeBlocks.reduce((total, cb) => total + cb.estimateReadingTime(), 0);
        
        // 工具结果查看时间
        time += this.toolUses.length * 0.5;
        
        return Math.max(Math.ceil(time), 1);
    }

    /**
     * 检查响应完整性
     */
    isComplete(): boolean {
        // 检查是否有明显的未完成标记
        const incompleteIndicators = ['...', '[continued]', '[truncated]', 'to be continued'];
        const hasIncompleteMarkers = incompleteIndicators.some(indicator => 
            this.textContent.toLowerCase().includes(indicator)
        );
        
        if (hasIncompleteMarkers) return false;
        
        // 检查是否有失败的工具操作且没有解释
        const hasFailedToolsWithoutExplanation = this.toolUses.some(tool => 
            !tool.isSuccessful && !this.textContent.toLowerCase().includes('error')
        );
        
        return !hasFailedToolsWithoutExplanation;
    }

    /**
     * 获取响应摘要（用于预览）
     */
    getPreview(maxLength: number = 200): string {
        let preview = this.textContent;
        
        if (preview.length > maxLength) {
            preview = preview.substring(0, maxLength) + '...';
        }
        
        // 添加附加信息
        const extras = [];
        if (this.codeBlocks.length > 0) {
            extras.push(`${this.codeBlocks.length} code block${this.codeBlocks.length > 1 ? 's' : ''}`);
        }
        if (this.toolUses.length > 0) {
            extras.push(`${this.toolUses.length} tool use${this.toolUses.length > 1 ? 's' : ''}`);
        }
        
        if (extras.length > 0) {
            preview += ` [${extras.join(', ')}]`;
        }
        
        return preview;
    }
}

export { CodeBlock } from './CodeBlock.js';