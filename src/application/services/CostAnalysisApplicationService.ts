import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';
import { UsageReport } from '../../domain/models/usage/UsageReport.js';
import { CcUsageParser } from '../../domain/services/usage/CcUsageParser.js';
import { UsageCostReportBuilder } from '../../domain/services/usage/UsageCostReportBuilder.js';
import {
    CcUsageCommandOptions,
    CcUsageDataSource,
    SystemCcUsageCommandRunner
} from '../../infrastructure/usage/CcUsageCommandRunner.js';

export interface CostAnalysisOptions extends CcUsageCommandOptions {
    outputPath: string;
}

export class CostAnalysisApplicationService {
    constructor(
        private readonly dataSource: CcUsageDataSource = new SystemCcUsageCommandRunner(),
        private readonly parser = new CcUsageParser(),
        private readonly builder = new UsageCostReportBuilder()
    ) {}

    async generateReport(options: CostAnalysisOptions): Promise<{ report: UsageReport; outputPath: string; command: string[] }> {
        const execution = await this.dataSource.execute(options);
        const normalized = this.parser.normalize(execution.raw, options.grouping);
        const report = this.builder.build(normalized, {
            grouping: options.grouping,
            command: execution.command,
            since: options.since,
            until: options.until
        });

        const outputPath = await this.writeReport(options.outputPath, report);
        return { report, outputPath, command: execution.command };
    }

    private async writeReport(outputPath: string, report: UsageReport): Promise<string> {
        const resolved = resolve(outputPath);
        await fs.mkdir(dirname(resolved), { recursive: true });
        await fs.writeFile(resolved, JSON.stringify(report, null, 2), 'utf-8');
        return resolved;
    }
}
