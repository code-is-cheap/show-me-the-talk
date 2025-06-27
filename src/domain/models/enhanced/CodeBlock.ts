import { ConversationElement } from './ConversationElement.js';
import { ConversationElementType, ContentImportance, ContentCategory } from './ConversationElementType.js';
import { SemanticContext } from '../rendering/SemanticContext.js';
import { RenderableContent } from '../rendering/RenderableContent.js';
import { ConversationRenderVisitor } from '../rendering/ConversationRenderVisitor.js';

/**
 * 代码块领域实体
 * 表示对话中的代码片段
 */
export class CodeBlock extends ConversationElement {
    public readonly language: string;
    public readonly content: string;
    public readonly filename?: string;
    public readonly lineNumbers?: {
        start: number;
        end: number;
    };
    public readonly isPartial: boolean;
    public readonly context?: string;

    constructor(
        id: string,
        timestamp: Date,
        language: string,
        content: string,
        filename?: string, // 关联文件名
        lineNumbers?: { start: number; end: number },
        isPartial: boolean = false, // 是否为部分代码
        context?: string, // 代码上下文说明
        turnNumber: number = 0
    ) {
        super(id, timestamp, ConversationElementType.CODE_BLOCK, ContentImportance.SECONDARY, turnNumber);
        this.language = language;
        this.content = content;
        this.filename = filename;
        this.lineNumbers = lineNumbers;
        this.isPartial = isPartial;
        this.context = context;
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
            false, // 非用户发起
            true, // 包含代码内容
            false, // 非工具结果
            this.turnNumber, // 对话轮次
            ContentCategory.CODE, // 代码类型
            this.filename ? [this.filename] : [], // 关联文件
            {
                language: this.language,
                purpose: this.getCodePurpose(),
                isPartial: this.isPartial,
                complexity: this.getComplexityScore(),
                lineCount: this.getLineCount(),
                hasDocumentation: this.hasDocumentation()
            }
        );
    }

    /**
     * 获取内容摘要
     */
    getSummary(): string {
        const lineCount = this.getLineCount();
        const purpose = this.getCodePurpose();
        const purposeIndicator = this.getCodePurposeIndicator(purpose);

        let summary = `${this.language}代码, ${lineCount}行`;

        if (this.filename) summary += `, 文件: ${this.filename}`;
        if (this.isPartial) summary += ' (部分)';

        return `${purposeIndicator} ${summary}`;
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
            case 'configuration':
                return this.isConfigurationCode();
            case 'test':
                return this.isTestCode();
            case 'documentation':
                return this.hasDocumentation();
            case 'partial':
                return this.isPartial;
            case 'complete':
                return !this.isPartial && this.isCompleteCode();
            case 'complex':
                return this.getComplexityScore() > 5;
            default:
                return false;
        }
    }

    /**
     * 领域方法：获取代码用途
     */
    getCodePurpose(): string {
        const content = this.content.toLowerCase();
        const filename = this.filename?.toLowerCase() || '';

        // 配置文件检测 - 先检测，因为配置文件优先级高
        if (this.isConfigurationCode()) return 'config';

        // 测试代码检测
        if (this.isTestCode()) return 'test';

        // 重构代码检测 - 在修复检测之前，因为重构关键词更具体
        if (this.isRefactorCode(content)) return 'refactor';

        // 修复代码检测
        if (this.isFixCode(content)) return 'fix';

        // 示例代码检测
        if (this.isExampleCode(content)) return 'example';

        // 默认为解决方案
        return 'solution';
    }

    /**
     * 领域方法：计算代码复杂度
     */
    getComplexityScore(): number {
        let score = 0;
        const content = this.content;

        // 行数评分 (improved scaling for very large code blocks)
        const lineCount = this.getLineCount();
        if (lineCount <= 100) {
            score += Math.floor(lineCount / 10);
        } else if (lineCount <= 1000) {
            score += 10 + Math.floor((lineCount - 100) / 50);
        } else {
            score += 28 + Math.floor((lineCount - 1000) / 200);
        }

        // 语言复杂度
        const languageComplexity = this.getLanguageComplexity();
        score += languageComplexity;

        // 代码结构复杂度
        const structureComplexity = this.analyzeStructureComplexity(content);
        score += structureComplexity;

        // 部分代码通常更复杂（需要上下文理解）
        if (this.isPartial) score += 2;

        return Math.round(score);
    }

    /**
     * 获取代码行数
     */
    getLineCount(): number {
        return this.content.split('\n').filter(line => line.trim().length > 0).length;
    }

    /**
     * 检查是否为可执行代码
     */
    isExecutableCode(): boolean {
        const executableLanguages = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'go', 'rust', 'ruby'];
        return executableLanguages.includes(this.language.toLowerCase());
    }

    /**
     * 检查是否为测试代码
     */
    isTestCode(): boolean {
        const content = this.content.toLowerCase();
        const filename = this.filename?.toLowerCase() || '';

        const testKeywords = ['test', 'spec', 'describe', 'it(', 'expect', 'assert', 'mock'];
        const testFiles = ['.test.', '.spec.', '__test__', '__tests__'];

        return testKeywords.some(keyword => content.includes(keyword)) ||
            testFiles.some(pattern => filename.includes(pattern));
    }

    /**
     * 检查是否为配置代码
     */
    isConfigurationCode(): boolean {
        const configLanguages = ['json', 'yaml', 'yml', 'toml', 'ini', 'env'];
        const configFiles = ['config', '.env', 'package.json', 'tsconfig', 'webpack', 'vite'];
        const filename = this.filename?.toLowerCase() || '';

        return configLanguages.includes(this.language.toLowerCase()) ||
            configFiles.some(pattern => filename.includes(pattern));
    }

    /**
     * 检查是否包含文档
     */
    hasDocumentation(): boolean {
        const content = this.content;
        const docPatterns = [
            /\/\*\*[\s\S]*?\*\//, // JSDoc
            /"""[\s\S]*?"""/, // Python docstring
            /<!--[\s\S]*?-->/, // HTML comments
            /^\s*#(?!#).*$/m, // Single line comments starting with # (not markdown headers)
            /\/\/.*/ // JavaScript comments
        ];

        return docPatterns.some(pattern => pattern.test(content));
    }

    /**
     * 检查是否为完整代码
     */
    isCompleteCode(): boolean {
        const content = this.content.toLowerCase();
        const incompleteMarkers = ['...', 'todo', 'fixme', '// more code', '# more code'];
        return !incompleteMarkers.some(marker => content.includes(marker));
    }

    /**
     * 获取语言复杂度评分
     */
    getLanguageComplexity(): number {
        const complexityMap: Record<string, number> = {
            'assembly': 5,
            'rust': 4,
            'cpp': 4,
            'c': 3,
            'java': 3,
            'typescript': 3,
            'javascript': 2,
            'python': 2,
            'go': 2,
            'ruby': 2,
            'html': 1,
            'css': 1,
            'json': 1,
            'yaml': 1,
            'markdown': 1
        };

        return complexityMap[this.language.toLowerCase()] || 2;
    }

    /**
     * 分析代码结构复杂度
     */
    analyzeStructureComplexity(content: string): number {
        let complexity = 0;

        // 控制结构
        const controlStructures = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
        controlStructures.forEach(structure => {
            const matches = content.match(new RegExp(`\\b${structure}\\b`, 'g'));
            if (matches) complexity += matches.length * 0.5;
        });

        // 函数/方法定义
        const functionPatterns = [
            /function\s+\w+/g,
            /def\s+\w+/g,
            /class\s+\w+/g,
            /interface\s+\w+/g
        ];

        functionPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) complexity += matches.length;
        });

        // 嵌套级别（简单估算）
        const maxNesting = this.calculateMaxNesting(content);
        complexity += maxNesting;

        return Math.round(complexity);
    }

    /**
     * 计算最大嵌套级别
     */
    calculateMaxNesting(content: string): number {
        let maxNesting = 0;
        let currentNesting = 0;

        for (const char of content) {
            if (char === '{' || char === '(') {
                currentNesting++;
                maxNesting = Math.max(maxNesting, currentNesting);
            } else if (char === '}' || char === ')') {
                currentNesting = Math.max(0, currentNesting - 1);
            }
        }

        return maxNesting;
    }

    /**
     * 检查是否为修复代码
     */
    isFixCode(content: string): boolean {
        const contextLower = this.context?.toLowerCase() || '';
        const fixKeywords = ['fix', 'bug', 'error', 'issue', 'problem', 'correct'];

        // 只检查上下文，避免误判（比如 "error handling" 不应该算修复）
        return fixKeywords.some(keyword => 
            contextLower.includes(`fix ${keyword}`) ||
            contextLower.includes(`${keyword} fix`) ||
            contextLower.startsWith('fix ') ||
            contextLower === 'fix'
        );
    }

    /**
     * 检查是否为重构代码
     */
    isRefactorCode(content: string): boolean {
        const contextLower = this.context?.toLowerCase() || '';
        const refactorKeywords = ['refactor', 'optimize', 'improve', 'clean', 'restructure'];
        return refactorKeywords.some(keyword => contextLower.includes(keyword));
    }

    /**
     * 检查是否为示例代码
     */
    isExampleCode(content: string): boolean {
        const exampleKeywords = ['example', 'demo', 'sample', 'template'];
        return exampleKeywords.some(keyword => 
            this.context?.toLowerCase().includes(keyword) ||
            content.includes(keyword)
        );
    }

    /**
     * 获取代码用途指示器
     */
    getCodePurposeIndicator(purpose: string): string {
        const indicators: Record<string, string> = {
            'example': '📝',
            'solution': '💻',
            'fix': '🔧',
            'refactor': '🔄',
            'test': '🧪',
            'config': '⚙️'
        };

        return indicators[purpose] || '💻';
    }

    /**
     * 获取代码预览（用于摘要显示）
     */
    getPreview(maxLines: number = 3): string {
        const lines = this.content.split('\n');
        if (lines.length <= maxLines) return this.content;
        return lines.slice(0, maxLines).join('\n') + '\n...';
    }

    /**
     * 估算阅读时间（分钟）
     */
    estimateReadingTime(): number {
        const linesPerMinute = 20; // 代码阅读速度
        const lineCount = this.getLineCount();
        const complexity = this.getComplexityScore();

        // 复杂度影响阅读时间
        const complexityMultiplier = 1 + (complexity / 10);
        const baseTime = Math.ceil(lineCount / linesPerMinute);
        return Math.max(1, Math.round(baseTime * complexityMultiplier));
    }

    /**
     * 检查代码语法有效性（简单检查）
     */
    isValidSyntax(): boolean {
        const content = this.content.trim();
        if (!content) return true; // Empty/whitespace-only content is technically valid

        // 简单的语法检查
        const openBraces = (content.match(/\{/g) || []).length;
        const closeBraces = (content.match(/\}/g) || []).length;
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;

        return openBraces === closeBraces && openParens === closeParens;
    }
}