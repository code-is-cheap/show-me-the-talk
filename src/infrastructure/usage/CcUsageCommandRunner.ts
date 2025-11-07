import { spawn } from 'child_process';
import { UsageGrouping } from '../../domain/models/usage/UsageReport.js';

export interface CcUsageCommandOptions {
    grouping: UsageGrouping;
    since?: string;
    until?: string;
    timezone?: string;
    locale?: string;
    order?: 'asc' | 'desc';
    mode?: 'auto' | 'calculate' | 'display';
    project?: string;
    includeBreakdown?: boolean;
    includeInstances?: boolean;
    extraArgs?: string[];
}

export interface CcUsageCommandResult {
    raw: unknown;
    command: string[];
}

export interface CcUsageDataSource {
    execute(options: CcUsageCommandOptions): Promise<CcUsageCommandResult>;
}

export class SystemCcUsageCommandRunner implements CcUsageDataSource {
    constructor(private readonly binaryName: string = process.env.CCUSAGE_BIN || 'ccusage') {}

    async execute(options: CcUsageCommandOptions): Promise<CcUsageCommandResult> {
        const args = this.buildArgs(options);
        const stdout = await this.runCommand(args);
        const trimmed = stdout.trim();
        const raw = trimmed.length ? JSON.parse(trimmed) : [];
        return { raw, command: [this.binaryName, ...args] };
    }

    private buildArgs(options: CcUsageCommandOptions): string[] {
        const args: string[] = [options.grouping, '--json'];

        if (options.order) {
            args.push('--order', options.order);
        }

        if (options.mode) {
            args.push('--mode', options.mode);
        }

        if (options.since) {
            args.push('--since', options.since);
        }

        if (options.until) {
            args.push('--until', options.until);
        }

        if (options.timezone) {
            args.push('--timezone', options.timezone);
        }

        if (options.locale) {
            args.push('--locale', options.locale);
        }

        if (options.project) {
            args.push('--project', options.project);
        }

        if (options.includeBreakdown !== false) {
            args.push('--breakdown');
        }

        if (options.includeInstances) {
            args.push('--instances');
        }

        if (options.extraArgs?.length) {
            args.push(...options.extraArgs);
        }

        return args;
    }

    private runCommand(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn(this.binaryName, args, { stdio: ['ignore', 'pipe', 'pipe'] });
            const stdoutChunks: Buffer[] = [];
            const stderrChunks: Buffer[] = [];

            child.stdout?.on('data', chunk => stdoutChunks.push(Buffer.from(chunk)));
            child.stderr?.on('data', chunk => stderrChunks.push(Buffer.from(chunk)));

            child.on('error', error => {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                    reject(new Error(`Unable to find '${this.binaryName}'. Install ccusage or set CCUSAGE_BIN.`));
                } else {
                    reject(error);
                }
            });

            child.on('close', code => {
                if (code !== 0) {
                    const stderr = Buffer.concat(stderrChunks).toString('utf-8');
                    reject(new Error(stderr || `ccusage exited with code ${code}`));
                    return;
                }
                resolve(Buffer.concat(stdoutChunks).toString('utf-8'));
            });
        });
    }
}
