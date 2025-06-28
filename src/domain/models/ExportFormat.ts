/**
 * Export Format Value Object
 *
 * Domain model representing export format options
 */

export type ExportFormat = 'json' | 'markdown' | 'html' | 'simple';

export class ExportFormatValidator {
    private static readonly VALID_FORMATS: ExportFormat[] = ['json', 'markdown', 'html', 'simple'];

    static isValid(format: string): format is ExportFormat {
        return this.VALID_FORMATS.includes(format as ExportFormat);
    }

    static getValidFormats(): ExportFormat[] {
        return [...this.VALID_FORMATS];
    }

    static getFileExtension(format: ExportFormat): string {
        const extensions: Record<ExportFormat, string> = {
            json: '.json',
            markdown: '.md',
            html: '.html',
            simple: '.txt'
        };
        
        return extensions[format];
    }

    static getDefaultFilename(format: ExportFormat): string {
        const timestamp = new Date().toISOString().split('T')[0];
        const extension = this.getFileExtension(format);
        
        return `conversations-${timestamp}${extension}`;
    }

    static getMimeType(format: ExportFormat): string {
        const mimeTypes: Record<ExportFormat, string> = {
            json: 'application/json',
            markdown: 'text/markdown',
            html: 'text/html',
            simple: 'text/plain'
        };
        
        return mimeTypes[format];
    }
}