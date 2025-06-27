import { ConversationElement } from './ConversationElement.js';
import { ConversationElementType, ContentImportance, ContentCategory } from './ConversationElementType.js';
import { QuestionComplexity, QuestionIntent } from './QuestionTypes.js';
import { SemanticContext } from '../rendering/SemanticContext.js';
import { RenderableContent } from '../rendering/RenderableContent.js';
import { ConversationRenderVisitor } from '../rendering/ConversationRenderVisitor.js';

/**
 * 用户问题领域实体
 * 表示用户在对话中提出的问题或请求
 */
export class UserQuestion extends ConversationElement {
    public readonly content: string;
    public readonly isFollowUp: boolean;
    public readonly previousQuestionId?: string;
    public readonly complexity: QuestionComplexity;
    public readonly intent: QuestionIntent;

    constructor(
        id: string,
        timestamp: Date,
        content: string,
        isFollowUp: boolean = false, // 是否为跟进问题
        previousQuestionId?: string, // 前一个问题ID
        complexity: QuestionComplexity = QuestionComplexity.SIMPLE,
        intent: QuestionIntent = QuestionIntent.GENERAL,
        turnNumber: number = 0
    ) {
        super(id, timestamp, ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, turnNumber);
        this.content = content;
        this.isFollowUp = isFollowUp;
        this.previousQuestionId = previousQuestionId;
        this.complexity = complexity;
        this.intent = intent;
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
            this.hasCodeContent(), // 是否包含代码
            false, // 非工具结果
            this.turnNumber, // 对话轮次
            ContentCategory.QUESTION, // 问题类型
            this.previousQuestionId ? [this.previousQuestionId] : [], // 关联元素
            {
                complexity: this.complexity,
                intent: this.intent,
                isFollowUp: this.isFollowUp,
                questionType: this.getQuestionType()
            }
        );
    }

    /**
     * 获取内容摘要
     */
    getSummary(): string {
        const maxLength = 100;
        const summary = this.content.length > maxLength
            ? this.content.substring(0, maxLength) + '...'
            : this.content;

        const prefix = this.isFollowUp ? '↳ ' : '';
        const typeIndicator = this.getQuestionTypeIndicator();
        return `${prefix}${typeIndicator} ${summary}`;
    }

    /**
     * 检查是否包含特定类型的内容
     */
    hasContentType(type: string): boolean {
        const content = this.content.toLowerCase();
        switch (type) {
            case 'code':
                return this.hasCodeContent();
            case 'question':
                return content.includes('?') || content.includes('how') || content.includes('what') || content.includes('why');
            case 'multiline':
                return this.content.includes('\n');
            case 'urgent':
                return content.includes('urgent') || content.includes('急') || content.includes('asap');
            case 'complex':
                return this.complexity === QuestionComplexity.COMPLEX;
            case 'follow-up':
                return this.isFollowUp;
            default:
                return false;
        }
    }

    /**
     * 领域方法：判断问题类型
     */
    getQuestionType(): string {
        const content = this.content.toLowerCase();

        // 按优先级匹配问题类型，优先级顺序很重要
        if (this.isDebuggingQuestion(content)) return 'debug';
        if (this.isReviewQuestion(content) && !this.isImplementationQuestion(content)) return 'review';
        if (this.isComparisonQuestion(content) && !this.isWhyQuestion(content)) return 'compare';
        if (this.isImplementationQuestion(content)) return 'implement';
        if (this.isHowToQuestion(content)) return 'how-to';
        if (this.isWhatIsQuestion(content)) return 'what-is';
        if (this.isWhyQuestion(content)) return 'why';
        if (this.isExplanationQuestion(content)) return 'explain';

        return 'how-to'; // 默认类型
    }

    /**
     * 检查是否为调试问题
     */
    isDebuggingQuestion(content: string): boolean {
        const debugKeywords = [
            'error', 'bug', 'issue', 'problem', 'fail', 'wrong', 'not work',
            '错误', '问题', '失败', '不工作', '报错'
        ];
        return debugKeywords.some(keyword => content.includes(keyword));
    }

    /**
     * 检查是否为实现问题
     */
    isImplementationQuestion(content: string): boolean {
        const implementKeywords = [
            'implement', 'create', 'build', 'develop'
        ];
        return implementKeywords.some(keyword => content.includes(keyword));
    }

    /**
     * 检查是否为如何做问题
     */
    isHowToQuestion(content: string): boolean {
        return content.includes('how to') ||
            content.includes('how can') ||
            content.includes('how do') ||
            content.includes('如何') ||
            content.includes('怎么');
    }

    /**
     * 检查是否为定义问题
     */
    isWhatIsQuestion(content: string): boolean {
        return content.includes('what is') ||
            content.includes('what are') ||
            content.includes('什么是') ||
            content.includes('什么叫');
    }

    /**
     * 检查是否为原因问题
     */
    isWhyQuestion(content: string): boolean {
        return content.includes('why') ||
            content.includes('because') ||
            content.includes('为什么') ||
            content.includes('原因');
    }

    /**
     * 检查是否为解释问题
     */
    isExplanationQuestion(content: string): boolean {
        const explainKeywords = [
            'explain', 'describe', 'tell me', 'clarify',
            '解释', '说明', '描述', '阐述'
        ];
        return explainKeywords.some(keyword => content.includes(keyword));
    }

    /**
     * 检查是否为比较问题
     */
    isComparisonQuestion(content: string): boolean {
        const compareKeywords = [
            'compare', 'difference', 'vs', 'versus', 'better',
            '比较', '区别', '对比', '差异'
        ];
        return compareKeywords.some(keyword => content.includes(keyword));
    }

    /**
     * 检查是否为审查问题
     */
    isReviewQuestion(content: string): boolean {
        const reviewKeywords = [
            'review', 'check', 'validate', 'verify', 'look at',
            '审查', '检查', '验证', '查看'
        ];
        return reviewKeywords.some(keyword => content.includes(keyword));
    }

    /**
     * 检查是否包含代码内容
     */
    hasCodeContent(): boolean {
        return /```|`/.test(this.content) ||
            this.content.includes('function') ||
            this.content.includes('class ') ||
            this.content.includes('import ') ||
            this.content.includes('export ');
    }

    /**
     * 获取问题类型指示器
     */
    getQuestionTypeIndicator(): string {
        const questionType = this.getQuestionType();
        const indicators: Record<string, string> = {
            'how-to': '🙋',
            'what-is': '🤔',
            'why': '❓',
            'debug': '🐛',
            'implement': '⚡',
            'explain': '📚',
            'compare': '⚖️',
            'review': '👀'
        };

        return indicators[questionType] || '💬';
    }

    /**
     * 计算问题复杂度评分
     */
    getComplexityScore(): number {
        let score = 0;

        // 基础复杂度
        switch (this.complexity) {
            case QuestionComplexity.COMPLEX:
                score += 3;
                break;
            case QuestionComplexity.MODERATE:
                score += 2;
                break;
            default:
                score += 1;
        }

        // 内容长度影响 (improved scaling for very long content)
        const wordCount = this.content.split(/\s+/).length;
        if (wordCount > 50) score += 1;
        if (wordCount >= 100) score += 1; // Include exactly 100 words
        if (wordCount > 500) score += 2;
        if (wordCount > 1000) score += 3;
        if (wordCount > 2000) score += 4;

        // 代码内容影响
        if (this.hasCodeContent()) score += 1;

        // 跟进问题通常更复杂
        if (this.isFollowUp) score += 1;

        return score;
    }

    /**
     * 检查是否为多部分问题
     */
    isMultiPart(): boolean {
        const separators = ['1.', '2.', '3.', 'a)', 'b)', 'c)', '第一', '第二', '其次', 'also', 'additionally', 'first', 'second'];
        return separators.some(sep => this.content.toLowerCase().includes(sep.toLowerCase()));
    }

    /**
     * 提取问题的关键词
     */
    extractKeywords(): string[] {
        // 支持多语言的关键词提取
        const content = this.content.toLowerCase();
        const commonWords = new Set([
            // English common words
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'can', 'may', 'might',
            // Chinese common words
            '的', '是', '在', '有', '我', '你', '他', '她', '它', '这', '那', '了', '么', '什么', '怎么'
        ]);

        // Use Unicode-aware regex for better international support
        const processedContent = content.replace(/[^\p{L}\p{N}\s]/gu, ' ');

        // Simple Chinese word segmentation
        const chineseSegmentation = (text: string): string[] => {
            const chineseWords: string[] = [];
            const chineseText = text.match(/[\u4e00-\u9fff]+/g) || [];

            chineseText.forEach(segment => {
                // Add meaningful bi-grams first (more likely to be complete words)
                for (let i = 0; i < segment.length - 1; i++) {
                    chineseWords.push(segment.substring(i, i + 2));
                }
                // Add single characters
                for (let i = 0; i < segment.length; i++) {
                    chineseWords.push(segment[i]);
                }
                // Add longer segments
                for (let i = 0; i < segment.length - 2; i++) {
                    chineseWords.push(segment.substring(i, i + 3));
                }
            });

            return chineseWords;
        };

        // Extract regular words
        const regularWords = processedContent
            .split(/\s+/)
            .filter(word => !/[\u4e00-\u9fff]/.test(word) && word.length > 2 && !commonWords.has(word));

        // Extract Chinese segments
        const chineseWords = chineseSegmentation(processedContent)
            .filter(word => word.length >= 1 && !commonWords.has(word));

        // Prioritize longer Chinese words and regular words, then shorter ones
        const sortedChineseWords = chineseWords.sort((a, b) => b.length - a.length);

        return [...regularWords, ...sortedChineseWords]
            .slice(0, 10); // 返回前10个关键词
    }

    /**
     * 估算回答所需时间（分钟）
     */
    estimateAnswerTime(): number {
        let timeMinutes = 1; // 基础时间

        // 根据复杂度调整
        switch (this.complexity) {
            case QuestionComplexity.COMPLEX:
                timeMinutes *= 3;
                break;
            case QuestionComplexity.MODERATE:
                timeMinutes *= 2;
                break;
        }

        // 根据问题类型调整
        const questionType = this.getQuestionType();
        if (questionType === 'implement' || questionType === 'debug') {
            timeMinutes *= 2;
        }

        // 根据内容长度调整
        const wordCount = this.content.split(/\s+/).length;
        if (wordCount > 100) {
            timeMinutes += Math.ceil(wordCount / 100);
        }

        return Math.max(1, Math.min(30, timeMinutes)); // 限制在1-30分钟
    }
}