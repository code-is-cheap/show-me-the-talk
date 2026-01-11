import {
    ModelBreakdownStats,
    NormalizedProjectUsageSummary,
    NormalizedUsageData,
    NormalizedUsageEntry,
    NormalizedUsageTotals,
    UsageGrouping
} from '../../models/usage/UsageReport.js';

type RawObject = Record<string, unknown>;
type UsageBase = {
    entries: any[];
    totals?: NormalizedUsageTotals;
    metadata: Record<string, unknown>;
    projects?: Array<{ project: string; entries: any[]; totals?: NormalizedUsageTotals }>;
};

export class CcUsageParser {
    normalize(raw: unknown, grouping: UsageGrouping): NormalizedUsageData {
        const base = this.extractBase(raw, grouping);
        const entries = base.entries.map((entry, index) => this.normalizeEntry(entry, grouping, index));
        const totals = this.normalizeTotals(base.totals, entries);

        const projects = base.projects?.map((project: { project: string; entries: any[]; totals?: NormalizedUsageTotals }) => {
            const projectEntries = project.entries.map((entry: any, index: number) =>
                this.normalizeEntry(entry, grouping, index, project.project)
            );

            return {
                project: project.project,
                entries: projectEntries,
                totals: this.normalizeTotals(project.totals, projectEntries)
            } satisfies NormalizedProjectUsageSummary;
        });

        return {
            grouping,
            entries,
            totals,
            projects,
            metadata: base.metadata
        } satisfies NormalizedUsageData;
    }

    private extractBase(raw: unknown, grouping: UsageGrouping): UsageBase {
        if (raw === null || raw === undefined) {
            return { entries: [], metadata: {} };
        }

        if (Array.isArray(raw)) {
            return { entries: raw, metadata: {} };
        }

        if (typeof raw !== 'object') {
            throw new Error('ccusage output must be JSON object or array');
        }

        const obj = raw as RawObject;

        if (obj.projects && typeof obj.projects === 'object') {
            const projects: Array<{ project: string; entries: any[]; totals?: NormalizedUsageTotals }> = [];
            for (const [projectName, value] of Object.entries(obj.projects as RawObject)) {
                const projectBase = this.extractBase(value, grouping);
                projects.push({ project: projectName, entries: projectBase.entries, totals: projectBase.totals });
            }

            const baseEntries = this.extractEntriesFromObject(obj, grouping);
            return { ...baseEntries, projects };
        }

        return this.extractEntriesFromObject(obj, grouping);
    }

    private extractEntriesFromObject(obj: RawObject, grouping: UsageGrouping): UsageBase {
        const metadata: Record<string, unknown> = {};
        if (typeof obj.type === 'string') {
            metadata.type = obj.type;
        }

        const totals = this.pickTotals(obj);

        const directKey = this.getCollectionKey(grouping);
        const fallbackKeys = ['data', 'entries', 'records'];
        const groupingSpecificKeys: Record<UsageGrouping, string[]> = {
            daily: ['daily'],
            weekly: ['weekly'],
            monthly: ['monthly'],
            session: ['sessions', 'session'],
            blocks: ['blocks']
        };

        const keysToCheck = [...(groupingSpecificKeys[grouping] || []), directKey, ...fallbackKeys];

        for (const key of keysToCheck) {
            const value = obj[key];
            if (Array.isArray(value)) {
                return { entries: value, totals, metadata };
            }
        }

        if (Array.isArray(obj.sessions)) {
            return { entries: obj.sessions as any[], totals, metadata };
        }

        if (Array.isArray(obj.blocks)) {
            return { entries: obj.blocks as any[], totals, metadata };
        }

        // Some commands return a plain object keyed by date
        if (obj[grouping] && typeof obj[grouping] === 'object') {
            const mappedEntries = Object.entries(obj[grouping] as RawObject).map(([key, value]) => ({
                ...value as RawObject,
                date: (value as RawObject).date ?? key
            }));
            return { entries: mappedEntries, totals, metadata };
        }

        if ('summary' in obj && typeof obj.summary === 'object' && Array.isArray((obj.summary as RawObject).entries)) {
            const summary = obj.summary as RawObject;
            return { entries: summary.entries as any[], totals: this.pickTotals(summary), metadata };
        }

        if (Array.isArray(obj)) {
            return { entries: obj as any[], totals, metadata };
        }

        // Some responses (e.g., grouped projects summary) might only include totals
        if (!Object.values(obj).some(value => Array.isArray(value))) {
            return { entries: [], totals, metadata };
        }

        throw new Error('Unsupported ccusage output structure. Enable --json flag for structured output.');
    }

    private getCollectionKey(grouping: UsageGrouping): string {
        switch (grouping) {
            case 'daily':
                return 'daily';
            case 'weekly':
                return 'weekly';
            case 'monthly':
                return 'monthly';
            case 'session':
                return 'sessions';
            case 'blocks':
                return 'blocks';
        }
    }

    private pickTotals(obj: RawObject): NormalizedUsageTotals | undefined {
        const candidates = ['totals', 'total', 'summary'];
        for (const key of candidates) {
            const value = obj[key];
            if (value && typeof value === 'object') {
                return this.normalizeTotals(value as RawObject);
            }
        }
        return undefined;
    }

    private normalizeTotals(value: RawObject | NormalizedUsageTotals | undefined, fallbackEntries?: NormalizedUsageEntry[]): NormalizedUsageTotals | undefined {
        if (!value && !fallbackEntries) {
            return undefined;
        }

        if (!value && fallbackEntries) {
            return this.calculateTotalsFromEntries(fallbackEntries);
        }

        if (!value) {
            return undefined;
        }

        const totals = value as RawObject;
        const asNumber = (input: unknown, defaultValue = 0): number => {
            const parsed = Number(input);
            return Number.isFinite(parsed) ? parsed : defaultValue;
        };

        return {
            costUSD: asNumber(totals.costUSD ?? totals.costUsd ?? totals.totalCost ?? totals.cost ?? 0),
            inputTokens: totals.inputTokens !== undefined ? asNumber(totals.inputTokens) : undefined,
            outputTokens: totals.outputTokens !== undefined ? asNumber(totals.outputTokens) : undefined,
            cacheCreationTokens: totals.cacheCreationTokens !== undefined ? asNumber(totals.cacheCreationTokens) : undefined,
            cacheReadTokens: totals.cacheReadTokens !== undefined ? asNumber(totals.cacheReadTokens) : undefined,
            totalTokens: totals.totalTokens !== undefined ? asNumber(totals.totalTokens) : undefined,
            entryCount: totals.entryCount !== undefined ? asNumber(totals.entryCount) : undefined
        } satisfies NormalizedUsageTotals;
    }

    private calculateTotalsFromEntries(entries: NormalizedUsageEntry[]): NormalizedUsageTotals {
        return entries.reduce<NormalizedUsageTotals>((acc, entry) => {
            acc.costUSD = (acc.costUSD ?? 0) + entry.costUSD;
            acc.inputTokens = (acc.inputTokens ?? 0) + entry.inputTokens;
            acc.outputTokens = (acc.outputTokens ?? 0) + entry.outputTokens;
            acc.cacheCreationTokens = (acc.cacheCreationTokens ?? 0) + entry.cacheCreationTokens;
            acc.cacheReadTokens = (acc.cacheReadTokens ?? 0) + entry.cacheReadTokens;
            acc.totalTokens = (acc.totalTokens ?? 0) + entry.totalTokens;
            acc.entryCount = (acc.entryCount ?? 0) + 1;
            return acc;
        }, { costUSD: 0 });
    }

    private normalizeEntry(entry: any, grouping: UsageGrouping, index: number, project?: string): NormalizedUsageEntry {
        if (entry === null || entry === undefined) {
            throw new Error('Encountered empty usage entry');
        }

        const tokens = this.extractTokens(entry);
        const costUSD = this.asNumber(entry.costUSD ?? entry.costUsd ?? entry.totalCost ?? entry.cost ?? 0);
        const timeRange = entry.timeRange ?? entry.range ?? {};

        const normalized: NormalizedUsageEntry = {
            id: this.resolveId(entry, grouping, index, project),
            label: this.resolveLabel(entry, grouping, project),
            startTime: entry.startTime ?? timeRange.start ?? null,
            endTime: entry.endTime ?? timeRange.end ?? null,
            timezone: entry.timezone ?? timeRange.timezone ?? null,
            sessionId: entry.sessionId ?? entry.session ?? entry.session_id ?? undefined,
            project: project ?? entry.project ?? entry.projectName ?? entry.instance,
            costUSD,
            inputTokens: tokens.input,
            outputTokens: tokens.output,
            cacheCreationTokens: tokens.cacheCreation,
            cacheReadTokens: tokens.cacheRead,
            totalTokens: tokens.total,
            modelsUsed: this.extractModelNames(entry),
            modelBreakdown: this.normalizeModelBreakdown(entry.breakdown ?? entry.models ?? entry.model ?? entry.modelBreakdowns),
            metadata: this.extractMetadata(entry, grouping)
        };

        return normalized;
    }

    private extractTokens(entry: any) {
        const input = this.asNumber(entry.inputTokens ?? entry.tokens?.input ?? entry.inputs ?? 0);
        const output = this.asNumber(entry.outputTokens ?? entry.tokens?.output ?? entry.outputs ?? 0);
        const cacheCreation = this.asNumber(entry.cacheCreationTokens ?? entry.cacheCreateTokens ?? entry.cache?.creation ?? 0);
        const cacheRead = this.asNumber(entry.cacheReadTokens ?? entry.cacheRead ?? entry.cache?.read ?? 0);
        const explicitTotal = entry.totalTokens ?? entry.tokens?.total;
        const total = this.asNumber(explicitTotal ?? input + output + cacheCreation + cacheRead);

        return {
            input,
            output,
            cacheCreation,
            cacheRead,
            total
        };
    }

    private resolveId(entry: any, grouping: UsageGrouping, index: number, project?: string): string {
        if (typeof entry.sessionId === 'string') {
            return entry.sessionId;
        }
        if (typeof entry.blockId === 'string') {
            return entry.blockId;
        }
        if (typeof entry.id === 'string') {
            return entry.id;
        }
        const dateFields = [entry.date, entry.day, entry.month, entry.week, entry.period];
        for (const field of dateFields) {
            if (typeof field === 'string' && field.trim().length > 0) {
                return field;
            }
        }
        if (typeof entry.displayDate === 'string') {
            return entry.displayDate;
        }
        return `${project ?? grouping}-${index}`;
    }

    private resolveLabel(entry: any, grouping: UsageGrouping, project?: string): string {
        if (typeof entry.displayDate === 'string') {
            return entry.displayDate;
        }
        if (typeof entry.label === 'string') {
            return entry.label;
        }
        if (typeof entry.sessionId === 'string') {
            return entry.sessionId;
        }
        if (typeof entry.blockId === 'string') {
            return `Block ${entry.blockId}`;
        }
        if (typeof entry.date === 'string') {
            return this.formatDate(entry.date);
        }
        if (typeof entry.month === 'string') {
            return entry.month;
        }
        if (typeof entry.week === 'string') {
            return `Week ${entry.week}`;
        }
        return `${project ?? grouping}`;
    }

    private extractModelNames(entry: any): string[] | undefined {
        if (Array.isArray(entry.models)) {
            return entry.models
                .map((model: unknown) => typeof model === 'string' ? model : (model as any)?.model ?? (model as any)?.name)
                .filter(Boolean)
                .map(String);
        }

        if (Array.isArray(entry.modelsUsed)) {
            return entry.modelsUsed
                .filter((model: unknown): model is string => typeof model === 'string')
                .map((model: string) => model);
        }

        if (Array.isArray(entry.breakdown)) {
            return entry.breakdown
                .map((model: any) => model?.model)
                .filter(Boolean)
                .map(String);
        }

        if (Array.isArray(entry.modelBreakdowns)) {
            return entry.modelBreakdowns
                .map((model: any) => model?.model ?? model?.modelName)
                .filter(Boolean)
                .map(String);
        }

        if (typeof entry.model === 'string') {
            return [entry.model];
        }

        return undefined;
    }

    private normalizeModelBreakdown(raw: unknown): ModelBreakdownStats[] | undefined {
        const breakdownArray = Array.isArray(raw)
            ? raw
            : raw && typeof raw === 'object'
                ? [raw]
                : undefined;

        if (!breakdownArray) {
            return undefined;
        }

        const normalized = breakdownArray
            .map(model => {
                const obj = model as RawObject;
                if (!obj) {
                    return undefined;
                }
                const name = obj.model ?? obj.name ?? obj.modelName;
                if (typeof name !== 'string') {
                    return undefined;
                }
                const inputTokens = this.asNumber(obj.inputTokens ?? 0);
                const outputTokens = this.asNumber(obj.outputTokens ?? 0);
                const cacheCreationTokens = this.asNumber(obj.cacheCreationTokens ?? obj.cacheCreateTokens ?? 0);
                const cacheReadTokens = this.asNumber(obj.cacheReadTokens ?? obj.cacheReads ?? 0);
                const totalTokensValue = obj.totalTokens ?? obj.tokens;

                return {
                    model: name,
                    inputTokens,
                    outputTokens,
                    cacheCreationTokens,
                    cacheReadTokens,
                    totalTokens: this.asNumber(totalTokensValue ?? inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens),
                    costUSD: this.asNumber(obj.costUSD ?? obj.costUsd ?? obj.totalCost ?? obj.cost ?? 0)
                } satisfies ModelBreakdownStats;
            })
            .filter((entry): entry is ModelBreakdownStats => Boolean(entry));

        return normalized.length ? normalized : undefined;
    }

    private extractMetadata(entry: any, grouping: UsageGrouping): Record<string, unknown> | undefined {
        const metadata: Record<string, unknown> = {};
        const potentialFields = ['date', 'displayDate', 'week', 'month', 'day', 'timezone', 'project', 'projectName', 'instance'];
        for (const field of potentialFields) {
            if (entry[field] !== undefined) {
                metadata[field] = entry[field];
            }
        }

        if (grouping === 'session') {
            if (entry.title) metadata.title = entry.title;
            if (entry.toolUses) metadata.toolUses = entry.toolUses;
        }

        if (Object.keys(metadata).length === 0) {
            return undefined;
        }

        return metadata;
    }

    private formatDate(date: string): string {
        if (/^\d{8}$/.test(date)) {
            const year = date.slice(0, 4);
            const month = date.slice(4, 6);
            const day = date.slice(6, 8);
            return `${year}-${month}-${day}`;
        }
        return date;
    }

    private asNumber(value: unknown, defaultValue = 0): number {
        const num = Number(value);
        return Number.isFinite(num) ? num : defaultValue;
    }
}
