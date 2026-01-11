import { ExportRepository, ExportSummaryDto } from '../../domain/repositories/ExportRepository.js';
import { ExportFormat } from '../../application/dto/ExportDto.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { MarkdownRenderVisitor } from '../../domain/models/rendering/MarkdownRenderVisitor.js';
import { HtmlRenderVisitor } from '../../domain/models/rendering/HtmlRenderVisitor.js';
import { DEFAULT_EXPORT_CONFIG, ExportConfiguration } from '../../domain/models/export/ExportConfiguration.js';
import { TimeMachine, SnapshotType, TimelineSnapshot } from '../../domain/models/TimeMachine.js';
import { ConversationExchangeExtractor } from '../../domain/services/ConversationExchangeExtractor.js';

interface MessageDto {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: {
        toolUses?: Array<{ name: string; input?: any; parameters?: any }>;
        usage?: { inputTokens: number; outputTokens: number };
    };
}

interface RawEntryDto {
    id: string;
    type: 'user' | 'assistant' | 'tool_result' | 'system' | 'file_snapshot' | 'summary' | 'queue' | 'unknown';
    content: string;
    timestamp: string;
    parentId?: string;
    metadata?: Record<string, any>;
}

interface ConversationDto {
    sessionId: string;
    projectPath: string;
    startTime: string;
    endTime?: string;
    duration: number;
    messageCount: number;
    messages: MessageDto[];
    rawEntries?: RawEntryDto[];
}

interface ConversationMetrics {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    averageDurationMs: number;
    projectCounts?: Record<string, number>;
    dateRange: {
        earliest: string;
        latest: string;
    };
}

interface SimpleExchange {
    question: string;
    answer: string;
}

export class FileExportService implements ExportRepository {
    private markdownRenderer = new MarkdownRenderVisitor();
    private htmlRenderer = new HtmlRenderVisitor();
    private config: ExportConfiguration;
    private exchangeExtractor = new ConversationExchangeExtractor();

    constructor(config: ExportConfiguration = DEFAULT_EXPORT_CONFIG) {
        this.config = config;
    }

    private ensureDirectoryExists(filePath: string): void {
        try {
            const dir = dirname(filePath);
            mkdirSync(dir, { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create directory for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async export(data: ExportSummaryDto, format: ExportFormat, outputPath: string): Promise<void> {
        switch (format) {
            case ExportFormat.JSON:
                await this.exportToJson(data, outputPath);
                break;
            case ExportFormat.MARKDOWN:
                await this.exportToEnhancedMarkdown(data, outputPath);
                break;
            case ExportFormat.SIMPLIFIED:
                await this.exportToSimplifiedMarkdown(data, outputPath);
                break;
            case ExportFormat.HTML:
                await this.exportToHtml(data, outputPath);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    private async exportToJson(data: ExportSummaryDto, outputPath: string): Promise<void> {
        this.ensureDirectoryExists(outputPath);
        writeFileSync(outputPath, JSON.stringify(data, null, 2));
    }

    private async exportToEnhancedMarkdown(data: ExportSummaryDto, outputPath: string): Promise<void> {
        this.ensureDirectoryExists(outputPath);
        let markdown = `# Claude Code Conversations\n\n`;
        markdown += `Exported on: ${data.exportDate}\n\n`;
        markdown += `Total conversations: ${data.conversations.length}\n\n`;

        if (data.metrics) {
            markdown += this.renderMetrics(data.metrics);
        }

        markdown += `---\n\n`;

        for (const conversation of data.conversations) {
            markdown += this.conversationToEnhancedMarkdown(conversation, data.includeRaw);
            markdown += `\n---\n\n`;
        }

        writeFileSync(outputPath, markdown);
    }

    private async exportToHtml(data: ExportSummaryDto, outputPath: string): Promise<void> {
        this.ensureDirectoryExists(outputPath);
        // 使用增强的HTML导出，包含新的阅读体验功能
        const enhancedConfig: ExportConfiguration = {
            ...this.config,
            html: {
                ...this.config.html,
                includeJavaScript: true,
                includeSearchBox: true,
                collapsibleSections: true,
                enableCodeCopy: true,
                responsiveDesign: true
            },
            markdown: {
                ...this.config.markdown,
                includeTableOfContents: true
            }
        };

        const html = await this.generateEnhancedHtml(data.conversations, enhancedConfig, data.includeRaw);
        writeFileSync(outputPath, html);
    }

    private async exportToSimplifiedMarkdown(data: ExportSummaryDto, outputPath: string): Promise<void> {
        this.ensureDirectoryExists(outputPath);
        let markdown = `# Claude Code Conversations (Simplified)\n\n`;
        markdown += `Exported on: ${data.exportDate}\n\n`;

        for (const conversation of data.conversations) {
            markdown += `## ${conversation.projectPath}\n\n`;
            markdown += `Session: ${conversation.sessionId}\n\n`;

            // Group messages into question-answer pairs using domain service
            const exchanges = this.extractExchangesFromDto(conversation);

            for (const exchange of exchanges) {
                if (exchange.question && !this.isToolOnlyInteraction(exchange.question)) {
                    markdown += `### Q: ${exchange.question}\n\n`;
                    if (exchange.answer) {
                        markdown += `**A:** ${exchange.answer}\n\n`;
                    }
                }
            }

            markdown += `---\n\n`;
        }

        writeFileSync(outputPath, markdown);
    }

    private conversationToEnhancedMarkdown(conversation: ConversationDto, includeRaw?: boolean): string {
        let md = `## Session: ${conversation.sessionId}\n\n`;
        md += `**Project:** ${conversation.projectPath}\n\n`;
        md += `**Start Time:** ${conversation.startTime}\n\n`;
        md += `**End Time:** ${conversation.endTime || 'Ongoing'}\n\n`;
        md += `**Duration:** ${this.formatDuration(conversation.duration)}\n\n`;
        md += `**Message Count:** ${conversation.messageCount}\n\n`;
        if (includeRaw && conversation.rawEntries) {
            md += `**Raw Entries:** ${conversation.rawEntries.length}\n\n`;
        }

        if (includeRaw && conversation.rawEntries && conversation.rawEntries.length > 0) {
            md += `### Full Transcript (Raw)\n\n`;
            for (const entry of conversation.rawEntries) {
                md += this.rawEntryToMarkdown(entry);
                md += `\n`;
            }
        } else {
            md += `### Enhanced Conversation\n\n`;
            // Use traditional message rendering for now - TODO: integrate enhanced domain model
            for (const message of conversation.messages) {
                md += this.messageToEnhancedMarkdown(message);
                md += `\n`;
            }
        }

        return md;
    }

    private messageToEnhancedMarkdown(message: MessageDto): string {
        const timestamp = new Date(message.timestamp).toLocaleString();

        if (message.type === 'user') {
            return `### 🙋 User Question (${timestamp})\n\n> ${message.content}\n\n`;
        } else {
            let content = `### 🤖 Assistant Response (${timestamp})\n\n${message.content}\n\n`;

            // Add tool usage information if available
            if (message.metadata?.toolUses && message.metadata.toolUses.length > 0) {
                content += `**🔧 Tools Used:**\n`;
                for (const tool of message.metadata.toolUses) {
                    content += `- \`${tool.name}\`\n`;
                }
                content += `\n`;
            }

            // Add usage information
            if (message.metadata?.usage) {
                content += `*💬 Tokens: ${message.metadata.usage.inputTokens} in, ${message.metadata.usage.outputTokens} out*\n\n`;
            }

            return content;
        }
    }

    private rawEntryToMarkdown(entry: RawEntryDto): string {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const label = this.getRawEntryLabel(entry.type);
        let md = `### ${label} (${timestamp})\n\n`;

        if (entry.content) {
            const lines = entry.content.split('\n').map(line => `> ${line}`).join('\n');
            md += `${lines}\n\n`;
        }

        if (entry.metadata) {
            const metadataLines = this.formatRawEntryMetadata(entry);
            if (metadataLines.length > 0) {
                md += `**Details:**\n`;
                metadataLines.forEach(line => {
                    md += `- ${line}\n`;
                });
                md += `\n`;
            }
        }

        return md;
    }

    private conversationToHtml(conversation: ConversationDto, includeRaw?: boolean): string {
        let html = `<article class="conversation">`;
        html += `<header class="conversation-header">`;
        html += `<h2>Session: ${conversation.sessionId}</h2>`;
        html += `<div class="conversation-meta">`;
        html += `<span class="project"><strong>Project:</strong> ${conversation.projectPath}</span>`;
        html += `<span class="time"><strong>Start:</strong> ${conversation.startTime}</span>`;
        html += `<span class="time"><strong>End:</strong> ${conversation.endTime || 'Ongoing'}</span>`;
        html += `<span class="duration"><strong>Duration:</strong> ${this.formatDuration(conversation.duration)}</span>`;
        html += `<span class="count"><strong>Messages:</strong> ${conversation.messageCount}</span>`;
        if (includeRaw && conversation.rawEntries) {
            html += `<span class="count"><strong>Raw Entries:</strong> ${conversation.rawEntries.length}</span>`;
        }
        html += `</div>`;
        html += `</header>`;
        html += `<div class="conversation-content">`;
        if (includeRaw && conversation.rawEntries && conversation.rawEntries.length > 0) {
            for (const entry of conversation.rawEntries) {
                html += this.rawEntryToHtml(entry);
            }
        } else {
            // Use traditional message rendering for now - TODO: integrate enhanced domain model
            for (const message of conversation.messages) {
                html += this.messageToHtml(message);
            }
        }

        html += `</div>`;
        html += `</article>`;
        return html;
    }

    private messageToHtml(message: MessageDto): string {
        const timestamp = new Date(message.timestamp).toLocaleString();

        if (message.type === 'user') {
            // Skip empty user messages (likely tool results that were filtered)
            if (!message.content || message.content.trim() === '') {
                return '';
            }

            return `<div class="element prominent user-question">
        <div class="timestamp">👤 User - ${timestamp}</div>
        <div class="content">${this.escapeHtml(message.content)}</div>
      </div>`;
        } else {
            const hasTextContent = message.content && message.content.trim() !== '';
            const hasToolUses = message.metadata?.toolUses && message.metadata.toolUses.length > 0;

            // Skip messages that have neither content nor tools
            if (!hasTextContent && !hasToolUses) {
                return '';
            }

            let html = `<div class="element ${hasTextContent ? 'standard' : 'subtle'} assistant-response">
        <div class="timestamp">🤖 Assistant - ${timestamp}</div>`;

            // Add content if available
            if (hasTextContent) {
                html += `<div class="content">${this.formatMessageContent(message.content)}</div>`;
            } else if (hasToolUses && message.metadata?.toolUses) {
                // For tool-only messages, show a brief description
                html += `<div class="content tool-only-message">
          <em>Used ${message.metadata.toolUses.length} tool${message.metadata.toolUses.length > 1 ? 's' : ''}</em>
        </div>`;
            }

            // Add tool usage information if available
            if (hasToolUses && message.metadata?.toolUses) {
                html += `<div class="tool-list">
          <strong>🔧 Tools Used:</strong>`;
                for (const tool of message.metadata.toolUses) {
                    html += `<div class="tool-item">${this.escapeHtml(tool.name)}</div>`;
                }
                html += `</div>`;
            }

            // Add usage information
            if (message.metadata?.usage) {
                html += `<div class="complexity-info">
          💬 Tokens: ${message.metadata.usage.inputTokens} in, ${message.metadata.usage.outputTokens} out
        </div>`;
            }

            html += `</div>`;
            return html;
        }
    }

    private rawEntryToHtml(entry: RawEntryDto): string {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const label = this.getRawEntryLabel(entry.type);
        const content = entry.content ? this.formatMessageContent(entry.content) : '';
        const metaLines = entry.metadata ? this.formatRawEntryMetadata(entry) : [];

        let html = `<div class="element raw-entry raw-${entry.type}">
        <div class="timestamp">${this.escapeHtml(label)} - ${timestamp}</div>`;

        if (content) {
            html += `<div class="content">${content}</div>`;
        }

        if (metaLines.length > 0) {
            html += `<div class="tool-list"><strong>Details:</strong>`;
            metaLines.forEach(line => {
                html += `<div class="tool-item">${this.escapeHtml(line)}</div>`;
            });
            html += `</div>`;
        }

        html += `</div>`;
        return html;
    }

    private getRawEntryLabel(type: RawEntryDto['type']): string {
        switch (type) {
            case 'user':
                return '👤 User';
            case 'assistant':
                return '🤖 Assistant';
            case 'tool_result':
                return '🧰 Tool Result';
            case 'system':
                return '⚙️ System';
            case 'file_snapshot':
                return '📂 File Snapshot';
            case 'summary':
                return '📝 Summary';
            case 'queue':
                return '⏱ Queue';
            default:
                return '❓ Event';
        }
    }

    private formatRawEntryMetadata(entry: RawEntryDto): string[] {
        const metadata: string[] = [];
        const meta = entry.metadata || {};

        if (entry.type === 'assistant') {
            if (meta.model) {
                metadata.push(`Model: ${meta.model}`);
            }
            if (Array.isArray(meta.toolUses) && meta.toolUses.length > 0) {
                meta.toolUses.forEach((tool: any) => {
                    const inputSummary = tool.input ? JSON.stringify(tool.input).slice(0, 120) : '';
                    metadata.push(`Tool: ${tool.name}${inputSummary ? ` (${inputSummary}...)` : ''}`);
                });
            }
            if (meta.usage) {
                metadata.push(`Tokens: ${meta.usage.inputTokens ?? 0} in, ${meta.usage.outputTokens ?? 0} out`);
            }
        }

        if (entry.type === 'tool_result') {
            if (meta.toolUseId) {
                metadata.push(`Tool Use ID: ${meta.toolUseId}`);
            }
            if (meta.isError) {
                metadata.push('Error: true');
            }
        }

        if (entry.type === 'file_snapshot') {
            const files = Array.isArray(meta.files) ? meta.files : [];
            if (files.length > 0) {
                metadata.push(`Files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '…' : ''}`);
                metadata.push(`File count: ${files.length}`);
            }
        }

        if (entry.type === 'system') {
            if (meta.subtype) {
                metadata.push(`Subtype: ${meta.subtype}`);
            }
            if (meta.level) {
                metadata.push(`Level: ${meta.level}`);
            }
        }

        if (entry.type === 'queue' && meta.operation) {
            metadata.push(`Operation: ${meta.operation}`);
        }

        if (entry.type === 'summary' && meta.leafUuid) {
            metadata.push(`Leaf: ${meta.leafUuid}`);
        }

        return metadata;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private formatMessageContent(content: string): string {
        // Convert markdown code blocks to HTML
        let formatted = content.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'text'}">${this.escapeHtml(code)}</code></pre>`;
        });

        // Convert inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    private generateHtmlTemplate(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code Conversations</title>
    <style>
        ${this.getHtmlStyles()}
    </style>
</head>
<body>`;
    }

    private getHtmlStyles(): string {
        return `
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .export-header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        .export-header h1 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 2.5em;
        }

        .export-info {
            color: #666;
            font-size: 1.1em;
            margin: 5px 0;
        }

        .conversation {
            background: white;
            margin-bottom: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .conversation-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
        }

        .conversation-header h2 {
            margin-bottom: 15px;
            font-size: 1.8em;
        }

        .conversation-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            font-size: 0.95em;
        }

        .conversation-meta span {
            background: rgba(255,255,255,0.2);
            padding: 5px 12px;
            border-radius: 20px;
        }

        .conversation-content {
            padding: 0;
        }

        .element {
            padding: 20px 25px;
            border-bottom: 1px solid #eee;
        }

        .element:last-child {
            border-bottom: none;
        }

        .element.prominent {
            background: #f8f9ff;
            border-left: 4px solid #3498db;
        }

        .element.standard {
            background: white;
        }

        .element.subtle {
            background: #f9f9f9;
            color: #666;
        }

        .raw-entry {
            background: #fffaf0;
            border-left: 4px solid #95a5a6;
        }

        .raw-entry.raw-system {
            border-left-color: #f39c12;
        }

        .raw-entry.raw-tool_result {
            border-left-color: #8e44ad;
        }

        .raw-entry.raw-file_snapshot {
            border-left-color: #16a085;
        }

        .raw-entry.raw-summary {
            border-left-color: #2980b9;
        }

        .raw-entry.raw-queue {
            border-left-color: #7f8c8d;
        }
        
        .tool-only-message {
            font-style: italic;
            color: #888;
            padding: 8px 0;
        }

        pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 15px 0;
        }

        code {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #f1f3f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
        }

        pre code {
            background: none;
            padding: 0;
        }
    `;
    }

    private renderMetricsHtml(metrics: ConversationMetrics): string {
        let html = `<section class="metrics" style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 30px;">`;
        html += `<h2 style="color: #2c3e50; margin-bottom: 20px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Conversation Metrics</h2>`;
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">`;

        html += `<div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #3498db;">`;
        html += `<span style="font-weight: 600; color: #2c3e50;">Total Conversations:</span>`;
        html += `<span style="font-size: 1.2em; color: #27ae60; margin-left: 10px;">${metrics.totalConversations}</span>`;
        html += `</div>`;

        html += `<div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #3498db;">`;
        html += `<span style="font-weight: 600; color: #2c3e50;">Total Messages:</span>`;
        html += `<span style="font-size: 1.2em; color: #27ae60; margin-left: 10px;">${metrics.totalMessages}</span>`;
        html += `</div>`;

        html += `<div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #3498db;">`;
        html += `<span style="font-weight: 600; color: #2c3e50;">Average Messages:</span>`;
        html += `<span style="font-size: 1.2em; color: #27ae60; margin-left: 10px;">${metrics.averageMessagesPerConversation.toFixed(1)}</span>`;
        html += `</div>`;

        html += `</div>`;
        html += `</section>`;
        return html;
    }

    private messageToMarkdown(message: MessageDto): string {
        const timestamp = new Date(message.timestamp).toLocaleString();

        if (message.type === 'user') {
            return `#### User (${timestamp})\n\n${message.content}\n`;
        } else {
            let content = `#### Assistant (${timestamp})\n\n`;
            content += `${message.content}\n`;

            // Add tool usage information if available
            if (message.metadata?.toolUses && message.metadata.toolUses.length > 0) {
                content += `\n**Tools Used:**\n`;
                for (const tool of message.metadata.toolUses) {
                    content += `- ${tool.name}\n`;
                }
            }

            // Add usage information
            if (message.metadata?.usage) {
                content += `\n*Tokens: ${message.metadata.usage.inputTokens} in, ${message.metadata.usage.outputTokens} out*\n`;
            }

            return content;
        }
    }

    /**
     * Adapter method to use domain service for extracting exchanges from DTO
     */
    private extractExchangesFromDto(conversationDto: ConversationDto): SimpleExchange[] {
        // For simplified export, we'll use a simple approach since the domain service
        // requires full domain models. This is temporary until we can adapt the domain service
        // to work with DTOs or create proper adapters.
        const exchanges: SimpleExchange[] = [];
        let currentQuestion = '';
        let currentAnswers: string[] = [];

        for (const message of conversationDto.messages) {
            if (message.type === 'user') {
                // If this is a tool result (not a question), add it to current answers
                if (message.content.includes('[Viewed:') || this.isToolOnlyInteraction(message.content)) {
                    currentAnswers.push(message.content);
                } else {
                    // Save previous exchange if exists
                    if (currentQuestion && currentAnswers.length > 0) {
                        exchanges.push({
                            question: currentQuestion,
                            answer: currentAnswers.join('\n\n')
                        });
                    }
                    // Start new exchange
                    currentQuestion = message.content;
                    currentAnswers = [];
                }
            } else if (message.type === 'assistant' && message.content.trim()) {
                currentAnswers.push(message.content);
            }
        }

        // Add final exchange
        if (currentQuestion && currentAnswers.length > 0) {
            exchanges.push({
                question: currentQuestion,
                answer: currentAnswers.join('\n\n')
            });
        }

        return exchanges;
    }

    private isToolOnlyInteraction(content: string): boolean {
        return content.startsWith('[Tool') ||
            content.startsWith('[Error') ||
            content.startsWith('[Viewed:') ||
            content === '[Tool interaction]';
    }

    private formatDuration(durationMs: number): string {
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    private renderMetrics(metrics: ConversationMetrics): string {
        let md = `## Conversation Metrics\n\n`;
        md += `- **Total Conversations:** ${metrics.totalConversations}\n`;
        md += `- **Total Messages:** ${metrics.totalMessages}\n`;
        md += `- **Average Messages per Conversation:** ${metrics.averageMessagesPerConversation.toFixed(1)}\n`;
        md += `- **Average Duration:** ${this.formatDuration(metrics.averageDurationMs)}\n\n`;

        if (metrics.projectCounts && Object.keys(metrics.projectCounts).length > 0) {
            md += `### Projects\n\n`;
            Object.entries(metrics.projectCounts)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .forEach(([project, count]) => {
                    md += `- **${project}:** ${count} conversations\n`;
                });
            md += `\n`;
        }

        if (metrics.dateRange.earliest && metrics.dateRange.latest) {
            md += `### Date Range\n\n`;
            md += `- **From:** ${new Date(metrics.dateRange.earliest).toLocaleDateString()}\n`;
            md += `- **To:** ${new Date(metrics.dateRange.latest).toLocaleDateString()}\n\n`;
        }

        return md;
    }

    /**
     * 生成增强的HTML导出（包含Time Machine功能）
     */
    private async generateEnhancedHtml(conversations: ConversationDto[], config: ExportConfiguration, includeRaw?: boolean): Promise<string> {
        const htmlParts: string[] = [];

        // HTML头部
        htmlParts.push(this.generateHtmlHeader(config));

        // Time Machine 控制面板
        htmlParts.push(this.generateTimeMachineControls());

        // 目录（如果启用）
        if (config.html.includeSearchBox || config.markdown.includeTableOfContents) {
            htmlParts.push(this.generateTableOfContents(conversations));
        }

        // 主要内容
        htmlParts.push('<main class="conversation-content">');

        for (const [index, conversation] of conversations.entries()) {
            // 为每个对话生成时间轴
            const timeMachine = new TimeMachine(conversation.sessionId);

            // 适配消息数据结构为TimeMachine期望的格式
            const adaptedMessages = this.adaptMessagesForTimeMachine(conversation.messages);
            const timeline = timeMachine.generateTimeline(adaptedMessages);

            // 使用增强的HTML渲染器直接处理对话
            const visitor = new HtmlRenderVisitor({
                includeMetadata: config.includeMetadata,
                includeTimestamps: config.includeTimestamps,
                compactMode: false,
                enableContentCollapse: true,
                enableCodePreview: true,
                enableToolIconification: true,
                enableTableOfContents: config.markdown.includeTableOfContents,
                maxPreviewLines: 3,
                maxCodePreviewLines: 2
            });

            // 生成时间轴HTML
            const timelineHtml = this.generateTimelineHtml(timeline, conversation.sessionId);

            // 暂时使用现有的HTML渲染逻辑，后续可以集成增强的领域模型
            const conversationHtml = this.conversationToHtml(conversation, includeRaw);

            htmlParts.push(`<article class="conversation enhanced time-machine-enabled" data-session-id="${conversation.sessionId}" id="conversation-${index}">`);
            htmlParts.push(timelineHtml);
            htmlParts.push('<div class="conversation-replay-content">');
            htmlParts.push(conversationHtml);
            htmlParts.push('</div>');
            htmlParts.push('</article>');
        }

        htmlParts.push('</main>');

        // HTML尾部
        htmlParts.push(this.generateHtmlFooter(config));

        return htmlParts.join('\n');
    }

    /**
     * 生成目录
     */
    private generateTableOfContents(conversations: ConversationDto[]): string {
        const tocEntries: string[] = [];

        conversations.forEach((conv, index) => {
            const title = conv.sessionId.substring(0, 8) + '...';
            const messageCount = conv.messageCount;
            const duration = this.formatDuration(conv.duration);

            tocEntries.push(`
        <li class="toc-entry">
          <a href="#conversation-${index}" class="toc-link">
            <span class="toc-icon">💬</span>
            <span class="toc-title">${title}</span>
            <span class="toc-meta">${messageCount} messages, ${duration}</span>
          </a>
        </li>
      `);
        });

        return `
<nav class="table-of-contents" role="navigation">
  <h2 class="toc-title">📋 Conversations</h2>
  <ul class="toc-list">
    ${tocEntries.join('')}
  </ul>
</nav>`;
    }

    /**
     * 生成搜索框
     */
    private generateSearchBox(): string {
        return `
<div class="search-container">
  <input type="text" id="searchInput" placeholder="Search conversations..." class="search-input">
  <button class="search-button">🔍</button>
</div>`;
    }

    /**
     * 生成HTML尾部
     */
    private generateHtmlFooter(config: ExportConfiguration): string {
        // JavaScript已经在头部加载，这里不需要重复
        return `
</body>
</html>`;
    }

    /**
     * 生成交互式JavaScript
     */
    private generateInteractiveJS(): string {
        return `
// 基础交互功能
function toggleContent(button) {
  const content = button.parentNode.querySelector('.content-full');
  const preview = button.parentNode.querySelector('.content-preview');
  
  if (content.style.display === 'none' || !content.style.display) {
    content.style.display = 'block';
    preview.style.display = 'none';
    button.textContent = 'Collapse';
  } else {
    content.style.display = 'none';
    preview.style.display = 'block';
    button.textContent = 'Expand';
  }
}

function toggleCode(button) {
  const codeContainer = button.closest('.code-block-container');
  const preview = codeContainer.querySelector('.code-preview');
  const full = codeContainer.querySelector('.code-full');
  
  if (full.style.display === 'none' || !full.style.display) {
    full.style.display = 'block';
    preview.style.display = 'none';
    button.textContent = 'Show Less';
  } else {
    full.style.display = 'none';
    preview.style.display = 'block';
    button.textContent = 'Show More';
  }
}

// 搜索功能
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const conversations = document.querySelectorAll('.conversation');
    
    conversations.forEach(conv => {
      const text = conv.textContent.toLowerCase();
      if (query === '' || text.includes(query)) {
        conv.style.display = 'block';
      } else {
        conv.style.display = 'none';
      }
    });
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  initSearch();
});`;
    }

    /**
     * 生成Time Machine JavaScript
     */
    private generateTimeMachineJS(): string {
        return `
// Time Machine 功能
class TimeMachineController {
  constructor() {
    this.currentConversation = null;
    this.currentTimeline = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1.0;
    this.playInterval = null;
    this.debug = localStorage.getItem('timeMachineDebug') === 'true';
    
    try {
      this.init();
    } catch (error) {
      this.logError('Failed to initialize Time Machine', error);
      this.showErrorMessage('Time Machine initialization failed. Please refresh the page.');
    }
  }
  
  init() {
    // 初始化第一个对话的时间轴
    const firstConversation = document.querySelector('.conversation.time-machine-enabled');
    if (firstConversation) {
      this.loadConversation(firstConversation);
    }
    
    // 绑定事件
    this.bindEvents();
  }
  
  bindEvents() {
    // 速度滑块
    const speedSlider = document.getElementById('speedSlider');
    const speedDisplay = document.getElementById('speedDisplay');
    
    if (speedSlider && speedDisplay) {
      speedSlider.addEventListener('input', (e) => {
        this.playbackSpeed = parseFloat(e.target.value);
        speedDisplay.textContent = this.playbackSpeed.toFixed(1) + 'x';
      });
    }
    
    // 过滤控件
    const keyPointsOnly = document.getElementById('keyPointsOnly');
    if (keyPointsOnly) {
      keyPointsOnly.addEventListener('change', (e) => {
        this.toggleKeyPointsOnly(e.target.checked);
      });
    }
    
    const typeFilter = document.getElementById('snapshotTypeFilter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.filterByType(e.target.value);
      });
    }
  }
  
  loadConversation(conversationElement) {
    this.currentConversation = conversationElement;
    const timelineContainer = conversationElement.querySelector('.timeline-container');
    if (timelineContainer) {
      this.currentTimeline = Array.from(timelineContainer.querySelectorAll('.timeline-item'));
      this.currentIndex = 0;
      this.updateDisplay();
    }
  }
  
  navigateToSnapshot(index) {
    if (index < 0 || index >= this.currentTimeline.length) return;
    
    this.currentIndex = index;
    this.updateDisplay();
    this.highlightMessage(index);
  }
  
  navigateNext() {
    if (this.currentIndex < this.currentTimeline.length - 1) {
      this.navigateToSnapshot(this.currentIndex + 1);
    }
  }
  
  navigatePrevious() {
    if (this.currentIndex > 0) {
      this.navigateToSnapshot(this.currentIndex - 1);
    }
  }
  
  navigateToStart() {
    this.navigateToSnapshot(0);
  }
  
  navigateToEnd() {
    this.navigateToSnapshot(this.currentTimeline.length - 1);
  }
  
  toggleAutoPlay() {
    const playButton = document.querySelector('.play-pause');
    const controlsPanel = document.getElementById('controlsPanel');
    
    if (this.isPlaying) {
      this.stopAutoPlay();
      playButton.textContent = '▶️';
      playButton.classList.remove('playing');
      controlsPanel?.classList.remove('playing');
    } else {
      this.startAutoPlay();
      playButton.textContent = '⏸️';
      playButton.classList.add('playing');
      controlsPanel?.classList.add('playing');
    }
  }
  
  startAutoPlay() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.scheduleNext();
  }
  
  stopAutoPlay() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearTimeout(this.playInterval);
      this.playInterval = null;
    }
  }
  
  scheduleNext() {
    if (!this.isPlaying) return;
    
    const interval = 2000 / this.playbackSpeed; // 基础间隔2秒
    
    this.playInterval = setTimeout(() => {
      if (this.isPlaying) {
        if (this.currentIndex < this.currentTimeline.length - 1) {
          this.navigateNext();
          this.scheduleNext();
        } else {
          this.stopAutoPlay();
          const playButton = document.querySelector('.play-pause');
          const controlsPanel = document.getElementById('controlsPanel');
          playButton.textContent = '▶️';
          playButton.classList.remove('playing');
          controlsPanel?.classList.remove('playing');
        }
      }
    }, interval);
  }
  
  setPlaybackSpeed(speed) {
    this.playbackSpeed = parseFloat(speed);
    const speedDisplay = document.getElementById('speedDisplay');
    if (speedDisplay) {
      speedDisplay.textContent = this.playbackSpeed.toFixed(1) + 'x';
    }
  }
  
  toggleKeyPointsOnly(enabled) {
    const timelineItems = this.currentConversation?.querySelectorAll('.timeline-item');
    if (!timelineItems) return;
    
    timelineItems.forEach(item => {
      if (enabled) {
        if (item.classList.contains('key-point')) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      } else {
        item.style.display = 'flex';
      }
    });
  }
  
  filterByType(type) {
    const timelineItems = this.currentConversation?.querySelectorAll('.timeline-item');
    if (!timelineItems) return;
    
    timelineItems.forEach(item => {
      if (type === 'all') {
        item.style.display = 'flex';
      } else {
        const itemType = item.getAttribute('data-type');
        if (itemType === type) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      }
    });
  }
  
  updateDisplay() {
    // 更新时间轴项目的激活状态
    this.currentTimeline.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // 更新进度条
    const progress = ((this.currentIndex + 1) / this.currentTimeline.length) * 100;
    const progressBar = this.currentConversation?.querySelector('.timeline-progress');
    if (progressBar) {
      progressBar.style.width = progress + '%';
    }
  }
  
  highlightMessage(index) {
    const timelineItem = this.currentTimeline[index];
    if (!timelineItem) return;
    
    const messageIndex = timelineItem.getAttribute('data-message-index');
    if (!messageIndex) return;
    
    // 移除之前的高亮
    const previousHighlight = this.currentConversation?.querySelector('.message-highlight');
    if (previousHighlight) {
      previousHighlight.classList.remove('message-highlight');
    }
    
    // 寻找对应的消息元素并高亮
    const replayContent = this.currentConversation?.querySelector('.conversation-replay-content');
    if (replayContent) {
      // 尝试多种选择器来找到消息元素
      const possibleSelectors = [
        \`.message-\${messageIndex}\`,
        \`[data-message-index="\${messageIndex}"]\`,
        \`.question:nth-child(\${parseInt(messageIndex) + 1})\`,
        \`.response:nth-child(\${parseInt(messageIndex) + 1})\`,
        \`.message:nth-child(\${parseInt(messageIndex) + 1})\`
      ];
      
      let targetMessage = null;
      for (const selector of possibleSelectors) {
        targetMessage = replayContent.querySelector(selector);
        if (targetMessage) break;
      }
      
      // 如果没找到具体消息，尝试使用nth-child
      if (!targetMessage) {
        const allElements = replayContent.querySelectorAll('*');
        const targetIndex = parseInt(messageIndex);
        if (targetIndex >= 0 && targetIndex < allElements.length) {
          targetMessage = allElements[targetIndex];
        }
      }
      
      if (targetMessage) {
        targetMessage.classList.add('message-highlight');
        targetMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 添加临时的视觉效果
        targetMessage.style.transition = 'all 0.3s ease';
        targetMessage.style.transform = 'scale(1.02)';
        setTimeout(() => {
          targetMessage.style.transform = 'scale(1)';
        }, 300);
      }
    }
  }

  // === 调试和错误处理方法 === 
  logDebug(message, data = null) {
    if (this.debug) {
      console.log('[Time Machine Debug]', message, data);
    }
  }
  
  logError(message, error) {
    console.error('[Time Machine Error]', message, error);
  }
  
  showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = \`
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      background: #ef4444; color: white; padding: 12px 20px;
      border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px; font-size: 14px; animation: slideIn 0.3s ease-out;
    \`;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    setTimeout(() => {
      errorDiv.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
  }
  
  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = \`
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      background: #10b981; color: white; padding: 12px 20px;
      border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px; font-size: 14px; animation: slideIn 0.3s ease-out;
    \`;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    setTimeout(() => {
      successDiv.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => successDiv.remove(), 300);
    }, 3000);
  }
}

// 全局控制函数和工具
let timeMachine;

function toggleTimeMachine() {
  try {
    const controlsPanel = document.getElementById('controlsPanel');
    if (controlsPanel.style.display === 'none') {
      controlsPanel.style.display = 'grid';
      timeMachine?.logDebug('Controls panel opened');
    } else {
      controlsPanel.style.display = 'none';
      timeMachine?.logDebug('Controls panel closed');
    }
  } catch (error) {
    console.error('Error toggling Time Machine controls:', error);
  }
}

function enableTimeMachineDebug() {
  localStorage.setItem('timeMachineDebug', 'true');
  console.log('Time Machine debug mode enabled. Refresh page to see debug logs.');
}

function disableTimeMachineDebug() {
  localStorage.setItem('timeMachineDebug', 'false');
  console.log('Time Machine debug mode disabled.');
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  timeMachine = new TimeMachineController();
});`;
    }

    /**
     * 适配MessageDto为TimeMachine期望的格式
     */
    private adaptMessagesForTimeMachine(messages: MessageDto[]): any[] {
        return messages.map(msg => ({
            type: msg.type, // 'user' 或 'assistant'
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
            id: msg.id,
            parentId: null // MessageDto doesn't have parentId
        }));
    }

    /**
     * 生成HTML头部
     */
    private generateHtmlHeader(config: ExportConfiguration): string {
        const theme = config.html.theme || 'light';
        const includeJs = config.html.includeJavaScript;

        return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code Conversations - Enhanced View</title>
    <style>
${this.generateEnhancedCSS(config)}
    </style>
    ${includeJs ? `<script>
        ${this.generateInteractiveJS()}
        ${this.generateTimeMachineJS()}
    </script>` : ''}
</head>
<body>
    <header class="page-header">
        <h1>🤖 Claude Code Conversations</h1>
        <p class="subtitle">Enhanced reading experience for AI-assisted development</p>
        ${config.html.includeSearchBox ? this.generateSearchBox() : ''}
    </header>`;
    }

    /**
     * 生成Time Machine控制面板
     */
    private generateTimeMachineControls(): string {
        return `
    <div class="time-machine-controls" id="timeMachineControls">
      <div class="controls-header">
        <h3>⏰ Time Machine</h3>
        <button class="toggle-button" onclick="toggleTimeMachine()">🎮 Toggle Controls</button>
      </div>
      
      <div class="controls-panel" id="controlsPanel" style="display: none;">
        <div class="playback-controls">
          <button class="control-btn" onclick="timeMachine.navigateToStart()" title="Go to start">⏮️</button>
          <button class="control-btn" onclick="timeMachine.navigatePrevious()" title="Previous">⏪</button>
          <button class="control-btn play-pause" onclick="timeMachine.toggleAutoPlay()" title="Play/Pause">▶️</button>
          <button class="control-btn" onclick="timeMachine.navigateNext()" title="Next">⏩</button>
          <button class="control-btn" onclick="timeMachine.navigateToEnd()" title="Go to end">⏭️</button>
        </div>
        
        <div class="speed-controls">
          <label>Speed: </label>
          <input type="range" id="speedSlider" min="0.1" max="3" step="0.1" value="1" 
                 onchange="timeMachine.setPlaybackSpeed(this.value)">
          <span id="speedDisplay">1.0x</span>
        </div>
        
        <div class="filter-controls">
          <label>
            <input type="checkbox" id="keyPointsOnly" onchange="timeMachine.toggleKeyPointsOnly(this.checked)">
            Key Points Only
          </label>
          <select id="snapshotTypeFilter" onchange="timeMachine.filterByType(this.value)">
            <option value="all">All Types</option>
            <option value="user-question">Questions</option>
            <option value="assistant-response">Responses</option>
            <option value="code-generation">Code Generation</option>
            <option value="tool-usage">Tool Usage</option>
            <option value="error-fix">Error Fixes</option>
          </select>
        </div>
      </div>
    </div>`;
    }

    /**
     * 生成时间轴HTML
     */
    private generateTimelineHtml(timeline: TimelineSnapshot[], conversationId: string): string {
        const timelineItems = timeline.map((snapshot, index) => {
            const typeIcon = this.getSnapshotTypeIcon(snapshot.type);
            const keyPointClass = snapshot.isKeyPoint ? 'key-point' : '';
            const fileChangesInfo = snapshot.fileChanges ?
                `<div class="file-changes">${snapshot.fileChanges.length} file(s) changed</div>` : '';

            return `
        <div class="timeline-item ${keyPointClass}" 
             data-snapshot-id="${snapshot.id}" 
             data-message-index="${snapshot.messageIndex}"
             data-type="${snapshot.type}"
             onclick="timeMachine.navigateToSnapshot(${index})">
          <div class="timeline-marker">
            <span class="type-icon">${typeIcon}</span>
            ${snapshot.isKeyPoint ? '<span class="key-indicator">⭐</span>' : ''}
          </div>
          <div class="timeline-content">
            <div class="timeline-header">
              <h4 class="snapshot-title">${this.escapeHtml(snapshot.title)}</h4>
              <span class="snapshot-time">${this.formatTime(snapshot.timestamp)}</span>
            </div>
            ${snapshot.description ? `<p class="snapshot-description">${this.escapeHtml(snapshot.description)}</p>` : ''}
            ${fileChangesInfo}
          </div>
        </div>`;
        }).join('');

        return `
    <div class="timeline-container" data-conversation-id="${conversationId}">
      <div class="timeline-header">
        <h3>📈 Conversation Timeline</h3>
        <div class="timeline-stats">
          <span class="stat">📊 ${timeline.length} snapshots</span>
          <span class="stat">⭐ ${timeline.filter(s => s.isKeyPoint).length} key points</span>
        </div>
      </div>
      <div class="timeline-track">
        <div class="timeline-progress" id="timelineProgress-${conversationId}"></div>
        <div class="timeline-items">
          ${timelineItems}
        </div>
      </div>
    </div>`;
    }

    /**
     * 获取快照类型图标
     */
    private getSnapshotTypeIcon(type: SnapshotType): string {
        const iconMap: Record<SnapshotType, string> = {
            [SnapshotType.USER_QUESTION]: '❓',
            [SnapshotType.ASSISTANT_RESPONSE]: '🤖',
            [SnapshotType.CODE_GENERATION]: '💻',
            [SnapshotType.TOOL_USAGE]: '🔧',
            [SnapshotType.ERROR_FIX]: '🐛',
            [SnapshotType.DECISION_POINT]: '🎯',
            [SnapshotType.PHASE_COMPLETION]: '✅'
        };
        return iconMap[type] || '📝';
    }

    /**
     * 格式化时间显示
     */
    private formatTime(timestamp: Date): string {
        return timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * 生成增强的CSS样式（包含Time Machine样式）
     */
    private generateEnhancedCSS(config: ExportConfiguration): string {
        return `
/* === 基础样式 === */
:root {
  --primary-color: #2563eb;
  --secondary-color: #64748b;
  --accent-color: #f59e0b;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  --bg-color: #ffffff;
  --surface-color: #f8fafc;
  --border-color: #e2e8f0;
  --text-color: #1e293b;
  --text-muted: #64748b;
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --timeline-color: #3b82f6;
  --timeline-bg: #eff6ff;
  --keypoint-color: #f59e0b;
}

[data-theme="dark"] {
  --bg-color: #0f172a;
  --surface-color: #1e293b;
  --border-color: #334155;
  --text-color: #f1f5f9;
  --text-muted: #94a3b8;
  --timeline-bg: #1e3a8a;
}

* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--bg-color);
  margin: 0;
  padding: 0;
}

/* === Time Machine 控制面板样式 === */
.time-machine-controls {
  position: sticky;
  top: 0;
  z-index: 200;
  background: var(--surface-color);
  border-bottom: 2px solid var(--timeline-color);
  padding: 1rem;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-lg);
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.controls-header h3 {
  margin: 0;
  color: var(--timeline-color);
  font-size: 1.25rem;
}

.toggle-button {
  background: var(--timeline-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.toggle-button:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.controls-panel {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 2rem;
  align-items: center;
  padding: 1rem;
  background: var(--timeline-bg);
  border-radius: 8px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.playback-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
  box-shadow: var(--shadow);
}

.control-btn:hover {
  background: var(--timeline-color);
  color: white;
  transform: scale(1.1);
}

.control-btn:active {
  transform: scale(0.95);
}

.play-pause.playing {
  background: var(--success-color);
  color: white;
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color);
}

.speed-controls input[type="range"] {
  width: 100px;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  color: var(--text-color);
}

.filter-controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.filter-controls select {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: white;
  color: var(--text-color);
}

/* === 时间轴样式 === */
.timeline-container {
  margin: 2rem 0;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.timeline-header {
  background: var(--timeline-bg);
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.timeline-header h3 {
  margin: 0;
  color: var(--timeline-color);
  font-size: 1.25rem;
}

.timeline-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  background: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.timeline-track {
  position: relative;
  padding: 2rem;
  background: white;
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 4px;
  background: var(--timeline-color);
  transition: width 0.3s ease;
  z-index: 10;
}

.timeline-items {
  position: relative;
}

.timeline-items::before {
  content: '';
  position: absolute;
  left: 2rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-color);
  z-index: 1;
}

.timeline-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 2;
}

.timeline-item:hover {
  background: var(--timeline-bg);
  transform: translateX(5px);
  box-shadow: var(--shadow);
}

.timeline-item.active {
  background: var(--timeline-color);
  color: white;
  transform: translateX(10px);
  box-shadow: var(--shadow-lg);
}

.timeline-item.key-point {
  border-left: 4px solid var(--keypoint-color);
  background: #fffbeb;
}

.timeline-item.key-point .timeline-marker {
  background: var(--keypoint-color);
}

.timeline-marker {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  background: var(--timeline-color);
  border-radius: 50%;
  color: white;
  font-size: 1.2rem;
  box-shadow: var(--shadow);
  z-index: 3;
  flex-shrink: 0;
}

.key-indicator {
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--keypoint-color);
  border-radius: 50%;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  border: 2px solid white;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.snapshot-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: inherit;
}

.snapshot-time {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-family: monospace;
  white-space: nowrap;
}

.timeline-item.active .snapshot-time {
  color: rgba(255, 255, 255, 0.8);
}

.snapshot-description {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.timeline-item.active .snapshot-description {
  color: rgba(255, 255, 255, 0.9);
}

.file-changes {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--warning-color);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  display: inline-block;
}

/* === 对话回放内容样式 === */
.conversation-replay-content {
  position: relative;
  overflow: hidden;
}

.conversation-replay-content.replaying {
  max-height: 70vh;
  overflow-y: auto;
}

.message-highlight {
  animation: highlightMessage 1s ease-out;
}

@keyframes highlightMessage {
  0% {
    background: var(--keypoint-color);
    transform: scale(1.02);
  }
  100% {
    background: transparent;
    transform: scale(1);
  }
}

/* === 页面布局 === */
.page-header {
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 2rem 1rem;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.page-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
}

.subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 1rem;
}

/* === 对话样式 === */
.conversation-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.conversation {
  margin-bottom: 3rem;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-color);
  box-shadow: var(--shadow-lg);
}

.conversation.time-machine-enabled {
  border-color: var(--timeline-color);
  border-width: 2px;
}

/* === 响应式设计 === */
@media (max-width: 1024px) {
  .controls-panel {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .timeline-items::before {
    left: 1rem;
  }
  
  .timeline-item {
    gap: 0.5rem;
  }
  
  .timeline-marker {
    width: 3rem;
    height: 3rem;
    font-size: 1rem;
  }
}

@media (max-width: 768px) {
  .conversation-content {
    padding: 1rem 0.5rem;
  }
  
  .playback-controls {
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .control-btn {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
  }
  
  .timeline-track {
    padding: 1rem;
  }
  
  .timeline-item {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .timeline-items::before {
    display: none;
  }
}

/* === 其他现有样式保持不变 === */
/* ... (保留之前的所有其他CSS样式) ... */

/* === 辅助功能 === */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* === 消息高亮样式 === */
.message-highlight {
  background: linear-gradient(135deg, 
    rgba(59, 130, 246, 0.1) 0%, 
    rgba(59, 130, 246, 0.2) 50%, 
    rgba(59, 130, 246, 0.1) 100%) !important;
  border-left: 4px solid var(--timeline-color) !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15) !important;
  transform: translateX(4px);
  animation: highlightPulse 0.6s ease-out;
}

@keyframes highlightPulse {
  0% {
    background: rgba(59, 130, 246, 0.3);
    transform: translateX(8px) scale(1.01);
  }
  50% {
    background: rgba(59, 130, 246, 0.2);
    transform: translateX(6px) scale(1.005);
  }
  100% {
    background: rgba(59, 130, 246, 0.1);
    transform: translateX(4px) scale(1);
  }
}

/* === Time Machine 增强样式 === */
.timeline-item.active {
  background: var(--timeline-bg) !important;
  border-left: 4px solid var(--timeline-color) !important;
  transform: translateX(4px);
  box-shadow: var(--shadow-lg) !important;
}

.timeline-item.active .timeline-marker {
  background: var(--timeline-color) !important;
  transform: scale(1.2);
}

.timeline-item.active .type-icon {
  animation: iconBounce 0.3s ease-out;
}

@keyframes iconBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1.1); }
}

.timeline-progress {
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* === 控制面板状态指示 === */
.controls-panel.playing {
  background: linear-gradient(135deg, 
    rgba(16, 185, 129, 0.1) 0%, 
    rgba(16, 185, 129, 0.05) 100%);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.control-btn.playing {
  background: var(--success-color) !important;
  animation: playingPulse 1.5s ease-in-out infinite;
}

@keyframes playingPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* === 通知动画 === */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* === 响应式优化 === */
@media (max-width: 768px) {
  .time-machine-controls {
    position: relative;
    padding: 0.75rem;
  }
  
  .controls-panel {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .timeline-container {
    padding: 1rem;
  }
  
  .timeline-item {
    padding: 0.75rem;
  }
  
  .message-highlight {
    transform: none;
    border-left-width: 3px;
  }
}`;
    }

    // ExportRepository interface implementation
    getSupportedFormats(): ExportFormat[] {
        return [ExportFormat.JSON, ExportFormat.MARKDOWN, ExportFormat.HTML, ExportFormat.SIMPLIFIED];
    }

    validateExportData(data: ExportSummaryDto): boolean {
        return data &&
            Array.isArray(data.conversations) &&
            Array.isArray(data.projects) &&
            typeof data.totalConversations === 'number' &&
            typeof data.totalMessages === 'number' &&
            data.exportTimestamp instanceof Date;
    }

    getDefaultOutputPath(format: ExportFormat): string {
        const timestamp = new Date().toISOString().split('T')[0];
        const extension = this.getFileExtension(format);
        return `./exports/conversations-${timestamp}${extension}`;
    }

    private getFileExtension(format: ExportFormat): string {
        switch (format) {
            case ExportFormat.JSON:
                return '.json';
            case ExportFormat.MARKDOWN:
                return '.md';
            case ExportFormat.HTML:
                return '.html';
            case ExportFormat.SIMPLIFIED:
                return '.txt';
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
}
