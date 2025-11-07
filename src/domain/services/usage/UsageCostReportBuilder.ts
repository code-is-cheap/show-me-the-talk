import {
    CostDistribution,
    DateRange,
    ModelUsageStats,
    NormalizedProjectUsageSummary,
    NormalizedUsageData,
    NormalizedUsageTotals,
    ProjectUsageSummary,
    TokenEfficiencyMetrics,
    UsageEntry,
    UsageGrouping,
    UsageInsight,
    UsageRecommendation,
    UsageReport,
    UsageSegmentStat,
    UsageStreakStats,
    UsageTopEntries,
    UsageTotals
} from '../../models/usage/UsageReport.js';

export interface UsageReportBuildContext {
    grouping: UsageGrouping;
    command: string[];
    since?: string;
    until?: string;
}

interface TrendInfo {
    direction: 'up' | 'down';
    percent: number;
}

export class UsageCostReportBuilder {
    build(data: NormalizedUsageData, context: UsageReportBuildContext): UsageReport {
        const totals = this.toUsageTotals(data.entries, data.totals);
        const modelUsage = this.buildModelUsage(data.entries);
        const topEntries = this.buildTopEntries(data.entries);
        const costDistribution = this.buildCostDistribution(data.entries);
        const tokenEfficiency = this.buildTokenEfficiency(totals);
        const streaks = this.buildStreaks(data.entries);
        const segments = this.buildSegments(data.entries, totals);

        const insights = this.buildInsights(data.entries, context.grouping, costDistribution, segments, tokenEfficiency);
        const recommendations = this.buildRecommendations(modelUsage, insights, data.entries, totals, segments, tokenEfficiency);
        const projects = this.buildProjectSummaries(data.projects);
        const extremes = this.buildExtremes(data.entries);

        return {
            grouping: context.grouping,
            generatedAt: new Date().toISOString(),
            command: context.command,
            period: this.derivePeriod(data.entries, context),
            totals,
            entries: data.entries,
            averageCostPerEntry: totals.entryCount > 0 ? totals.costUSD / totals.entryCount : 0,
            modelUsage,
            insights,
            recommendations,
            projects,
            extremes,
            topEntries,
            costDistribution,
            tokenEfficiency,
            streaks,
            segments
        } satisfies UsageReport;
    }

    private derivePeriod(entries: UsageEntry[], context: UsageReportBuildContext): DateRange {
        return {
            start: this.resolveBoundary(entries, context.since, 'start'),
            end: this.resolveBoundary(entries, context.until, 'end')
        };
    }

    private resolveBoundary(entries: UsageEntry[], override: string | undefined, mode: 'start' | 'end'): string | null {
        if (override) {
            return this.formatDateInput(override);
        }

        if (!entries.length) {
            return null;
        }

        const index = mode === 'start' ? 0 : entries.length - 1;
        const entry = entries[index];
        const preferred = mode === 'start' ? entry.startTime : entry.endTime;
        if (preferred) {
            return preferred;
        }

        if (entry.metadata) {
            const candidate = this.pickMetadataDate(entry.metadata);
            if (candidate) {
                return candidate;
            }
        }

        return null;
    }

    private pickMetadataDate(metadata: Record<string, unknown>): string | null {
        const fields = ['date', 'day', 'displayDate', 'month'];
        for (const field of fields) {
            if (typeof metadata[field] === 'string') {
                return this.formatDateInput(metadata[field] as string);
            }
        }
        return null;
    }

    private formatDateInput(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }

        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        if (/^\d{8}$/.test(trimmed)) {
            const year = trimmed.slice(0, 4);
            const month = trimmed.slice(4, 6);
            const day = trimmed.slice(6, 8);
            return `${year}-${month}-${day}`;
        }

        return trimmed;
    }

    private toUsageTotals(entries: UsageEntry[], totals?: NormalizedUsageTotals): UsageTotals {
        const aggregated = entries.reduce(
            (acc, entry) => {
                acc.costUSD += entry.costUSD;
                acc.inputTokens += entry.inputTokens;
                acc.outputTokens += entry.outputTokens;
                acc.cacheCreationTokens += entry.cacheCreationTokens;
                acc.cacheReadTokens += entry.cacheReadTokens;
                acc.totalTokens += entry.totalTokens;
                return acc;
            },
            {
                costUSD: 0,
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                totalTokens: 0
            }
        );

        return {
            costUSD: totals?.costUSD ?? aggregated.costUSD,
            inputTokens: totals?.inputTokens ?? aggregated.inputTokens,
            outputTokens: totals?.outputTokens ?? aggregated.outputTokens,
            cacheCreationTokens: totals?.cacheCreationTokens ?? aggregated.cacheCreationTokens,
            cacheReadTokens: totals?.cacheReadTokens ?? aggregated.cacheReadTokens,
            totalTokens: totals?.totalTokens ?? aggregated.totalTokens,
            entryCount: totals?.entryCount ?? entries.length
        } satisfies UsageTotals;
    }

    private buildModelUsage(entries: UsageEntry[]): ModelUsageStats[] {
        const totals = entries.reduce(
            (acc, entry) => {
                acc.tokens += entry.totalTokens;
                acc.cost += entry.costUSD;
                return acc;
            },
            { tokens: 0, cost: 0 }
        );

        const perModel = new Map<string, { tokens: number; cost: number }>();

        for (const entry of entries) {
            if (entry.modelBreakdown?.length) {
                for (const breakdown of entry.modelBreakdown) {
                    const stats = perModel.get(breakdown.model) || { tokens: 0, cost: 0 };
                    stats.tokens += breakdown.totalTokens;
                    stats.cost += breakdown.costUSD;
                    perModel.set(breakdown.model, stats);
                }
            } else if (entry.modelsUsed?.length === 1) {
                const model = entry.modelsUsed[0];
                const stats = perModel.get(model) || { tokens: 0, cost: 0 };
                stats.tokens += entry.totalTokens;
                stats.cost += entry.costUSD;
                perModel.set(model, stats);
            }
        }

        if (!perModel.size && totals.cost > 0) {
            perModel.set('unknown', { tokens: totals.tokens, cost: totals.cost });
        }

        return Array.from(perModel.entries())
            .map(([model, stats]) => ({
                model,
                totalTokens: stats.tokens,
                totalCostUSD: stats.cost,
                shareOfTokens: totals.tokens > 0 ? stats.tokens / totals.tokens : 0,
                shareOfCost: totals.cost > 0 ? stats.cost / totals.cost : 0
            }))
            .sort((a, b) => b.totalCostUSD - a.totalCostUSD);
    }

    private buildInsights(
        entries: UsageEntry[],
        grouping: UsageGrouping,
        distribution?: CostDistribution,
        segments?: UsageSegmentStat[],
        tokenEfficiency?: TokenEfficiencyMetrics
    ): UsageInsight[] {
        if (!entries.length) {
            return [];
        }

        const highestCost = entries.reduce((max, entry) => entry.costUSD > max.costUSD ? entry : max, entries[0]);
        const highestTokens = entries.reduce((max, entry) => entry.totalTokens > max.totalTokens ? entry : max, entries[0]);

        const insights: UsageInsight[] = [
            {
                id: 'insight-highest-cost',
                title: `Most expensive ${grouping === 'session' ? 'session' : 'period'}`,
                description: `${highestCost.label} consumed $${highestCost.costUSD.toFixed(2)} of usage.`,
                metric: `$${highestCost.costUSD.toFixed(2)}`,
                entryId: highestCost.id
            },
            {
                id: 'insight-highest-tokens',
                title: 'Peak token consumption',
                description: `${highestTokens.label} used ${highestTokens.totalTokens.toLocaleString()} tokens.`,
                metric: `${highestTokens.totalTokens.toLocaleString()} tokens`,
                entryId: highestTokens.id
            }
        ];

        const trend = this.calculateTrend(entries);
        if (trend) {
            insights.push({
                id: 'insight-trend',
                title: trend.direction === 'up' ? 'Costs are trending upward' : 'Costs are decreasing',
                description: `Recent average spend changed by ${trend.percent.toFixed(1)}% compared to the previous period.`,
                metric: `${trend.direction === 'up' ? '+' : '-'}${trend.percent.toFixed(1)}%`
            });
        }

        if (distribution) {
            insights.push({
                id: 'insight-percentiles',
                title: 'Cost distribution spread',
                description: `Typical spend is $${distribution.median.toFixed(2)} per period, but the top 10% spikes reach $${distribution.percentile90.toFixed(2)}+.`,
                metric: `p90 $${distribution.percentile90.toFixed(2)}`
            });
        }

        const weekdaySegment = segments?.find(segment => segment.label === 'Weekdays');
        const weekendSegment = segments?.find(segment => segment.label === 'Weekends');
        if (weekdaySegment && weekendSegment && weekendSegment.entryCount > 0) {
            const delta = weekendSegment.averageCostPerEntry - weekdaySegment.averageCostPerEntry;
            if (Math.abs(delta) >= 5) {
                insights.push({
                    id: 'insight-weekend-shift',
                    title: weekendSegment.averageCostPerEntry > weekdaySegment.averageCostPerEntry ? 'Weekends are pricier' : 'Weekdays dominate spend',
                    description: `Weekend sessions average $${weekendSegment.averageCostPerEntry.toFixed(2)} vs $${weekdaySegment.averageCostPerEntry.toFixed(2)} on weekdays.`,
                    metric: `${delta >= 0 ? '+' : '-'}$${Math.abs(delta).toFixed(2)}`
                });
            }
        }

        if (tokenEfficiency) {
            insights.push({
                id: 'insight-efficiency',
                title: 'Token efficiency snapshot',
                description: `Blended cost is $${tokenEfficiency.costPerThousandTokens.toFixed(2)} per 1K tokens with a cache hit rate of ${(tokenEfficiency.cacheHitRate * 100).toFixed(1)}%.`,
                metric: `$${tokenEfficiency.costPerThousandTokens.toFixed(2)}/1K`
            });
        }

        return insights;
    }

    private buildRecommendations(
        modelUsage: ModelUsageStats[],
        _insights: UsageInsight[],
        entries: UsageEntry[],
        totals: UsageTotals,
        segments?: UsageSegmentStat[],
        tokenEfficiency?: TokenEfficiencyMetrics
    ): UsageRecommendation[] {
        if (!entries.length) {
            return [];
        }

        const recommendations: UsageRecommendation[] = [];
        const averageCost = totals.entryCount > 0 ? totals.costUSD / totals.entryCount : 0;
        const highestCost = entries.reduce((max, entry) => entry.costUSD > max.costUSD ? entry : max, entries[0]);

        if (highestCost.costUSD > averageCost * 1.5 && highestCost.costUSD > 1) {
            recommendations.push({
                id: 'rec-review-spike',
                type: 'cost_optimization',
                priority: 'medium',
                title: 'Review high-cost spike',
                description: `${highestCost.label} cost $${highestCost.costUSD.toFixed(2)}, which is ${(highestCost.costUSD / Math.max(averageCost, 0.01)).toFixed(1)}× your average period.`,
                suggestion: 'Audit this period to confirm model selection and reduce unnecessary iterations.',
                potentialSavingsUSD: parseFloat(Math.max(highestCost.costUSD - averageCost, 0).toFixed(4)),
                relatedEntryId: highestCost.id
            });
        }

        const [topModel, secondModel] = modelUsage;
        if (topModel && (!secondModel || topModel.shareOfCost >= 0.75)) {
            recommendations.push({
                id: 'rec-model-diversify',
                type: 'model_optimization',
                priority: 'medium',
                title: `${topModel.model} dominates spending`,
                description: `${(topModel.shareOfCost * 100).toFixed(1)}% of your spend is on ${topModel.model}.`,
                suggestion: 'Try routing exploratory or bulk tasks through a lighter model (e.g., Claude 3 Haiku) to lower blended cost.',
                potentialSavingsUSD: parseFloat((totals.costUSD * 0.1).toFixed(4))
            });
        }

        const trend = this.calculateTrend(entries);
        if (trend && trend.direction === 'up' && trend.percent >= 20) {
            recommendations.push({
                id: 'rec-guardrail',
                type: 'cost_optimization',
                priority: 'high',
                title: 'Costs accelerating',
                description: `Recent spend is ${trend.percent.toFixed(1)}% higher than the previous window.`,
                suggestion: 'Set spend guardrails or split large sessions to keep experiments focused.'
            });
        }

        const weekendSegment = segments?.find(segment => segment.label === 'Weekends');
        const weekdaySegment = segments?.find(segment => segment.label === 'Weekdays');
        if (weekendSegment && weekdaySegment && weekendSegment.shareOfCost > 0.4) {
            recommendations.push({
                id: 'rec-weekend-allocation',
                type: 'cost_optimization',
                priority: 'medium',
                title: 'Weekend spending surge',
                description: `Weekends account for ${(weekendSegment.shareOfCost * 100).toFixed(1)}% of your spend despite fewer sessions.`,
                suggestion: 'Move exploratory work to weekdays where support and reviews are available.'
            });
        }

        if (tokenEfficiency && tokenEfficiency.cacheHitRate > 0.85) {
            recommendations.push({
                id: 'rec-cache-validation',
                type: 'tool_optimization',
                priority: 'low',
                title: 'Extremely high cache hit rate',
                description: `Cache reads make up ${(tokenEfficiency.cacheHitRate * 100).toFixed(1)}% of activity.`,
                suggestion: 'Validate if large cached contexts can be trimmed or refreshed to avoid stale context drift.'
            });
        }

        return recommendations;
    }

    private buildProjectSummaries(projects?: NormalizedProjectUsageSummary[]): ProjectUsageSummary[] | undefined {
        if (!projects?.length) {
            return undefined;
        }

        return projects.map(project => ({
            project: project.project,
            totals: this.toUsageTotals(project.entries, project.totals),
            entries: project.entries
        }));
    }

    private buildExtremes(entries: UsageEntry[]) {
        if (!entries.length) {
            return undefined;
        }

        const highestCost = entries.reduce((max, entry) => entry.costUSD > max.costUSD ? entry : max, entries[0]);
        const highestTokens = entries.reduce((max, entry) => entry.totalTokens > max.totalTokens ? entry : max, entries[0]);

        return {
            highestCost,
            highestTokens
        };
    }

    private buildTopEntries(entries: UsageEntry[]): UsageTopEntries | undefined {
        if (!entries.length) {
            return undefined;
        }

        const topByCost = [...entries].sort((a, b) => b.costUSD - a.costUSD).slice(0, 3);
        const topByTokens = [...entries].sort((a, b) => b.totalTokens - a.totalTokens).slice(0, 3);
        const topByCache = [...entries].sort((a, b) => b.cacheReadTokens - a.cacheReadTokens).slice(0, 3);

        return { byCost: topByCost, byTokens: topByTokens, byCacheReads: topByCache } satisfies UsageTopEntries;
    }

    private buildCostDistribution(entries: UsageEntry[]): CostDistribution | undefined {
        if (!entries.length) {
            return undefined;
        }

        const costs = entries.map(entry => entry.costUSD).sort((a, b) => a - b);
        const percentile = (p: number) => {
            const index = (costs.length - 1) * p;
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            if (lower === upper) {
                return costs[lower];
            }
            const weight = index - lower;
            return costs[lower] * (1 - weight) + costs[upper] * weight;
        };

        return {
            min: costs[0],
            max: costs[costs.length - 1],
            median: percentile(0.5),
            percentile90: percentile(0.9),
            percentile99: percentile(0.99)
        } satisfies CostDistribution;
    }

    private buildTokenEfficiency(totals: UsageTotals): TokenEfficiencyMetrics | undefined {
        if (!totals.entryCount || totals.entryCount === 0) {
            return undefined;
        }

        const tokenBase = totals.totalTokens || 0;
        if (tokenBase === 0 && totals.costUSD === 0) {
            return undefined;
        }

        const generationTokens = (totals.inputTokens ?? 0) + (totals.outputTokens ?? 0);
        const cacheTokens = (totals.cacheReadTokens ?? 0) + (totals.cacheCreationTokens ?? 0);
        const cacheHitRate = cacheTokens > 0 ? (totals.cacheReadTokens ?? 0) / cacheTokens : 0;
        const ratio = cacheTokens > 0 ? generationTokens / cacheTokens : 0;
        const costPerThousand = tokenBase > 0 ? (totals.costUSD / tokenBase) * 1000 : 0;

        return {
            costPerThousandTokens: costPerThousand,
            cacheHitRate,
            cacheVsGenerationRatio: ratio,
            averageTokensPerEntry: tokenBase / totals.entryCount
        } satisfies TokenEfficiencyMetrics;
    }

    private buildStreaks(entries: UsageEntry[]): UsageStreakStats | undefined {
        if (!entries.length) {
            return undefined;
        }

        let currentRun = 0;
        let currentGap = 0;
        let longestRun = 0;
        let longestGap = 0;
        let activeDays = 0;
        let zeroCostDays = 0;

        for (const entry of entries) {
            if (entry.costUSD > 0.01) {
                activeDays++;
                currentRun++;
                currentGap = 0;
                longestRun = Math.max(longestRun, currentRun);
            } else {
                zeroCostDays++;
                currentGap++;
                currentRun = 0;
                longestGap = Math.max(longestGap, currentGap);
            }
        }

        return {
            totalActiveDays: activeDays,
            totalZeroCostDays: zeroCostDays,
            longestPaidRun: longestRun,
            longestIdleGap: longestGap
        } satisfies UsageStreakStats;
    }

    private buildSegments(entries: UsageEntry[], totals: UsageTotals): UsageSegmentStat[] | undefined {
        if (!entries.length || totals.costUSD === 0) {
            return undefined;
        }

        const definitions: Array<{ label: string; filter: (entry: UsageEntry) => boolean }> = [
            { label: 'Weekdays', filter: entry => this.isWeekday(entry) },
            { label: 'Weekends', filter: entry => this.isWeekend(entry) },
            { label: 'Cache-Heavy Days', filter: entry => entry.cacheReadTokens > (entry.inputTokens + entry.outputTokens) * 4 },
            { label: 'Generation-Heavy Days', filter: entry => entry.cacheReadTokens < entry.inputTokens + entry.outputTokens }
        ];

        const segmentStats: UsageSegmentStat[] = [];

        for (const definition of definitions) {
            const scoped = entries.filter(definition.filter);
            if (!scoped.length) {
                continue;
            }

            const totalsScoped = scoped.reduce(
                (acc, entry) => {
                    acc.cost += entry.costUSD;
                    acc.tokens += entry.totalTokens;
                    return acc;
                },
                { cost: 0, tokens: 0 }
            );

            segmentStats.push({
                label: definition.label,
                entryCount: scoped.length,
                totalCostUSD: totalsScoped.cost,
                totalTokens: totalsScoped.tokens,
                averageCostPerEntry: totalsScoped.cost / scoped.length,
                shareOfCost: totalsScoped.cost / totals.costUSD
            });
        }

        return segmentStats.length ? segmentStats : undefined;
    }

    private isWeekday(entry: UsageEntry): boolean {
        const date = this.parseEntryDate(entry);
        if (!date) {
            return true;
        }
        const day = date.getDay();
        return day >= 1 && day <= 5;
    }

    private isWeekend(entry: UsageEntry): boolean {
        const date = this.parseEntryDate(entry);
        if (!date) {
            return false;
        }
        const day = date.getDay();
        return day === 0 || day === 6;
    }

    private parseEntryDate(entry: UsageEntry): Date | null {
        const raw = entry.metadata?.date ?? entry.metadata?.day ?? entry.label ?? entry.id;
        if (typeof raw !== 'string') {
            return null;
        }
        const iso = raw.length === 8 && /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
        const timestamp = Date.parse(iso);
        if (Number.isNaN(timestamp)) {
            return null;
        }
        return new Date(timestamp);
    }

    private calculateTrend(entries: UsageEntry[]): TrendInfo | null {
        if (entries.length < 4) {
            return null;
        }

        const midpoint = Math.floor(entries.length / 2);
        const older = entries.slice(0, midpoint);
        const recent = entries.slice(midpoint);

        if (!older.length || !recent.length) {
            return null;
        }

        const avgOld = older.reduce((sum, entry) => sum + entry.costUSD, 0) / older.length;
        const avgRecent = recent.reduce((sum, entry) => sum + entry.costUSD, 0) / recent.length;

        if (avgOld === 0) {
            return null;
        }

        const diff = avgRecent - avgOld;
        const percent = (diff / avgOld) * 100;

        if (Math.abs(percent) < 10) {
            return null;
        }

        return {
            direction: percent >= 0 ? 'up' : 'down',
            percent: Math.abs(percent)
        };
    }
}
