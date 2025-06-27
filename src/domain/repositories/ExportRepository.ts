/**
 * Export Repository Interface
 *
 * Domain interface for exporting conversations.
 * Infrastructure layer implements this interface.
 */
import { ExportFormat } from '../../application/dto/ExportDto.js';

export interface ExportSummaryDto {
    conversations: any[];
    projects: any[];
    totalConversations: number;
    totalMessages: number;
    totalProjects: number;
    exportTimestamp: Date;
    exportDate: string;
    includeMetadata: boolean;
    metrics?: any;
}

export interface ExportRepository {
    /**
     * Export conversation data in the specified format
     */
    export(data: ExportSummaryDto, format: ExportFormat, outputPath: string): Promise<void>;

    /**
     * Get supported export formats
     */
    getSupportedFormats(): ExportFormat[];

    /**
     * Validate export data before processing
     */
    validateExportData(data: ExportSummaryDto): boolean;

    /**
     * Get default output path for given format
     */
    getDefaultOutputPath(format: ExportFormat): string;
}