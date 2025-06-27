import { ExportRepository, ExportSummaryDto } from '../../domain/repositories/ExportRepository.js';
import { ExportFormat } from '../../application/dto/ExportDto.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class FileExportService implements ExportRepository {
    constructor() {}

    private ensureDirectoryExists(filePath: string): void {
        const dir = dirname(filePath);
        try {
            mkdirSync(dir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }

    async export(data: ExportSummaryDto, format: ExportFormat, outputPath: string): Promise<void> {
        this.ensureDirectoryExists(outputPath);

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
        const jsonContent = JSON.stringify(data, null, 2);
        writeFileSync(outputPath, jsonContent, 'utf-8');
    }

    private async exportToEnhancedMarkdown(data: ExportSummaryDto, outputPath: string): Promise<void> {
        let content = '# Claude Code Conversations\n\n';
        content += `Generated on: ${data.exportDate}\n`;
        content += `Total Conversations: ${data.totalConversations}\n`;
        content += `Total Messages: ${data.totalMessages}\n\n`;

        for (const conversation of data.conversations) {
            content += `## ${conversation.sessionId}\n\n`;
            content += `Project: ${conversation.projectPath}\n`;
            content += `Duration: ${this.formatDuration(conversation.duration)}\n`;
            content += `Messages: ${conversation.messageCount}\n\n`;

            for (const message of conversation.messages) {
                content += `### ${message.type === 'user' ? 'User' : 'Assistant'}\n\n`;
                content += `${message.content}\n\n`;
            }
        }

        writeFileSync(outputPath, content, 'utf-8');
    }

    private async exportToSimplifiedMarkdown(data: ExportSummaryDto, outputPath: string): Promise<void> {
        let content = '# Conversation Summary\n\n';

        for (const conversation of data.conversations) {
            content += `## Conversation: ${conversation.sessionId}\n\n`;
            
            // Simple Q&A format
            let currentQuestion = '';
            for (const message of conversation.messages) {
                if (message.type === 'user') {
                    if (currentQuestion) {
                        content += `**Q:** ${currentQuestion}\n\n`;
                    }
                    currentQuestion = message.content;
                } else if (message.type === 'assistant' && currentQuestion) {
                    content += `**Q:** ${currentQuestion}\n\n`;
                    content += `**A:** ${message.content}\n\n---\n\n`;
                    currentQuestion = '';
                }
            }
        }

        writeFileSync(outputPath, content, 'utf-8');
    }

    private async exportToHtml(data: ExportSummaryDto, outputPath: string): Promise<void> {
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code Conversations</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .conversation { border: 1px solid #ddd; margin: 20px 0; padding: 15px; border-radius: 5px; }
        .message { margin: 10px 0; padding: 10px; border-radius: 3px; }
        .user { background-color: #f0f8ff; }
        .assistant { background-color: #f8f8f8; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 2px; }
    </style>
</head>
<body>`;

        html += `<h1>Claude Code Conversations</h1>`;
        html += `<p>Generated on: ${data.exportDate}</p>`;
        html += `<p>Total Conversations: ${data.totalConversations}</p>`;
        html += `<p>Total Messages: ${data.totalMessages}</p>`;

        for (const conversation of data.conversations) {
            html += `<div class="conversation">`;
            html += `<h2>${conversation.sessionId}</h2>`;
            html += `<p><strong>Project:</strong> ${conversation.projectPath}</p>`;
            html += `<p><strong>Duration:</strong> ${this.formatDuration(conversation.duration)}</p>`;

            for (const message of conversation.messages) {
                html += `<div class="message ${message.type}">`;
                html += `<strong>${message.type === 'user' ? 'User' : 'Assistant'}:</strong><br>`;
                html += this.formatMessageContent(message.content);
                html += `</div>`;
            }

            html += `</div>`;
        }

        html += `</body></html>`;
        writeFileSync(outputPath, html, 'utf-8');
    }

    private formatMessageContent(content: string): string {
        // Simple code block handling
        return content
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    private formatDuration(durationMs: number): string {
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    getSupportedFormats(): ExportFormat[] {
        return [ExportFormat.JSON, ExportFormat.MARKDOWN, ExportFormat.SIMPLIFIED, ExportFormat.HTML];
    }

    validateExportData(data: ExportSummaryDto): boolean {
        return data && Array.isArray(data.conversations) && data.conversations.length >= 0;
    }

    getDefaultOutputPath(format: ExportFormat): string {
        const extension = this.getFileExtension(format);
        return `conversations.${extension}`;
    }

    private getFileExtension(format: ExportFormat): string {
        switch (format) {
            case ExportFormat.JSON:
                return 'json';
            case ExportFormat.MARKDOWN:
                return 'md';
            case ExportFormat.SIMPLIFIED:
                return 'md';
            case ExportFormat.HTML:
                return 'html';
            default:
                return 'txt';
        }
    }
}