import { ConversationElement } from './ConversationElement.js';
import { ConversationElementType, ContentImportance, ContentCategory } from './ConversationElementType.js';
import { SemanticContext } from '../rendering/SemanticContext.js';
import { RenderableContent } from '../rendering/RenderableContent.js';
import { ConversationRenderVisitor } from '../rendering/ConversationRenderVisitor.js';

/**
 * 代码用途类型
 */
export type CodePurpose = 'example' | 'solution' | 'fix' | 'refactor' | 'test' | 'config';

/**
 * 代码块领域实体
 * 表示对话中的代码片段
 */
export class CodeBlock extends ConversationElement {
    constructor(
        id: string,
        timestamp: Date,
        public readonly language: string,
        public readonly content: string,
        public readonly filename?: string, // 关联文件名
        public readonly lineNumbers?: {
            start: number;
            end: number;
        },
        public readonly isPartial: boolean = false, // 是否为部分代码
        public readonly context?: string, // 代码上下文说明
        turnNumber: number = 1
    ) {
        super(id, timestamp, ConversationElementType.CODE_BLOCK, ContentImportance.SECONDARY, turnNumber);
    }

    /**
     * 访问者模式实现
     */
    accept(visitor: ConversationRenderVisitor): RenderableContent {
        return visitor.visitCodeBlock(this);
    }

    /**
     * 获取语义上下文
     */
    getSemanticContext(): SemanticContext {
        return new SemanticContext(
            false, // 不是用户发起
            true, // 包含代码
            false, // 不是工具结果
            this.turnNumber,
            ContentCategory.CODE,
            [],
            {
                language: this.language,
                filename: this.filename,
                lineCount: this.getLineCount(),
                purpose: this.getCodePurpose()
            }
        );
    }

    /**
     * 获取内容摘要
     */
    getSummary(): string {
        const purpose = this.getCodePurpose();
        const lineCount = this.getLineCount();
        const preview = this.getPreview(3);
        
        return `${this.language} ${purpose} (${lineCount} lines): ${preview}`;
    }

    /**
     * 检查是否包含特定类型的内容
     */
    hasContentType(type: string): boolean {
        switch (type) {
            case 'code':
                return true;
            case 'executable':
                return this.isExecutableCode();
            case 'test':
                return this.isTestCode();
            case 'config':
                return this.isConfigurationCode();
            case 'documentation':
                return this.hasDocumentation();
            default:
                return false;
        }
    }

    /**
     * 领域方法：获取代码用途
     */
    getCodePurpose(): CodePurpose {
        if (this.isTestCode()) return 'test';
        if (this.isConfigurationCode()) return 'config';
        if (this.isFixCode()) return 'fix';
        if (this.isRefactorCode()) return 'refactor';
        if (this.isExampleCode()) return 'example';
        return 'solution';
    }

    /**
     * 领域方法：计算代码复杂度
     */
    getComplexityScore(): number {
        let score = 1;
        
        // 基于语言复杂度
        score += this.getLanguageComplexity();
        
        // 基于代码长度
        const lineCount = this.getLineCount();
        if (lineCount > 100) score += 3;
        else if (lineCount > 50) score += 2;
        else if (lineCount > 20) score += 1;
        
        // 基于结构复杂度
        score += this.analyzeStructureComplexity();
        
        return Math.min(score, 5);
    }

    /**
     * 获取代码行数
     */
    getLineCount(): number {
        if (this.lineNumbers) {
            return this.lineNumbers.end - this.lineNumbers.start + 1;
        }
        return this.content.split('\n').length;
    }

    /**
     * 检查是否为可执行代码
     */
    isExecutableCode(): boolean {
        const executableLanguages = [
            'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'c',
            'go', 'rust', 'php', 'ruby', 'scala', 'kotlin'
        ];
        return executableLanguages.includes(this.language.toLowerCase());
    }

    /**
     * 检查是否为测试代码
     */
    isTestCode(): boolean {
        const testIndicators = [
            'test', 'spec', 'describe', 'it(', 'expect', 'assert',
            'TestCase', 'unittest', 'pytest', 'jest'
        ];
        return testIndicators.some(indicator => this.content.includes(indicator));
    }

    /**
     * 检查是否为配置代码
     */
    isConfigurationCode(): boolean {
        const configLanguages = ['json', 'yaml', 'yml', 'toml', 'ini', 'xml'];
        const configIndicators = ['config', 'settings', 'package.json', 'tsconfig'];
        
        return configLanguages.includes(this.language.toLowerCase()) ||
               configIndicators.some(indicator => 
                   this.filename?.toLowerCase().includes(indicator) ||
                   this.content.includes(indicator)
               );
    }

    /**
     * 检查是否包含文档
     */
    hasDocumentation(): boolean {
        const docIndicators = ['/**', '///', '"""', "'''", '@param', '@return', '@description'];
        return docIndicators.some(indicator => this.content.includes(indicator));
    }

    /**
     * 检查是否为完整代码
     */
    isCompleteCode(): boolean {
        if (this.isPartial) return false;
        
        // 基于语言的完整性检查
        switch (this.language.toLowerCase()) {
            case 'javascript':
            case 'typescript':
                return this.content.includes('{') && this.content.includes('}');
            case 'python':
                return this.content.includes(':') || this.content.includes('def ');
            case 'java':
            case 'csharp':
                return this.content.includes('class ') || this.content.includes('public ');
            default:
                return !this.content.includes('...');
        }
    }

    /**
     * 获取语言复杂度评分
     */
    private getLanguageComplexity(): number {
        const complexityMap: Record<string, number> = {
            'assembly': 4,
            'cpp': 3,
            'rust': 3,
            'haskell': 3,
            'scala': 3,
            'java': 2,
            'csharp': 2,
            'typescript': 2,
            'javascript': 1,
            'python': 1,
            'go': 1,
            'ruby': 1,
            'php': 1,
            'html': 0,
            'css': 0,
            'json': 0,
            'yaml': 0
        };
        
        return complexityMap[this.language.toLowerCase()] || 1;
    }

    /**
     * 分析代码结构复杂度
     */
    private analyzeStructureComplexity(): number {
        let complexity = 0;
        
        // 嵌套级别
        complexity += this.calculateMaxNesting();
        
        // 函数/方法数量
        const functionCount = (this.content.match(/function|def |class |method/g) || []).length;
        complexity += Math.min(functionCount, 3);
        
        // 条件语句数量
        const conditionalCount = (this.content.match(/if|else|switch|case|while|for/g) || []).length;
        complexity += Math.min(conditionalCount, 2);
        
        return Math.min(complexity, 3);
    }

    /**
     * 计算最大嵌套级别
     */
    private calculateMaxNesting(): number {
        let maxNesting = 0;
        let currentNesting = 0;
        
        for (const char of this.content) {
            if (char === '{' || char === '(' || char === '[') {
                currentNesting++;
                maxNesting = Math.max(maxNesting, currentNesting);
            } else if (char === '}' || char === ')' || char === ']') {
                currentNesting--;
            }
        }
        
        return Math.min(maxNesting, 3);
    }

    /**
     * 检查是否为修复代码
     */
    private isFixCode(): boolean {
        return this.getCodePurposeIndicator(['fix', 'bug', 'error', 'correction']);
    }

    /**
     * 检查是否为重构代码
     */
    private isRefactorCode(): boolean {
        return this.getCodePurposeIndicator(['refactor', 'improve', 'optimize', 'clean']);
    }

    /**
     * 检查是否为示例代码
     */
    private isExampleCode(): boolean {
        return this.getCodePurposeIndicator(['example', 'demo', 'sample', 'tutorial']);
    }

    /**
     * 获取代码用途指示器
     */
    private getCodePurposeIndicator(keywords: string[]): boolean {
        const contextText = (this.context || '').toLowerCase();
        const contentText = this.content.toLowerCase();
        
        return keywords.some(keyword => 
            contextText.includes(keyword) || contentText.includes(keyword)
        );
    }

    /**
     * 获取代码预览（用于摘要显示）
     */
    getPreview(maxLines: number = 5): string {
        const lines = this.content.split('\n');
        const previewLines = lines.slice(0, maxLines);
        
        if (lines.length > maxLines) {
            previewLines.push('...');
        }
        
        return previewLines.join(' ').replace(/\s+/g, ' ').trim();
    }

    /**
     * 估算阅读时间（分钟）
     */
    estimateReadingTime(): number {
        const lineCount = this.getLineCount();
        const complexity = this.getComplexityScore();
        
        // 基础阅读时间：每行30秒
        let time = lineCount * 0.5;
        
        // 复杂度调整
        time *= (1 + complexity * 0.2);
        
        return Math.max(Math.ceil(time), 1);
    }

    /**
     * 检查代码语法有效性（简单检查）
     */
    isValidSyntax(): boolean {
        // 基本的语法检查
        const brackets = this.content.match(/[{}()\[\]]/g) || [];
        const openBrackets = brackets.filter(b => ['{', '(', '['].includes(b)).length;
        const closeBrackets = brackets.filter(b => ['}', ')', ']'].includes(b)).length;
        
        // 括号匹配检查
        return openBrackets === closeBrackets;
    }
}