import { Conversation } from '../../models/Conversation.js';
import {
    AnalyticsReport,
    AnalyticsStatistics,
    AnalyticsInsight,
    TimelineDataPoint,
    WordCloudData,
    ClusterCollection,
    ClusterType,
    PrivacySettings,
    SemanticCluster
} from '../../models/analytics/index.js';
import { ConversationTextAnalyzer } from './ConversationTextAnalyzer.js';
import { WordFrequencyAnalyzer } from './WordFrequencyAnalyzer.js';
import { SemanticConceptExtractor } from './SemanticConceptExtractor.js';
import { TechStackClusterer } from './TechStackClusterer.js';
import { ConversationService } from '../ConversationService.js';
import { ConversationHeatmapService } from './ConversationHeatmapService.js';
import { AchievementService } from './AchievementService.js';
import { DeveloperPersonaService } from './DeveloperPersonaService.js';
import { WrappedStoryService } from './WrappedStoryService.js';
import { SentencePatternAnalyzer } from './SentencePatternAnalyzer.js';
import { LlmSentenceInsightService } from './LlmSentenceInsightService.js';
import { HourlyActivityAnalyzer, HourlyActivityOptions } from './HourlyActivityAnalyzer.js';

export interface AnalyticsServiceOptions {
    claudeDir?: string;
    hourlyActivity?: HourlyActivityOptions;
}

/**
 * Unified service for conversation analytics
 */
export class AnalyticsService {
    private textAnalyzer: ConversationTextAnalyzer;
    private frequencyAnalyzer: WordFrequencyAnalyzer;
    private conceptExtractor: SemanticConceptExtractor;
    private techClusterer: TechStackClusterer;
    private conversationService: ConversationService;
    private heatmapService: ConversationHeatmapService;
    private achievementService: AchievementService;
    private personaService: DeveloperPersonaService;
    private wrappedService: WrappedStoryService;
    private sentenceAnalyzer: SentencePatternAnalyzer;
    private llmSentenceInsights: LlmSentenceInsightService;
    private hourlyActivityAnalyzer: HourlyActivityAnalyzer;

    constructor(options: AnalyticsServiceOptions = {}) {
        this.textAnalyzer = new ConversationTextAnalyzer();
        this.frequencyAnalyzer = new WordFrequencyAnalyzer(this.textAnalyzer);
        this.conceptExtractor = new SemanticConceptExtractor(this.textAnalyzer);
        this.techClusterer = new TechStackClusterer(this.textAnalyzer);
        this.conversationService = new ConversationService();
        this.heatmapService = new ConversationHeatmapService();
        this.achievementService = new AchievementService();
        this.personaService = new DeveloperPersonaService();
        this.wrappedService = new WrappedStoryService();
        this.sentenceAnalyzer = new SentencePatternAnalyzer();
        this.llmSentenceInsights = new LlmSentenceInsightService();
        this.hourlyActivityAnalyzer = new HourlyActivityAnalyzer({
            claudeDir: options.claudeDir ?? options.hourlyActivity?.claudeDir,
            lookbackDays: options.hourlyActivity?.lookbackDays,
            maxHistoryRecords: options.hourlyActivity?.maxHistoryRecords,
            timezone: options.hourlyActivity?.timezone
        });
    }

    /**
     * Generate complete analytics report
     */
    async generateReport(
        conversations: Conversation[],
        privacySettings: PrivacySettings = PrivacySettings.forLevel('HIGH_PRIVACY' as any)
    ): Promise<AnalyticsReport> {
        // Filter conversations based on privacy settings
        const filteredConversations = this.filterConversations(conversations, privacySettings);

        // Generate word cloud
        const wordCloud = await this.generateWordCloud(filteredConversations);

        // Generate clusters
        const techStackClusters = this.techClusterer.clusterByTechStack(filteredConversations);
        const taskTypeClusters = this.generateTaskTypeClusters(filteredConversations);
        const topicClusters = this.generateTopicClusters(filteredConversations);

        // Generate timeline
        const timeline = this.generateTimeline(filteredConversations);

        // Calculate statistics
        const statistics = this.calculateStatistics(filteredConversations);

        // Hourly analysis (history.jsonl + conversations)
        const hourlyActivity = await this.hourlyActivityAnalyzer.analyze(filteredConversations);

        // Generate insights
        const insights = this.generateInsights(
            filteredConversations,
            wordCloud,
            techStackClusters,
            timeline
        );

        // Generate heatmap data
        const heatmap = this.heatmapService.generateHeatmap(filteredConversations);

        // Analyze sentence-level patterns (heuristic + optional LLM summarization)
        const heuristicSentencePatterns = this.sentenceAnalyzer.analyze(filteredConversations);
        const sentencePatterns = await this.llmSentenceInsights.enhanceAnalysis(
            filteredConversations,
            this.sentenceAnalyzer,
            heuristicSentencePatterns
        );

        // Create report (needed for achievement checking)
        const tempReport = new AnalyticsReport(
            wordCloud,
            techStackClusters,
            taskTypeClusters,
            topicClusters,
            timeline,
            statistics,
            insights,
            privacySettings,
            new Date(),
            '1.0.0',
            heatmap,
            undefined,
            undefined,
            undefined,
            sentencePatterns,
            hourlyActivity
        );

        // Check achievements
        const achievements = this.achievementService.checkAchievements(
            filteredConversations,
            tempReport,
            heatmap
        );

        // Classify developer persona
        const persona = this.personaService.classifyPersona(
            filteredConversations,
            tempReport,
            heatmap
        );

        // Create final report with all data
        const finalReport = new AnalyticsReport(
            wordCloud,
            techStackClusters,
            taskTypeClusters,
            topicClusters,
            timeline,
            statistics,
            insights,
            privacySettings,
            new Date(),
            '1.0.0',
            heatmap,
            achievements,
            persona,
            undefined,
            sentencePatterns,
            hourlyActivity
        );

        // Generate Wrapped story cards
        const wrappedStory = this.wrappedService.generateStory(finalReport, persona);

        // Return final report with story
        return new AnalyticsReport(
            wordCloud,
            techStackClusters,
            taskTypeClusters,
            topicClusters,
            timeline,
            statistics,
            insights,
            privacySettings,
            new Date(),
            '1.0.0',
            heatmap,
            achievements,
            persona,
            wrappedStory,
            sentencePatterns,
            hourlyActivity
        );
    }

    /**
     * Generate word cloud with concepts
     */
    private async generateWordCloud(conversations: Conversation[]): Promise<WordCloudData> {
        // Generate frequency analysis
        const wordCloud = this.frequencyAnalyzer.analyzeFrequencies(conversations);

        // Extract semantic concepts
        const concepts = this.conceptExtractor.extractConcepts(conversations);

        // Merge concepts into word cloud
        return new WordCloudData(
            wordCloud.words,
            wordCloud.phrases,
            concepts,
            wordCloud.mode,
            wordCloud.totalTokens,
            wordCloud.uniqueTokens
        );
    }

    /**
     * Generate task type clusters
     */
    private generateTaskTypeClusters(conversations: Conversation[]): ClusterCollection {
        // Use existing categorization from ConversationService
        const categorized = ConversationService.categorizeConversations(conversations);

        const clusters: SemanticCluster[] = [];

        Object.entries(categorized).forEach(([category, convs]: [string, Conversation[]]) => {
            if (convs.length === 0) return;

            const references = convs.map(conv => ({
                sessionId: conv.sessionId,
                projectName: conv.projectContext.name,
                timestamp: conv.getStartTime(),
                relevanceScore: 1.0
            }));

            clusters.push(new SemanticCluster(
                `${category}-cluster`,
                ClusterType.TASK_TYPE,
                this.getCategoryLabel(category),
                [category],
                references,
                { category }
            ));
        });

        return new ClusterCollection(
            clusters,
            ClusterType.TASK_TYPE,
            conversations.length
        );
    }

    /**
     * Generate topic clusters
     */
    private generateTopicClusters(conversations: Conversation[]): ClusterCollection {
        // Extract concepts and group by category
        const concepts = this.conceptExtractor.extractConcepts(conversations);
        const categorized = this.conceptExtractor.categorizeConcepts(concepts);

        const clusters: SemanticCluster[] = [];

        categorized.forEach((conceptList, category) => {
            // Get all conversations related to this category
            const conversationIds = new Set<string>();
            conceptList.forEach(concept => {
                concept.conversationIds.forEach(id => conversationIds.add(id));
            });

            const relatedConvs = conversations.filter(c =>
                conversationIds.has(c.sessionId)
            );

            if (relatedConvs.length === 0) return;

            const references = relatedConvs.map(conv => ({
                sessionId: conv.sessionId,
                projectName: conv.projectContext.name,
                timestamp: conv.getStartTime(),
                relevanceScore: 1.0
            }));

            const keywords = conceptList.slice(0, 10).map(c => c.concept);

            clusters.push(new SemanticCluster(
                `${category}-topic-cluster`,
                ClusterType.TOPIC,
                `Topic: ${category}`,
                keywords,
                references,
                { category, topConcepts: conceptList.slice(0, 5) }
            ));
        });

        return new ClusterCollection(
            clusters,
            ClusterType.TOPIC,
            conversations.length
        );
    }

    /**
     * Generate timeline data
     */
    private generateTimeline(conversations: Conversation[]): TimelineDataPoint[] {
        // Group by month
        const texts = this.textAnalyzer.extractFromConversations(conversations);
        const byMonth = this.textAnalyzer.groupByTimePeriod(texts, 'month');

        const timeline: TimelineDataPoint[] = [];

        byMonth.forEach((monthTexts, monthKey) => {
            const monthConvs = conversations.filter(c => {
                const key = this.getMonthKey(c.getStartTime());
                return key === monthKey;
            });

            // Extract keywords for this period
            const combinedText = monthTexts.map(t => t.content).join(' ');
            const keywords = this.textAnalyzer.extractTechnicalTerms(combinedText);

            // Detect tech stack
            const techStack = Array.from(
                new Set(
                    monthConvs.flatMap(c => {
                        const text = c.getSearchableContent();
                        const tech = this.techClusterer['detectTechnologies'](text);
                        return [
                            ...tech.languages,
                            ...tech.frameworks,
                            ...tech.tools
                        ];
                    })
                )
            );

            const messageCount = monthConvs.reduce((sum, c) => sum + c.getMessageCount(), 0);

            timeline.push({
                date: new Date(monthKey + '-01'),
                keywords: keywords.slice(0, 10),
                techStack: techStack.slice(0, 10),
                conversationCount: monthConvs.length,
                messageCount
            });
        });

        // Sort by date
        timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

        return timeline;
    }

    /**
     * Calculate statistics
     */
    private calculateStatistics(conversations: Conversation[]): AnalyticsStatistics {
        const metrics = ConversationService.calculateConversationMetrics(conversations);

        const projectCounts = new Map<string, number>();
        conversations.forEach(conv => {
            const name = conv.projectContext.name;
            projectCounts.set(name, (projectCounts.get(name) || 0) + 1);
        });

        const topProjects = Array.from(projectCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calculate most active day and hour
        const mostActiveDay = this.getMostActiveDay(conversations);
        const mostActiveHour = this.getMostActiveHour(conversations);

        return {
            totalConversations: metrics.totalConversations,
            totalMessages: metrics.totalMessages,
            totalWords: conversations.reduce((sum, c) => sum + c.getWordCount(), 0),
            averageMessagesPerConversation: metrics.averageMessagesPerConversation,
            averageWordsPerMessage: 0, // TODO: calculate
            dateRange: {
                start: metrics.dateRange.earliest || new Date(),
                end: metrics.dateRange.latest || new Date()
            },
            topProjects,
            mostActiveDay,
            mostActiveHour
        };
    }

    /**
     * Generate insights
     */
    private generateInsights(
        conversations: Conversation[],
        wordCloud: WordCloudData,
        techClusters: ClusterCollection,
        timeline: TimelineDataPoint[]
    ): AnalyticsInsight[] {
        const insights: AnalyticsInsight[] = [];

        // Insight: Most used technology
        const topTech = techClusters.getLargestClusters(1)[0];
        if (topTech) {
            insights.push({
                type: 'observation',
                title: 'Primary Technology Focus',
                description: `Your most discussed technology is ${topTech.label} with ${topTech.getSize()} conversations.`,
                importance: 'high',
                evidence: [topTech.label]
            });
        }

        // Insight: Learning trajectory
        if (timeline.length >= 3) {
            const recentTech = timeline[timeline.length - 1].techStack;
            const oldTech = timeline[0].techStack;
            const newTech = recentTech.filter(t => !oldTech.includes(t));

            if (newTech.length > 0) {
                insights.push({
                    type: 'trend',
                    title: 'Technology Evolution',
                    description: `You've recently started exploring: ${newTech.slice(0, 3).join(', ')}`,
                    importance: 'medium',
                    evidence: newTech
                });
            }
        }

        // Insight: Vocabulary richness
        const richness = wordCloud.getVocabularyRichness();
        if (richness > 0.3) {
            insights.push({
                type: 'observation',
                title: 'Diverse Vocabulary',
                description: `You use a rich vocabulary with ${(richness * 100).toFixed(1)}% unique words.`,
                importance: 'low',
                evidence: [`Vocabulary richness: ${richness.toFixed(3)}`]
            });
        }

        // Insight: Activity pattern
        const totalConvs = conversations.length;
        const timeSpan = timeline.length;
        if (timeSpan > 0) {
            const rate = totalConvs / timeSpan;
            insights.push({
                type: 'observation',
                title: 'Activity Pattern',
                description: `You average ${rate.toFixed(1)} conversations per month.`,
                importance: 'low',
                evidence: [`${totalConvs} conversations over ${timeSpan} months`]
            });
        }

        return insights;
    }

    /**
     * Filter conversations based on privacy settings
     */
    private filterConversations(
        conversations: Conversation[],
        settings: PrivacySettings
    ): Conversation[] {
        const { contentSelection } = settings;

        let filtered = [...conversations];

        // Apply filters
        if (contentSelection.includeConversationIds) {
            filtered = filtered.filter(c =>
                contentSelection.includeConversationIds!.includes(c.sessionId)
            );
        }

        if (contentSelection.excludeConversationIds) {
            filtered = filtered.filter(c =>
                !contentSelection.excludeConversationIds!.includes(c.sessionId)
            );
        }

        if (contentSelection.includeProjects) {
            filtered = filtered.filter(c =>
                contentSelection.includeProjects!.includes(c.projectContext.name)
            );
        }

        if (contentSelection.excludeProjects) {
            filtered = filtered.filter(c =>
                !contentSelection.excludeProjects!.includes(c.projectContext.name)
            );
        }

        if (contentSelection.dateRange) {
            const { start, end } = contentSelection.dateRange;
            filtered = filtered.filter(c => {
                const date = c.getStartTime();
                if (start && date < start) return false;
                if (end && date > end) return false;
                return true;
            });
        }

        return filtered;
    }

    /**
     * Helper methods
     */
    private getCategoryLabel(category: string): string {
        const labels: Record<string, string> = {
            debugging: 'Debugging & Troubleshooting',
            architecture: 'Architecture & Design',
            implementation: 'Implementation',
            refactoring: 'Code Refactoring',
            learning: 'Learning & Exploration',
            other: 'General Discussion'
        };
        return labels[category] || category;
    }

    private getMonthKey(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    private getMostActiveDay(conversations: Conversation[]): { date: Date; count: number } | null {
        const dayCounts = new Map<string, number>();

        conversations.forEach(conv => {
            const date = conv.getStartTime();
            const key = date.toISOString().split('T')[0];
            dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
        });

        if (dayCounts.size === 0) return null;

        const [dateStr, count] = Array.from(dayCounts.entries())
            .sort((a, b) => b[1] - a[1])[0];

        return { date: new Date(dateStr), count };
    }

    private getMostActiveHour(conversations: Conversation[]): { hour: number; count: number } | null {
        const hourCounts = new Map<number, number>();

        conversations.forEach(conv => {
            const hour = conv.getStartTime().getHours();
            hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        });

        if (hourCounts.size === 0) return null;

        const [hour, count] = Array.from(hourCounts.entries())
            .sort((a, b) => b[1] - a[1])[0];

        return { hour, count };
    }
}
