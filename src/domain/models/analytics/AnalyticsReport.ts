import { WordCloudData, WordCloudMode } from './WordCloudData.js';
import { ClusterCollection, ClusterType } from './SemanticCluster.js';
import { PrivacySettings } from './PrivacySettings.js';
import { HeatmapData } from '../../services/analytics/ConversationHeatmapService.js';
import { AchievementResult } from '../../services/analytics/AchievementService.js';
import { DeveloperPersona } from '../../services/analytics/DeveloperPersonaService.js';
import { StoryCard } from '../../services/analytics/WrappedStoryService.js';
import { HourlyActivitySummary } from '../../services/analytics/HourlyActivityAnalyzer.js';

/**
 * Timeline data point for evolution analysis
 */
export interface TimelineDataPoint {
    readonly date: Date;
    readonly keywords: string[];
    readonly techStack: string[];
    readonly conversationCount: number;
    readonly messageCount: number;
}

/**
 * Overall statistics for the analyzed conversations
 */
export interface AnalyticsStatistics {
    readonly totalConversations: number;
    readonly totalMessages: number;
    readonly totalWords: number;
    readonly averageMessagesPerConversation: number;
    readonly averageWordsPerMessage: number;
    readonly dateRange: {
        start: Date;
        end: Date;
    };
    readonly topProjects: Array<{ name: string; count: number }>;
    readonly mostActiveDay: { date: Date; count: number } | null;
    readonly mostActiveHour: { hour: number; count: number } | null;
}

/**
 * Insights generated from analysis
 */
export interface AnalyticsInsight {
    readonly type: 'observation' | 'recommendation' | 'trend';
    readonly title: string;
    readonly description: string;
    readonly importance: 'low' | 'medium' | 'high';
    readonly evidence: string[];
}

export type SentenceIntent = 'question' | 'request' | 'issue' | 'learning' | 'planning' | 'statement';
export type SentenceSentiment = 'positive' | 'neutral' | 'negative';

export interface SentencePatternStat {
    readonly sentence: string;
    readonly normalized: string;
    readonly frequency: number;
    readonly intent: SentenceIntent;
    readonly sentiment: SentenceSentiment;
    readonly averageLength: number;
    readonly tags: string[];
    readonly conversationCount: number;
    readonly sampleContexts: string[];
}

export interface SentenceIntentBreakdown {
    readonly intent: SentenceIntent;
    readonly count: number;
    readonly percentage: number;
}

export interface SentenceAnalysisSummary {
    readonly totalSentences: number;
    readonly uniqueSentences: number;
    readonly averageSentenceLength: number;
    readonly averageSentencesPerConversation: number;
    readonly intentBreakdown: SentenceIntentBreakdown[];
    readonly topSentences: SentencePatternStat[];
    readonly topQuestions: SentencePatternStat[];
    readonly troubleshootingSentences: SentencePatternStat[];
}

/**
 * Complete analytics report combining all analysis results
 */
export class AnalyticsReport {
    constructor(
        public readonly wordCloud: WordCloudData,
        public readonly techStackClusters: ClusterCollection,
        public readonly taskTypeClusters: ClusterCollection,
        public readonly topicClusters: ClusterCollection,
        public readonly timeline: TimelineDataPoint[],
        public readonly statistics: AnalyticsStatistics,
        public readonly insights: AnalyticsInsight[],
        public readonly privacySettings: PrivacySettings,
        public readonly generatedAt: Date = new Date(),
        public readonly version: string = '1.0.0',
        public readonly heatmap?: HeatmapData,
        public readonly achievements?: AchievementResult,
        public readonly persona?: DeveloperPersona,
        public readonly wrappedStory?: StoryCard[],
        public readonly sentencePatterns?: SentenceAnalysisSummary,
        public readonly hourlyActivity?: HourlyActivitySummary
    ) {}

    /**
     * Get a summary of the report
     */
    getSummary(): string {
        const { totalConversations, totalMessages, totalWords, dateRange } = this.statistics;
        const topClusters = this.topicClusters.getLargestClusters(3);
        const topTech = this.techStackClusters.getLargestClusters(3);

        return `
Analyzed ${totalConversations} conversations with ${totalMessages} messages and ${totalWords} words.
Date range: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}.

Top Topics: ${topClusters.map(c => c.label).join(', ')}
Top Technologies: ${topTech.map(c => c.label).join(', ')}

${this.insights.length} insights generated.
        `.trim();
    }

    /**
     * Get insights by importance level
     */
    getInsightsByImportance(importance: 'low' | 'medium' | 'high'): AnalyticsInsight[] {
        return this.insights.filter(i => i.importance === importance);
    }

    /**
     * Get high-importance insights only
     */
    getKeyInsights(): AnalyticsInsight[] {
        return this.getInsightsByImportance('high');
    }

    /**
     * Get timeline data for a specific date range
     */
    getTimelineForRange(start: Date, end: Date): TimelineDataPoint[] {
        return this.timeline.filter(
            point => point.date >= start && point.date <= end
        );
    }

    /**
     * Get technology evolution over time
     */
    getTechEvolution(): Map<string, number[]> {
        const techEvolution = new Map<string, number[]>();

        this.timeline.forEach(point => {
            point.techStack.forEach(tech => {
                if (!techEvolution.has(tech)) {
                    techEvolution.set(tech, []);
                }
                techEvolution.get(tech)!.push(point.conversationCount);
            });
        });

        return techEvolution;
    }

    /**
     * Get most used technologies
     */
    getMostUsedTechnologies(limit: number = 10): Array<{ tech: string; count: number }> {
        const techCounts = new Map<string, number>();

        this.timeline.forEach(point => {
            point.techStack.forEach(tech => {
                techCounts.set(tech, (techCounts.get(tech) || 0) + 1);
            });
        });

        return Array.from(techCounts.entries())
            .map(([tech, count]) => ({ tech, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Get learning trajectory (topics over time)
     */
    getLearningTrajectory(): Array<{ period: string; topics: string[] }> {
        // Group timeline by month
        const monthlyTopics = new Map<string, Set<string>>();

        this.timeline.forEach(point => {
            const monthKey = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyTopics.has(monthKey)) {
                monthlyTopics.set(monthKey, new Set());
            }

            point.keywords.forEach(keyword => {
                monthlyTopics.get(monthKey)!.add(keyword);
            });
        });

        return Array.from(monthlyTopics.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([period, topics]) => ({
                period,
                topics: Array.from(topics).slice(0, 10)
            }));
    }

    /**
     * Export report to JSON format
     */
    toJSON(): Record<string, any> {
        return {
            version: this.version,
            generatedAt: this.generatedAt.toISOString(),
            privacyLevel: this.privacySettings.level,
            statistics: this.statistics,
            wordCloud: {
                mode: this.wordCloud.mode,
                topWords: this.wordCloud.getTopEntries(50),
                vocabularyRichness: this.wordCloud.getVocabularyRichness()
            },
            clusters: {
                techStack: {
                    total: this.techStackClusters.clusters.length,
                    largest: this.techStackClusters.getLargestClusters(5).map(c => ({
                        label: c.label,
                        size: c.getSize(),
                        keywords: c.getTopKeywords(10)
                    }))
                },
                taskType: {
                    total: this.taskTypeClusters.clusters.length,
                    distribution: Object.fromEntries(this.taskTypeClusters.getDistribution())
                },
                topics: {
                    total: this.topicClusters.clusters.length,
                    largest: this.topicClusters.getLargestClusters(5).map(c => ({
                        label: c.label,
                        size: c.getSize(),
                        keywords: c.getTopKeywords(10)
                    }))
                }
            },
            timeline: this.timeline,
            insights: this.insights,
            learningTrajectory: this.getLearningTrajectory(),
            topTechnologies: this.getMostUsedTechnologies(10),
            heatmap: this.heatmap,
            achievements: this.achievements,
            persona: this.persona,
            wrappedStory: this.wrappedStory,
            sentencePatterns: this.sentencePatterns
        };
    }

    /**
     * Generate a shareable report (with privacy applied)
     */
    toShareableFormat(): ShareableReport {
        return new ShareableReport(
            this.getSummary(),
            this.wordCloud,
            this.statistics,
            this.techStackClusters.getLargestClusters(10),
            this.topicClusters.getLargestClusters(10),
            this.getKeyInsights(),
            this.privacySettings.watermark
        );
    }
}

/**
 * Shareable version of analytics report (for online sharing)
 */
export class ShareableReport {
    constructor(
        public readonly summary: string,
        public readonly wordCloud: WordCloudData,
        public readonly statistics: Omit<AnalyticsStatistics, 'topProjects'>,
        public readonly topTechClusters: any[],
        public readonly topTopicClusters: any[],
        public readonly keyInsights: AnalyticsInsight[],
        public readonly watermark: string,
        public readonly shareId?: string,
        public readonly shareUrl?: string
    ) {}

    /**
     * Generate metadata for social sharing (Open Graph, Twitter Card)
     */
    getSocialMetadata(): Record<string, string> {
        return {
            'og:title': 'My Claude Code Analytics',
            'og:description': this.summary.split('\n')[0],
            'og:type': 'website',
            'twitter:card': 'summary_large_image',
            'twitter:title': 'My Claude Code Analytics',
            'twitter:description': this.summary.split('\n')[0],
        };
    }
}
