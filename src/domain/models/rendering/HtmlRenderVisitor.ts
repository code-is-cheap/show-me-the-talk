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
 * HTML渲染选项
 */
export interface HtmlRenderOptions {
    /** 包含元数据 */
    includeMetadata?: boolean;
    /** 包含时间戳 */
    includeTimestamps?: boolean;
    /** 包含复杂度信息 */
    includeComplexity?: boolean;
    /** 使用语义化HTML元素 */
    useSemanticElements?: boolean;
    /** 包含CSS样式 */
    includeCss?: boolean;
    /** 紧凑模式 */
    compactMode?: boolean;
    /** 语法高亮 */
    syntaxHighlighting?: boolean;
    /** 启用内容折叠 */
    enableContentCollapse?: boolean;
    /** 启用代码预览 */
    enableCodePreview?: boolean;
    /** 启用工具图标化 */
    enableToolIconification?: boolean;
    /** 启用目录 */
    enableTableOfContents?: boolean;
    /** 最大预览行数 */
    maxPreviewLines?: number;
    /** 最大代码预览行数 */
    maxCodePreviewLines?: number;
}

/**
 * HTML渲染访问者
 * 将对话元素渲染为HTML格式，优化阅读体验
 */
export class HtmlRenderVisitor implements ConversationRenderVisitor {
    private readonly options: HtmlRenderOptions;

    constructor(options: HtmlRenderOptions = {}) {
        this.options = {
            includeMetadata: true,
            includeTimestamps: false,
            includeComplexity: false,
            useSemanticElements: true,
            includeCss: true,
            compactMode: false,
            syntaxHighlighting: true,
            enableContentCollapse: true,
            enableCodePreview: true,
            enableToolIconification: true,
            enableTableOfContents: false,
            maxPreviewLines: 10,
            maxCodePreviewLines: 20,
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
     * 生成目录内容
     */
    generateTableOfContents(elements: any[]): string {
        if (!this.options.enableTableOfContents) return '';
        
        let toc = '<nav class="table-of-contents">\n';
        toc += '<h3>Table of Contents</h3>\n';
        toc += '<ul>\n';
        
        elements.forEach((element, index) => {
            const id = `element-${index}`;
            const summary = this.truncateText(element.getSummary(), 60);
            toc += `<li><a href="#${id}">${this.escapeHtml(summary)}</a></li>\n`;
        });
        
        toc += '</ul>\n</nav>\n\n';
        return toc;
    }

    /**
     * 渲染用户问题的具体实现
     */
    private renderUserQuestion(question: UserQuestion): RenderableContent {
        const icon = this.getQuestionIcon(question.getQuestionType());
        const questionType = question.getQuestionType();
        
        let content = '';
        
        if (this.options.useSemanticElements) {
            content += `<section class="user-question ${questionType}-question" data-importance="${question.importance}">\n`;
        } else {
            content += `<div class="user-question ${questionType}-question">\n`;
        }
        
        content += `<header class="question-header">\n`;
        content += `<h2>${icon} User Question</h2>\n`;
        
        if (this.options.includeTimestamps) {
            content += `<time datetime="${question.timestamp.toISOString()}">${this.formatTimestamp(question.timestamp)}</time>\n`;
        }
        
        content += `</header>\n`;
        
        const shouldCollapse = this.shouldCollapseContent(question.content);
        if (shouldCollapse && this.options.enableContentCollapse) {
            content += `<div class="collapsible-content">\n`;
            content += `<div class="content-preview">${this.escapeHtml(this.generateContentPreview(question.content))}</div>\n`;
            content += `<button class="expand-button" onclick="this.parentElement.classList.toggle('expanded')">Show More</button>\n`;
            content += `<div class="full-content">${this.formatQuestionContent(question.content)}</div>\n`;
            content += `</div>\n`;
        } else {
            content += this.formatQuestionContent(question.content);
        }
        
        if (this.options.includeMetadata) {
            content += this.renderQuestionMetadata(question);
        }
        
        content += this.options.useSemanticElements ? '</section>\n' : '</div>\n';
        
        return RenderableContent.create(content, VisualStyle.PROMINENT);
    }

    /**
     * 渲染助手回答的具体实现（增强版）
     */
    private renderAssistantResponse(response: AssistantResponse): RenderableContent {
        const icon = this.getResponseIcon(response.getResponseType());
        const responseType = response.getResponseType();
        
        let content = '';
        
        if (this.options.useSemanticElements) {
            content += `<section class="assistant-response ${responseType}-response" data-importance="${response.importance}">\n`;
        } else {
            content += `<div class="assistant-response ${responseType}-response">\n`;
        }
        
        content += `<header class="response-header">\n`;
        content += `<h2>${icon} Assistant Response</h2>\n`;
        
        if (this.options.includeTimestamps) {
            content += `<time datetime="${response.timestamp.toISOString()}">${this.formatTimestamp(response.timestamp)}</time>\n`;
        }
        
        content += `</header>\n`;
        
        const shouldCollapse = this.shouldCollapseContent(response.textContent);
        if (shouldCollapse && this.options.enableContentCollapse) {
            content += `<div class="collapsible-content">\n`;
            content += `<div class="content-preview">${this.escapeHtml(this.generateContentPreview(response.textContent))}</div>\n`;
            content += `<button class="expand-button" onclick="this.parentElement.classList.toggle('expanded')">Show More</button>\n`;
            content += `<div class="full-content">${this.formatResponseContent(response.textContent)}</div>\n`;
            content += `</div>\n`;
        } else {
            content += this.formatResponseContent(response.textContent);
        }
        
        if (this.options.includeMetadata) {
            content += this.renderResponseMetadata(response);
        }
        
        content += this.options.useSemanticElements ? '</section>\n' : '</div>\n';
        
        return RenderableContent.create(content, VisualStyle.STANDARD);
    }

    /**
     * 判断内容是否需要折叠
     */
    private shouldCollapseContent(content: string): boolean {
        if (!this.options.enableContentCollapse) return false;
        
        const lineCount = content.split('\n').length;
        const wordCount = content.split(/\s+/).length;
        
        return lineCount > (this.options.maxPreviewLines || 10) || 
               wordCount > 200;
    }

    /**
     * 生成内容预览
     */
    private generateContentPreview(content: string): string {
        const maxLines = this.options.maxPreviewLines || 10;
        const lines = content.split('\n');
        
        if (lines.length <= maxLines) {
            return content;
        }
        
        return lines.slice(0, maxLines).join('\n') + '\n...';
    }

    /**
     * 渲染代码块预览版本
     */
    private renderCodeBlockWithPreview(codeBlock: CodeBlock): string {
        if (!this.options.enableCodePreview) {
            return this.formatCodeContent(codeBlock);
        }
        
        const maxLines = this.options.maxCodePreviewLines || 20;
        const lines = codeBlock.content.split('\n');
        
        if (lines.length <= maxLines) {
            return this.formatCodeContent(codeBlock);
        }
        
        const preview = lines.slice(0, maxLines).join('\n');
        const remaining = lines.length - maxLines;
        
        let content = `<div class="code-block-preview">\n`;
        content += `<pre><code class="language-${codeBlock.language}">${this.escapeHtml(preview)}</code></pre>\n`;
        content += `<div class="code-expand-info">\n`;
        content += `<span>... ${remaining} more lines</span>\n`;
        content += `<button class="expand-code-button" onclick="this.closest('.code-block-preview').classList.toggle('expanded')">Show All</button>\n`;
        content += `</div>\n`;
        content += `<div class="full-code-content">\n`;
        content += `<pre><code class="language-${codeBlock.language}">${this.escapeHtml(codeBlock.content)}</code></pre>\n`;
        content += `</div>\n`;
        content += `</div>\n`;
        
        return content;
    }

    /**
     * 获取工具图标
     */
    private getToolIcon(toolName: string): string {
        if (!this.options.enableToolIconification) return '';
        
        const icons: Record<string, string> = {
            'Read': '📖',
            'Write': '✏️',
            'Edit': '📝',
            'LS': '📁',
            'Grep': '🔍',
            'Glob': '🗂️',
            'Bash': '💻',
            'WebSearch': '🌐',
            'WebFetch': '📡'
        };
        
        for (const [tool, icon] of Object.entries(icons)) {
            if (toolName.includes(tool)) {
                return icon;
            }
        }
        
        return '🔧';
    }

    /**
     * 截断文本
     */
    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * 渲染代码块的具体实现
     */
    private renderCodeBlock(codeBlock: CodeBlock): RenderableContent {
        let content = '';
        
        if (this.options.useSemanticElements) {
            content += `<section class="code-block" data-language="${codeBlock.language}" data-purpose="${codeBlock.getCodePurpose()}">\n`;
        } else {
            content += `<div class="code-block">\n`;
        }
        
        if (!this.options.compactMode) {
            const icon = this.getCodeBlockIcon(codeBlock.language);
            content += `<header class="code-header">\n`;
            content += `<h3>${icon} Code Block`;
            if (codeBlock.filename) {
                content += ` - <span class="filename">${this.escapeHtml(codeBlock.filename)}</span>`;
            }
            content += `</h3>\n`;
            content += `</header>\n`;
        }
        
        content += this.renderCodeBlockWithPreview(codeBlock);
        
        if (this.options.includeMetadata && !this.options.compactMode) {
            content += this.renderCodeBlockMetadata(codeBlock);
        }
        
        content += this.options.useSemanticElements ? '</section>\n' : '</div>\n';
        
        return RenderableContent.create(content, VisualStyle.CODE);
    }

    /**
     * 渲染工具交互组的具体实现
     */
    private renderToolInteractionGroup(toolGroup: ToolInteractionGroup): RenderableContent {
        const icon = this.getToolGroupIcon(toolGroup.purpose);
        
        let content = '';
        
        if (this.options.useSemanticElements) {
            content += `<section class="tool-interaction-group" data-purpose="${toolGroup.purpose}" data-success="${toolGroup.isSuccessful}">\n`;
        } else {
            content += `<div class="tool-interaction-group">\n`;
        }
        
        content += `<header class="tool-group-header">\n`;
        content += `<h3>${icon} Tool Operations</h3>\n`;
        content += `</header>\n`;
        
        if (this.options.compactMode) {
            content += `<p class="tool-summary">${this.escapeHtml(toolGroup.getSummary())}</p>\n`;
        } else {
            content += `<div class="tool-details">\n`;
            content += `<p><strong>Purpose:</strong> ${this.formatPurpose(toolGroup.purpose)}</p>\n`;
            
            content += `<ol class="tool-list">\n`;
            toolGroup.toolUses.forEach((tool) => {
                const toolIcon = this.getToolIcon(tool.toolName);
                const statusClass = tool.isSuccessful ? 'success' : 'failure';
                
                content += `<li class="tool-item ${statusClass}">\n`;
                content += `<span class="tool-name">${toolIcon} ${this.escapeHtml(tool.toolName)}</span>\n`;
                
                if (!tool.isSuccessful) {
                    content += ` <span class="failure-indicator">❌</span>`;
                }
                
                const paramSummary = tool.getParameterSummary();
                if (paramSummary && paramSummary !== 'No parameters') {
                    content += `<div class="tool-params">Parameters: ${this.escapeHtml(paramSummary)}</div>\n`;
                }
                
                content += `</li>\n`;
            });
            content += `</ol>\n`;
            content += `</div>\n`;
        }
        
        if (this.options.includeMetadata) {
            content += this.renderToolGroupMetadata(toolGroup);
        }
        
        content += this.options.useSemanticElements ? '</section>\n' : '</div>\n';
        
        return RenderableContent.create(content, VisualStyle.SUBTLE);
    }

    /**
     * 格式化问题内容
     */
    private formatQuestionContent(content: string): string {
        return `<div class="question-content">\n${this.convertMarkdownToHtml(content)}\n</div>\n`;
    }

    /**
     * 格式化回答内容
     */
    private formatResponseContent(content: string): string {
        return `<div class="response-content">\n${this.convertMarkdownToHtml(content)}\n</div>\n`;
    }

    /**
     * 格式化代码内容
     */
    private formatCodeContent(codeBlock: CodeBlock): string {
        const languageClass = this.options.syntaxHighlighting ? `language-${codeBlock.language}` : '';
        return `<pre><code class="${languageClass}">${this.escapeHtml(codeBlock.content)}</code></pre>\n`;
    }

    /**
     * 渲染内联代码块
     */
    private renderCodeBlockInline(codeBlock: CodeBlock): string {
        const preview = codeBlock.getPreview(1);
        return `<code class="inline-code">${this.escapeHtml(preview)}</code>`;
    }

    /**
     * 简单的Markdown到HTML转换
     */
    private convertMarkdownToHtml(content: string): string {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '</p>\n<p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }

    /**
     * 渲染问题元数据
     */
    private renderQuestionMetadata(question: UserQuestion): string {
        let metadata = '<aside class="question-metadata">\n';
        
        metadata += `<div class="metadata-item"><span class="label">Type:</span> <span class="value">${question.getQuestionType()}</span></div>\n`;
        metadata += `<div class="metadata-item"><span class="label">Intent:</span> <span class="value">${question.intent}</span></div>\n`;
        
        if (question.isFollowUp) {
            metadata += `<div class="metadata-item"><span class="label">Follow-up:</span> <span class="value">Yes</span></div>\n`;
        }
        
        if (this.options.includeComplexity) {
            metadata += `<div class="metadata-item"><span class="label">Complexity:</span> <span class="value">${question.complexity} (${question.getComplexityScore()})</span></div>\n`;
        }
        
        metadata += '</aside>\n';
        return metadata;
    }

    /**
     * 渲染回答元数据
     */
    private renderResponseMetadata(response: AssistantResponse): string {
        let metadata = '<aside class="response-metadata">\n';
        
        metadata += `<div class="metadata-item"><span class="label">Model:</span> <span class="value">${this.escapeHtml(response.model || '')}</span></div>\n`;
        metadata += `<div class="metadata-item"><span class="label">Type:</span> <span class="value">${response.getResponseType()}</span></div>\n`;
        metadata += `<div class="metadata-item"><span class="label">Tokens:</span> <span class="value">${response.usage.input_tokens} in / ${response.usage.output_tokens} out</span></div>\n`;
        
        if (response.codeBlocks.length > 0) {
            metadata += `<div class="metadata-item"><span class="label">Code Blocks:</span> <span class="value">${response.codeBlocks.length}</span></div>\n`;
        }
        
        if (response.toolUses.length > 0) {
            metadata += `<div class="metadata-item"><span class="label">Tools:</span> <span class="value">${response.toolUses.length}</span></div>\n`;
        }
        
        if (this.options.includeComplexity) {
            metadata += `<div class="metadata-item"><span class="label">Complexity:</span> <span class="value">${response.getComplexityScore()}</span></div>\n`;
        }
        
        metadata += '</aside>\n';
        return metadata;
    }

    /**
     * 渲染代码块元数据
     */
    private renderCodeBlockMetadata(codeBlock: CodeBlock): string {
        let metadata = '<aside class="code-metadata">\n';
        
        metadata += `<div class="metadata-item"><span class="label">Language:</span> <span class="value">${codeBlock.language}</span></div>\n`;
        metadata += `<div class="metadata-item"><span class="label">Purpose:</span> <span class="value">${codeBlock.getCodePurpose()}</span></div>\n`;
        metadata += `<div class="metadata-item"><span class="label">Lines:</span> <span class="value">${codeBlock.getLineCount()}</span></div>\n`;
        
        if (codeBlock.filename) {
            metadata += `<div class="metadata-item"><span class="label">File:</span> <span class="value">${this.escapeHtml(codeBlock.filename)}</span></div>\n`;
        }
        
        if (this.options.includeComplexity) {
            metadata += `<div class="metadata-item"><span class="label">Complexity:</span> <span class="value">${codeBlock.getComplexityScore()}</span></div>\n`;
        }
        
        metadata += '</aside>\n';
        return metadata;
    }

    /**
     * 渲染工具组元数据
     */
    private renderToolGroupMetadata(toolGroup: ToolInteractionGroup): string {
        const stats = toolGroup.getToolStatistics();
        let metadata = '<aside class="tool-metadata">\n';
        
        metadata += `<div class="metadata-item"><span class="label">Tools:</span> <span class="value">${stats.totalCount} total, ${stats.successfulCount} successful</span></div>\n`;
        metadata += `<div class="metadata-item"><span class="label">Purpose:</span> <span class="value">${this.formatPurpose(toolGroup.purpose)}</span></div>\n`;
        
        if (stats.averageExecutionTime) {
            metadata += `<div class="metadata-item"><span class="label">Avg Time:</span> <span class="value">${Math.round(stats.averageExecutionTime)}ms</span></div>\n`;
        }
        
        const impact = toolGroup.estimateImpactScope();
        metadata += `<div class="metadata-item"><span class="label">Impact:</span> <span class="value">${impact}</span></div>\n`;
        
        metadata += '</aside>\n';
        return metadata;
    }

    /**
     * HTML转义
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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