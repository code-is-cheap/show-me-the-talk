/**
 * 目录生成器服务
 * 为对话生成语义化的目录结构，支持多种输出格式
 */

export interface TocEntry {
    id: string;
    title: string;
    level: number;
    type: 'question' | 'response' | 'code' | 'tool';
    icon: string;
    importance: 'high' | 'medium' | 'low';
    timestamp?: Date;
    anchor?: string;
}

export interface TocOptions {
    maxDepth: number;
    includeTimestamps: boolean;
    includeIcons: boolean;
    groupByType: boolean;
    showImportanceIndicators: boolean;
    format: 'html' | 'markdown' | 'plain';
}

export class TableOfContentsGenerator {
    private readonly options: TocOptions;
    private readonly defaultOptions: TocOptions = {
        maxDepth: 3,
        includeTimestamps: false,
        includeIcons: true,
        groupByType: false,
        showImportanceIndicators: true,
        format: 'html'
    };

    constructor(options: Partial<TocOptions> = {}) {
        this.options = { ...this.defaultOptions, ...options };
    }

    /**
     * 从对话元素生成目录
     */
    generateFromElements(elements: any[]): TocEntry[] {
        const entries: TocEntry[] = [];
        
        elements.forEach((element, index) => {
            const entry = this.createTocEntry(element, index);
            if (this.shouldIncludeEntry(entry)) {
                entries.push(entry);
            }
        });
        
        return this.organizeEntries(entries);
    }

    /**
     * 渲染目录为HTML
     */
    renderHtml(entries: TocEntry[]): string {
        let html = '<nav class="table-of-contents">\n';
        html += '<h3 class="toc-title">Table of Contents</h3>\n';
        
        if (this.options.showImportanceIndicators) {
            html += this.renderImportanceLegend();
        }
        
        if (this.options.groupByType) {
            const groupedEntries = this.groupEntriesByType(entries);
            
            for (const [type, typeEntries] of groupedEntries) {
                html += `<div class="toc-group" data-type="${type}">\n`;
                html += `<h4 class="toc-group-title">${this.getGroupIcon(type)} ${this.getGroupTitle(type)}</h4>\n`;
                html += '<ul class="toc-list">\n';
                
                typeEntries.forEach(entry => {
                    html += this.renderHtmlEntry(entry);
                });
                
                html += '</ul>\n</div>\n';
            }
        } else {
            html += '<ul class="toc-list">\n';
            entries.forEach(entry => {
                html += this.renderHtmlEntry(entry);
            });
            html += '</ul>\n';
        }
        
        html += '</nav>\n';
        return html;
    }

    /**
     * 渲染目录为Markdown
     */
    renderMarkdown(entries: TocEntry[]): string {
        let markdown = '## Table of Contents\n\n';
        
        if (this.options.groupByType) {
            const groupedEntries = this.groupEntriesByType(entries);
            
            for (const [type, typeEntries] of groupedEntries) {
                markdown += `### ${this.getGroupIcon(type)} ${this.getGroupTitle(type)}\n\n`;
                
                typeEntries.forEach(entry => {
                    const indent = '  '.repeat(entry.level - 1);
                    const icon = this.options.includeIcons ? `${entry.icon} ` : '';
                    const importance = this.options.showImportanceIndicators ? 
                        this.getImportanceIndicator(entry.importance) : '';
                    const timestamp = this.options.includeTimestamps && entry.timestamp ? 
                        ` _(${this.formatTimestamp(entry.timestamp)})_` : '';
                    
                    markdown += `${indent}- [${icon}${entry.title}${importance}](#${entry.anchor || entry.id})${timestamp}\n`;
                });
                
                markdown += '\n';
            }
        } else {
            entries.forEach(entry => {
                const indent = '  '.repeat(entry.level - 1);
                const icon = this.options.includeIcons ? `${entry.icon} ` : '';
                const importance = this.options.showImportanceIndicators ? 
                    this.getImportanceIndicator(entry.importance) : '';
                const timestamp = this.options.includeTimestamps && entry.timestamp ? 
                    ` _(${this.formatTimestamp(entry.timestamp)})_` : '';
                
                markdown += `${indent}- [${icon}${entry.title}${importance}](#${entry.anchor || entry.id})${timestamp}\n`;
            });
        }
        
        return markdown;
    }

    /**
     * 创建目录条目
     */
    private createTocEntry(element: any, index: number): TocEntry {
        const baseEntry: TocEntry = {
            id: element.id || `element-${index}`,
            title: this.truncateTitle(element.getSummary?.() || element.title || 'Untitled'),
            level: 1,
            type: this.determineEntryType(element),
            icon: '',
            importance: 'medium',
            timestamp: element.timestamp,
            anchor: element.id || `element-${index}`
        };
        
        // 根据元素类型设置具体属性
        switch (baseEntry.type) {
            case 'question':
                baseEntry.icon = this.getQuestionIcon(element);
                baseEntry.importance = this.assessQuestionImportance(element);
                baseEntry.level = 1;
                break;
                
            case 'response':
                baseEntry.icon = this.getResponseIcon(element);
                baseEntry.importance = this.assessResponseImportance(element);
                baseEntry.level = 1;
                break;
                
            case 'code':
                baseEntry.icon = this.getCodeIcon(element);
                baseEntry.importance = this.assessCodeImportance(element);
                baseEntry.level = 2;
                break;
                
            case 'tool':
                baseEntry.icon = '🔧';
                baseEntry.importance = 'low';
                baseEntry.level = 3;
                break;
        }
        
        return baseEntry;
    }

    /**
     * 评估问题重要性
     */
    private assessQuestionImportance(element: any): 'high' | 'medium' | 'low' {
        if (element.getComplexityScore) {
            const complexity = element.getComplexityScore();
            if (complexity >= 4) return 'high';
            if (complexity >= 2) return 'medium';
        }
        
        if (element.content) {
            const content = element.content.toLowerCase();
            if (content.includes('implement') || content.includes('create') || content.includes('build')) {
                return 'high';
            }
            if (content.includes('debug') || content.includes('fix') || content.includes('error')) {
                return 'high';
            }
        }
        
        return 'medium';
    }

    /**
     * 评估回答重要性
     */
    private assessResponseImportance(element: any): 'high' | 'medium' | 'low' {
        if (element.getComplexityScore) {
            const complexity = element.getComplexityScore();
            if (complexity >= 4) return 'high';
            if (complexity >= 2) return 'medium';
        }
        
        if (element.codeBlocks && element.codeBlocks.length > 0) {
            return 'high';
        }
        
        if (element.toolUses && element.toolUses.length > 2) {
            return 'high';
        }
        
        return 'medium';
    }

    /**
     * 评估代码重要性
     */
    private assessCodeImportance(element: any): 'high' | 'medium' | 'low' {
        if (element.getLineCount) {
            const lines = element.getLineCount();
            if (lines > 50) return 'high';
            if (lines > 20) return 'medium';
        }
        
        if (element.language) {
            const importantLanguages = ['typescript', 'javascript', 'python', 'java'];
            if (importantLanguages.includes(element.language.toLowerCase())) {
                return 'medium';
            }
        }
        
        return 'low';
    }

    /**
     * 组织目录条目
     */
    private organizeEntries(entries: TocEntry[]): TocEntry[] {
        return entries.filter(entry => entry.level <= this.options.maxDepth);
    }

    /**
     * 按类型分组条目
     */
    private groupEntriesByType(entries: TocEntry[]): Map<string, TocEntry[]> {
        const groups = new Map<string, TocEntry[]>();
        
        entries.forEach(entry => {
            if (!groups.has(entry.type)) {
                groups.set(entry.type, []);
            }
            groups.get(entry.type)!.push(entry);
        });
        
        return groups;
    }

    /**
     * 渲染HTML条目
     */
    private renderHtmlEntry(entry: TocEntry): string {
        const icon = this.options.includeIcons ? `${entry.icon} ` : '';
        const importance = this.options.showImportanceIndicators ? 
            ` <span class="importance-indicator ${entry.importance}">${this.getImportanceIndicator(entry.importance)}</span>` : '';
        const timestamp = this.options.includeTimestamps && entry.timestamp ? 
            ` <time class="toc-timestamp">${this.formatTimestamp(entry.timestamp)}</time>` : '';
        
        return `<li class="toc-item" data-type="${entry.type}" data-importance="${entry.importance}">\n` +
               `  <a href="#${entry.anchor || entry.id}" class="toc-link">\n` +
               `    ${icon}${entry.title}${importance}${timestamp}\n` +
               `  </a>\n` +
               `</li>\n`;
    }

    /**
     * 渲染重要性图例
     */
    private renderImportanceLegend(): string {
        return '<div class="importance-legend">\n' +
               '  <span class="legend-item high">🔴 High</span>\n' +
               '  <span class="legend-item medium">🟡 Medium</span>\n' +
               '  <span class="legend-item low">🟢 Low</span>\n' +
               '</div>\n';
    }

    /**
     * 获取重要性指示器
     */
    private getImportanceIndicator(importance: 'high' | 'medium' | 'low'): string {
        const indicators = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        return indicators[importance];
    }

    /**
     * 工具方法
     */
    private shouldIncludeEntry(entry: TocEntry): boolean {
        return entry.title.length > 0 && entry.level <= this.options.maxDepth;
    }

    private truncateTitle(title: string, maxLength: number = 80): string {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength) + '...';
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private formatTimestamp(timestamp: Date): string {
        return timestamp.toLocaleTimeString();
    }

    private getQuestionIcon(element: any): string {
        if (element.getQuestionType) {
            const questionType = element.getQuestionType();
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
        return '❓';
    }

    private getResponseIcon(element: any): string {
        if (element.getResponseType) {
            const responseType = element.getResponseType();
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
        return '💡';
    }

    private getCodeIcon(element: any): string {
        if (element.language) {
            const language = element.language.toLowerCase();
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
            return icons[language] || '📝';
        }
        return '📝';
    }

    private getGroupTitle(type: string): string {
        const titles: Record<string, string> = {
            'question': 'Questions',
            'response': 'Responses',
            'code': 'Code Blocks',
            'tool': 'Tool Operations'
        };
        return titles[type] || this.capitalizeFirst(type);
    }

    private getGroupIcon(type: string): string {
        const icons: Record<string, string> = {
            'question': '❓',
            'response': '💡',
            'code': '📝',
            'tool': '🔧'
        };
        return icons[type] || '📁';
    }

    private determineEntryType(element: any): 'question' | 'response' | 'code' | 'tool' {
        if (element.type === 'user_question' || element.getQuestionType) {
            return 'question';
        }
        if (element.type === 'assistant_response' || element.getResponseType) {
            return 'response';
        }
        if (element.type === 'code_block' || element.language) {
            return 'code';
        }
        if (element.type === 'tool_interaction_group' || element.toolUses) {
            return 'tool';
        }
        return 'response'; // default
    }
}