export type UsageGrouping = 'daily' | 'weekly' | 'monthly' | 'session' | 'blocks';

export interface DateRange {
    start: string | null;
    end: string | null;
}

export interface ModelBreakdownStats {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    totalTokens: number;
    costUSD: number;
}

export interface UsageEntry {
    id: string;
    label: string;
    startTime?: string | null;
    endTime?: string | null;
    timezone?: string | null;
    sessionId?: string;
    project?: string;
    costUSD: number;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    totalTokens: number;
    modelsUsed?: string[];
    modelBreakdown?: ModelBreakdownStats[];
    metadata?: Record<string, unknown>;
}

export type NormalizedUsageEntry = UsageEntry;

export interface UsageTotals {
    costUSD: number;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    totalTokens: number;
    entryCount: number;
}

export interface NormalizedUsageTotals {
    costUSD: number;
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
    totalTokens?: number;
    entryCount?: number;
}

export interface ModelUsageStats {
    model: string;
    totalTokens: number;
    totalCostUSD: number;
    shareOfTokens: number;
    shareOfCost: number;
}

export interface UsageInsight {
    id: string;
    title: string;
    description: string;
    metric: string;
    entryId?: string;
}

export type RecommendationType = 'cost_optimization' | 'model_optimization' | 'tool_optimization';
export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface UsageRecommendation {
    id: string;
    type: RecommendationType;
    priority: RecommendationPriority;
    title: string;
    description: string;
    suggestion: string;
    potentialSavingsUSD?: number;
    relatedEntryId?: string;
}

export interface ProjectUsageSummary {
    project: string;
    totals: UsageTotals;
    entries: UsageEntry[];
}

export interface UsageTopEntries {
    byCost: UsageEntry[];
    byTokens: UsageEntry[];
    byCacheReads: UsageEntry[];
}

export interface UsageSegmentStat {
    label: string;
    entryCount: number;
    totalCostUSD: number;
    totalTokens: number;
    averageCostPerEntry: number;
    shareOfCost: number;
}

export interface TokenEfficiencyMetrics {
    costPerThousandTokens: number;
    cacheHitRate: number;
    cacheVsGenerationRatio: number;
    averageTokensPerEntry: number;
}

export interface CostDistribution {
    min: number;
    max: number;
    median: number;
    percentile90: number;
    percentile99: number;
}

export interface UsageStreakStats {
    totalActiveDays: number;
    totalZeroCostDays: number;
    longestPaidRun: number;
    longestIdleGap: number;
}

export interface UsageReport {
    grouping: UsageGrouping;
    generatedAt: string;
    command: string[];
    period: DateRange;
    totals: UsageTotals;
    entries: UsageEntry[];
    averageCostPerEntry: number;
    modelUsage: ModelUsageStats[];
    insights: UsageInsight[];
    recommendations: UsageRecommendation[];
    projects?: ProjectUsageSummary[];
    extremes?: {
        highestCost?: UsageEntry;
        highestTokens?: UsageEntry;
    };
    tokenEfficiency?: TokenEfficiencyMetrics;
    topEntries?: UsageTopEntries;
    segments?: UsageSegmentStat[];
    costDistribution?: CostDistribution;
    streaks?: UsageStreakStats;
}

export interface NormalizedProjectUsageSummary {
    project: string;
    entries: NormalizedUsageEntry[];
    totals?: NormalizedUsageTotals;
}

export interface NormalizedUsageData {
    grouping: UsageGrouping;
    entries: NormalizedUsageEntry[];
    totals?: NormalizedUsageTotals;
    projects?: NormalizedProjectUsageSummary[];
    metadata?: Record<string, unknown>;
}
