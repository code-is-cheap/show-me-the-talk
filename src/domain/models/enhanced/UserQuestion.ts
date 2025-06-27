import { ConversationElement } from './ConversationElement.js';
import { ConversationElementType, ContentImportance, ContentCategory } from './ConversationElementType.js';
import { QuestionComplexity, QuestionIntent, QuestionType } from './QuestionTypes.js';
import { SemanticContext } from '../rendering/SemanticContext.js';
import { RenderableContent } from '../rendering/RenderableContent.js';
import { ConversationRenderVisitor } from '../rendering/ConversationRenderVisitor.js';

/**
 * 用户问题领域实体
 * 表示用户在对话中提出的问题或请求
 */
export class UserQuestion extends ConversationElement {
    constructor(
        id: string,
        timestamp: Date,
        public readonly content: string,
        public readonly isFollowUp: boolean = false, // 是否为跟进问题
        public readonly previousQuestionId?: string, // 前一个问题ID
        public readonly complexity: QuestionComplexity = QuestionComplexity.MODERATE,
        public readonly intent: QuestionIntent = QuestionIntent.GENERAL,
        turnNumber: number = 1
    ) {
        super(id, timestamp, ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, turnNumber);
    }

    /**
     * 访问者模式实现
     */
    accept(visitor: ConversationRenderVisitor): RenderableContent {
        return visitor.visitUserQuestion(this);
    }

    /**
     * 获取语义上下文
     */
    getSemanticContext(): SemanticContext {
        return new SemanticContext(
            true, // 用户发起
            this.hasCodeContent(),
            false, // 不是工具结果
            this.turnNumber,
            ContentCategory.QUESTION,
            this.previousQuestionId ? [this.previousQuestionId] : []
        );
    }

    /**
     * 获取内容摘要
     */
    getSummary(): string {
        const preview = this.content.length > 80 
            ? this.content.substring(0, 80) + '...'
            : this.content;
        return `${this.getQuestionType()}: ${preview}`;
    }

    /**
     * 检查是否包含特定类型的内容
     */
    hasContentType(type: string): boolean {
        switch (type) {
            case 'code':
                return this.hasCodeContent();
            case 'question':
                return true;
            case 'followup':
                return this.isFollowUp;
            default:
                return false;
        }
    }

    /**
     * 领域方法：判断问题类型
     */
    getQuestionType(): QuestionType {
        const content = this.content.toLowerCase();

        if (this.isDebuggingQuestion()) return 'debug';
        if (this.isImplementationQuestion()) return 'implement';
        if (this.isHowToQuestion()) return 'how-to';
        if (this.isWhatIsQuestion()) return 'what-is';
        if (this.isWhyQuestion()) return 'why';
        if (this.isExplanationQuestion()) return 'explain';
        if (this.isComparisonQuestion()) return 'compare';
        if (this.isReviewQuestion()) return 'review';

        return 'explain'; // 默认类型
    }

    /**
     * 检查是否为调试问题
     */
    private isDebuggingQuestion(): boolean {
        const debugKeywords = [
            'error', 'bug', 'fix', 'debug', 'broken', 'not working',
            'issue', 'problem', 'wrong', 'fail', 'crash'
        ];
        return this.getQuestionTypeIndicator(debugKeywords);
    }

    /**
     * 检查是否为实现问题
     */
    private isImplementationQuestion(): boolean {
        const implementKeywords = [
            'implement', 'create', 'build', 'make', 'develop',
            'add', 'write', 'code', 'program'
        ];
        return this.getQuestionTypeIndicator(implementKeywords);
    }

    /**
     * 检查是否为如何做问题
     */
    private isHowToQuestion(): boolean {
        const content = this.content.toLowerCase();
        return content.includes('how to') || content.includes('how can') || 
               content.includes('how do') || content.includes('how should');
    }

    /**
     * 检查是否为定义问题
     */
    private isWhatIsQuestion(): boolean {
        const content = this.content.toLowerCase();
        return content.includes('what is') || content.includes('what are') ||
               content.includes('what does') || content.includes('define');
    }

    /**
     * 检查是否为原因问题
     */
    private isWhyQuestion(): boolean {
        const content = this.content.toLowerCase();
        return content.includes('why') || content.includes('reason') ||
               content.includes('because') || content.includes('cause');
    }

    /**
     * 检查是否为解释问题
     */
    private isExplanationQuestion(): boolean {
        const explainKeywords = [
            'explain', 'describe', 'tell me about', 'elaborate',
            'clarify', 'detail', 'breakdown'
        ];
        return this.getQuestionTypeIndicator(explainKeywords);
    }

    /**
     * 检查是否为比较问题
     */
    private isComparisonQuestion(): boolean {
        const compareKeywords = [
            'compare', 'difference', 'vs', 'versus', 'better',
            'worse', 'alternative', 'option'
        ];
        return this.getQuestionTypeIndicator(compareKeywords);
    }

    /**
     * 检查是否为审查问题
     */
    private isReviewQuestion(): boolean {
        const reviewKeywords = [
            'review', 'check', 'look at', 'examine', 'analyze',
            'feedback', 'opinion', 'thoughts'
        ];
        return this.getQuestionTypeIndicator(reviewKeywords);
    }

    /**
     * 检查是否包含代码内容
     */
    private hasCodeContent(): boolean {
        const codeIndicators = ['```', '`', 'function', 'class', 'var ', 'let ', 'const '];
        return codeIndicators.some(indicator => this.content.includes(indicator));
    }

    /**
     * 获取问题类型指示器
     */
    private getQuestionTypeIndicator(keywords: string[]): boolean {
        const content = this.content.toLowerCase();
        return keywords.some(keyword => content.includes(keyword));
    }

    /**
     * 计算问题复杂度评分
     */
    getComplexityScore(): number {
        let score = 1;
        
        // 基于内容长度
        if (this.content.length > 500) score += 2;
        else if (this.content.length > 200) score += 1;
        
        // 基于代码内容
        if (this.hasCodeContent()) score += 1;
        
        // 基于是否为跟进问题
        if (this.isFollowUp) score += 1;
        
        // 基于问题类型
        const questionType = this.getQuestionType();
        if (['implement', 'debug'].includes(questionType)) score += 1;
        
        return Math.min(score, 5);
    }

    /**
     * 检查是否为多部分问题
     */
    isMultiPart(): boolean {
        const multiPartIndicators = ['also', 'additionally', 'furthermore', '1.', '2.', '3.'];
        return multiPartIndicators.some(indicator => this.content.includes(indicator));
    }

    /**
     * 提取问题的关键词
     */
    extractKeywords(): string[] {
        const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'with', 'for'];
        const words = this.content.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.includes(word));
        
        return [...new Set(words)].slice(0, 10);
    }

    /**
     * 估算回答所需时间（分钟）
     */
    estimateAnswerTime(): number {
        let time = 2; // 基础时间
        
        const complexity = this.getComplexityScore();
        time += complexity * 2;
        
        if (this.hasCodeContent()) time += 3;
        if (this.getQuestionType() === 'implement') time += 5;
        if (this.getQuestionType() === 'debug') time += 3;
        
        return Math.min(time, 30);
    }
}