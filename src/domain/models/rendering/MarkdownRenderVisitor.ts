import { RenderableContent, VisualStyle } from './RenderableContent.js';
import { UserQuestion } from '../enhanced/UserQuestion.js';
import { AssistantResponse } from '../enhanced/AssistantResponse.js';
import { CodeBlock } from '../enhanced/CodeBlock.js';
import { ToolInteractionGroup } from '../enhanced/ToolInteractionGroup.js';

interface ConversationRenderVisitor {
    visitUserQuestion(question: UserQuestion): RenderableContent;
    visitAssistantResponse(response: AssistantResponse): RenderableContent;
    visitCodeBlock(codeBlock: CodeBlock): RenderableContent;
    visitToolInteractionGroup(toolGroup: ToolInteractionGroup): RenderableContent;
}

/**
 * Markdown渲染选项
 */
export interface MarkdownRenderOptions {
    /** 包含元数据 */
    includeMetadata?: boolean;
    /** 包含时间戳 */
    includeTimestamps?: boolean;
    /** 包含复杂度信息 */
    includeComplexity?: boolean;
    /** 代码块样式 */
    codeBlockStyle?: 'fenced' | 'indented';
    /** 标题级别 */
    headingLevel?: number;
    /** 使用表情符号 */
    useEmojis?: boolean;
    /** 紧凑模式 */
    compactMode?: boolean;
}

/**
 * Markdown渲染访问者
 * 将对话元素渲染为Markdown格式
 */
export class MarkdownRenderVisitor implements ConversationRenderVisitor {
    private readonly options: MarkdownRenderOptions;

    constructor(options: MarkdownRenderOptions = {}) {
        this.options = {
            includeMetadata: true,
            includeTimestamps: false,
            includeComplexity: false,
            codeBlockStyle: 'fenced',
            headingLevel: 2,
            useEmojis: true,
            compactMode: false,
            ...options
        };
    }

    /**
     * 渲染用户问题
     */
    visitUserQuestion(question: UserQuestion): RenderableContent {
        return this.renderUserQuestion(question);
    }

    /**
     * 渲染助手回答
     */
    visitAssistantResponse(response: AssistantResponse): RenderableContent {
        return this.renderAssistantResponse(response);
    }

    /**
     * 渲染代码块
     */
    visitCodeBlock(codeBlock: CodeBlock): RenderableContent {
        return this.renderCodeBlock(codeBlock);
    }

    /**
     * 渲染工具交互组
     */
    visitToolInteractionGroup(toolGroup: ToolInteractionGroup): RenderableContent {
        return this.renderToolInteractionGroup(toolGroup);
    }

    /**
     * 渲染用户问题的具体实现
     */
    private renderUserQuestion(question: UserQuestion): RenderableContent {
        const icon = this.getQuestionIcon(question.getQuestionType());
        const heading = '#'.repeat(this.options.headingLevel || 2);
        
        let content = `${heading} ${icon} User Question\n\n`;
        content += this.formatQuestionContent(question.content);
        
        if (this.options.includeMetadata) {
            content += this.renderQuestionMetadata(question);
        }
        
        return RenderableContent.create(content, VisualStyle.PROMINENT);
    }

    /**
     * 渲染助手回答的具体实现
     */
    private renderAssistantResponse(response: AssistantResponse): RenderableContent {
        const icon = this.getResponseIcon(response.getResponseType());
        const heading = '#'.repeat(this.options.headingLevel || 2);
        
        let content = `${heading} ${icon} Assistant Response\n\n`;
        content += this.formatResponseContent(response.textContent);
        
        if (this.options.includeMetadata) {
            content += this.renderResponseMetadata(response);
        }
        
        return RenderableContent.create(content, VisualStyle.STANDARD);
    }

    /**
     * 渲染代码块的具体实现
     */
    private renderCodeBlock(codeBlock: CodeBlock): RenderableContent {
        let content = '';
        
        if (!this.options.compactMode) {
            const icon = this.getCodeBlockIcon(codeBlock.language);
            const heading = '#'.repeat((this.options.headingLevel || 2) + 1);
            
            content += `${heading} ${icon} Code Block`;
            if (codeBlock.filename) {
                content += ` - ${codeBlock.filename}`;
            }
            content += '\n\n';
        }
        
        content += this.formatCodeContent(codeBlock);
        
        if (this.options.includeMetadata && !this.options.compactMode) {
            content += this.renderCodeBlockMetadata(codeBlock);
        }
        
        return RenderableContent.create(content, VisualStyle.CODE);
    }

    /**
     * 渲染工具交互组的具体实现
     */
    private renderToolInteractionGroup(toolGroup: ToolInteractionGroup): RenderableContent {
        const icon = this.getToolGroupIcon(toolGroup.purpose);
        const heading = '#'.repeat((this.options.headingLevel || 2) + 1);
        
        let content = `${heading} ${icon} Tool Operations\n\n`;
        
        if (this.options.compactMode) {
            content += `${toolGroup.getSummary()}\n\n`;
        } else {
            content += `**Purpose:** ${this.formatPurpose(toolGroup.purpose)}\n\n`;
            
            toolGroup.toolUses.forEach((tool, index) => {
                content += `${index + 1}. **${tool.toolName}**`;
                if (!tool.isSuccessful) {
                    content += ' ❌';
                }
                content += '\n';
                
                const paramSummary = tool.getParameterSummary();
                if (paramSummary && paramSummary !== 'No parameters') {
                    content += `   - Parameters: ${paramSummary}\n`;
                }
            });
            content += '\n';
        }
        
        if (this.options.includeMetadata) {
            content += this.renderToolGroupMetadata(toolGroup);
        }
        
        return RenderableContent.create(content, VisualStyle.SUBTLE);
    }

    /**
     * 格式化问题内容
     */
    private formatQuestionContent(content: string): string {
        return content + '\n\n';
    }

    /**
     * 格式化回答内容
     */
    private formatResponseContent(content: string): string {
        return content + '\n\n';
    }

    /**
     * 格式化代码内容
     */
    private formatCodeContent(codeBlock: CodeBlock): string {
        if (this.options.codeBlockStyle === 'fenced') {
            return `\`\`\`${codeBlock.language}\n${codeBlock.content}\n\`\`\`\n\n`;
        } else {
            // Indented style
            const indentedContent = codeBlock.content
                .split('\n')
                .map(line => `    ${line}`)
                .join('\n');
            return `${indentedContent}\n\n`;
        }
    }

    /**
     * 渲染内联代码块
     */
    private renderCodeBlockInline(codeBlock: CodeBlock): string {
        const preview = codeBlock.getPreview(1);
        return `\`${preview}\``;
    }

    /**
     * 渲染问题元数据
     */
    private renderQuestionMetadata(question: UserQuestion): string {
        let metadata = '---\n\n';
        
        if (this.options.includeTimestamps) {
            metadata += `**Timestamp:** ${this.formatTimestamp(question.timestamp)}\n\n`;
        }
        
        metadata += `**Type:** ${question.getQuestionType()}\n\n`;
        metadata += `**Intent:** ${question.intent}\n\n`;
        
        if (question.isFollowUp) {
            metadata += `**Follow-up Question:** Yes\n\n`;
        }
        
        if (this.options.includeComplexity) {
            metadata += `**Complexity:** ${question.complexity} (Score: ${question.getComplexityScore()})\n\n`;
        }
        
        return metadata;
    }

    /**
     * 渲染回答元数据
     */
    private renderResponseMetadata(response: AssistantResponse): string {
        let metadata = '---\n\n';
        
        if (this.options.includeTimestamps) {
            metadata += `**Timestamp:** ${this.formatTimestamp(response.timestamp)}\n\n`;
        }
        
        metadata += `**Model:** ${response.model}\n\n`;
        metadata += `**Response Type:** ${response.getResponseType()}\n\n`;
        metadata += `**Token Usage:** ${response.usage.input_tokens} in / ${response.usage.output_tokens} out\n\n`;
        
        if (response.codeBlocks.length > 0) {
            metadata += `**Code Blocks:** ${response.codeBlocks.length}\n\n`;
        }
        
        if (response.toolUses.length > 0) {
            metadata += `**Tools Used:** ${response.toolUses.length}\n\n`;
        }
        
        if (this.options.includeComplexity) {
            metadata += `**Complexity Score:** ${response.getComplexityScore()}\n\n`;
        }
        
        return metadata;
    }

    /**
     * 渲染代码块元数据
     */
    private renderCodeBlockMetadata(codeBlock: CodeBlock): string {
        let metadata = '---\n\n';
        
        metadata += `**Language:** ${codeBlock.language}\n\n`;
        metadata += `**Purpose:** ${codeBlock.getCodePurpose()}\n\n`;
        metadata += `**Lines:** ${codeBlock.getLineCount()}\n\n`;
        
        if (codeBlock.filename) {
            metadata += `**File:** ${codeBlock.filename}\n\n`;
        }
        
        if (this.options.includeComplexity) {
            metadata += `**Complexity Score:** ${codeBlock.getComplexityScore()}\n\n`;
        }
        
        return metadata;
    }

    /**
     * 渲染工具组元数据
     */
    private renderToolGroupMetadata(toolGroup: ToolInteractionGroup): string {
        const stats = toolGroup.getToolStatistics();
        let metadata = '---\n\n';
        
        metadata += `**Tools:** ${stats.totalCount} total, ${stats.successfulCount} successful\n\n`;
        metadata += `**Purpose:** ${this.formatPurpose(toolGroup.purpose)}\n\n`;
        
        if (stats.averageExecutionTime) {
            metadata += `**Avg Execution Time:** ${Math.round(stats.averageExecutionTime)}ms\n\n`;
        }
        
        const impact = toolGroup.estimateImpactScope();
        metadata += `**Impact:** ${impact}\n\n`;
        
        return metadata;
    }

    /**
     * 格式化时间戳
     */
    private formatTimestamp(timestamp: Date): string {
        return timestamp.toLocaleString();
    }

    /**
     * 格式化用途
     */
    private formatPurpose(purpose: string): string {
        return purpose.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * 获取问题图标
     */
    private getQuestionIcon(questionType: string): string {
        if (!this.options.useEmojis) return '';
        
        const icons: Record<string, string> = {
            'how-to': '❓',
            'what-is': '💭',
            'why': '🤔',
            'debug': '🐛',
            'implement': '⚡',
            'explain': '📖',
            'compare': '⚖️',
            'review': '👀'
        };
        
        return icons[questionType] || '❓';
    }

    /**
     * 获取回答图标
     */
    private getResponseIcon(responseType: string): string {
        if (!this.options.useEmojis) return '';
        
        const icons: Record<string, string> = {
            'explanation': '💡',
            'code-solution': '💻',
            'guidance': '🧭',
            'analysis': '🔍',
            'mixed': '🔀',
            'correction': '✅',
            'confirmation': '✓'
        };
        
        return icons[responseType] || '💡';
    }

    /**
     * 获取代码块图标
     */
    private getCodeBlockIcon(language: string): string {
        if (!this.options.useEmojis) return '';
        
        const icons: Record<string, string> = {
            'javascript': '🟨',
            'typescript': '🔷',
            'python': '🐍',
            'java': '☕',
            'cpp': '⚙️',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'yaml': '📄',
            'bash': '💻'
        };
        
        return icons[language.toLowerCase()] || '📝';
    }

    /**
     * 获取工具组图标
     */
    private getToolGroupIcon(purpose: string): string {
        if (!this.options.useEmojis) return '';
        
        const icons: Record<string, string> = {
            'file-management': '📁',
            'code-analysis': '🔍',
            'information-gathering': '📊',
            'system-operation': '⚙️',
            'debugging': '🐛',
            'content-creation': '✨',
            'data-processing': '📈'
        };
        
        return icons[purpose] || '🔧';
    }
}