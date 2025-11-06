import { Conversation } from '../../models/Conversation.js';
import { AnalyticsReport } from '../../models/analytics/AnalyticsReport.js';
import { HeatmapData } from './ConversationHeatmapService.js';

/**
 * Achievement badge
 */
export interface Achievement {
    /** Unique achievement ID */
    id: string;
    /** Display name */
    name: string;
    /** Achievement emoji icon */
    icon: string;
    /** Description */
    description: string;
    /** Unlock criteria description */
    criteria: string;
    /** Rarity level */
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    /** Whether unlocked */
    unlocked: boolean;
    /** Progress towards unlock (0-1) */
    progress: number;
    /** Achievement category */
    category: 'activity' | 'consistency' | 'exploration' | 'mastery' | 'social';
    /** Unlock date (if unlocked) */
    unlockedAt?: string;
}

/**
 * Achievement unlock result
 */
export interface AchievementResult {
    /** All achievements */
    achievements: Achievement[];
    /** Newly unlocked achievements */
    newlyUnlocked: Achievement[];
    /** Total unlocked count */
    totalUnlocked: number;
    /** Total available count */
    totalAvailable: number;
    /** Completion percentage */
    completionPercentage: number;
}

/**
 * Service for managing achievement badges
 *
 * Gamification mechanics inspired by:
 * - Spotify Wrapped
 * - GitHub Arctic Code Vault
 * - Duolingo badges
 * - Steam achievements
 */
export class AchievementService {
    private readonly achievements: Map<string, (conversations: Conversation[], report: AnalyticsReport, heatmap: HeatmapData) => Achievement>;

    constructor() {
        this.achievements = new Map();
        this.registerAchievements();
    }

    /**
     * Check all achievements and return results
     */
    checkAchievements(
        conversations: Conversation[],
        report: AnalyticsReport,
        heatmap: HeatmapData
    ): AchievementResult {
        const results: Achievement[] = [];

        for (const [, checker] of this.achievements) {
            const achievement = checker(conversations, report, heatmap);
            results.push(achievement);
        }

        const unlocked = results.filter(a => a.unlocked);
        const newlyUnlocked = unlocked; // In production, compare with previous state

        return {
            achievements: results,
            newlyUnlocked,
            totalUnlocked: unlocked.length,
            totalAvailable: results.length,
            completionPercentage: (unlocked.length / results.length) * 100
        };
    }

    /**
     * Register all achievement definitions
     */
    private registerAchievements(): void {
        // 1. Century Club - 100+ conversations
        this.achievements.set('century_club', (convs) => {
            const count = convs.length;
            return {
                id: 'century_club',
                name: 'Century Club',
                icon: '🏆',
                description: 'Reached 100 conversations with Claude',
                criteria: 'Have 100+ conversations',
                rarity: 'legendary',
                unlocked: count >= 100,
                progress: Math.min(count / 100, 1),
                category: 'activity',
                unlockedAt: count >= 100 ? new Date().toISOString() : undefined
            };
        });

        // 2. Week Warrior - 7-day streak
        this.achievements.set('week_warrior', (convs, report, heatmap) => {
            const streak = heatmap.streak.currentStreak;
            return {
                id: 'week_warrior',
                name: 'Week Warrior',
                icon: '🔥',
                description: 'Maintained a 7-day conversation streak',
                criteria: 'Talk to Claude for 7 consecutive days',
                rarity: 'epic',
                unlocked: streak >= 7,
                progress: Math.min(streak / 7, 1),
                category: 'consistency'
            };
        });

        // 3. Full-Stack Explorer - 10+ technologies
        this.achievements.set('full_stack', (convs, report) => {
            const techCount = report.techStackClusters.getLargestClusters(100).length;
            return {
                id: 'full_stack',
                name: 'Full-Stack Explorer',
                icon: '🌟',
                description: 'Explored 10+ different technologies',
                criteria: 'Discuss 10+ different tech stacks',
                rarity: 'rare',
                unlocked: techCount >= 10,
                progress: Math.min(techCount / 10, 1),
                category: 'exploration'
            };
        });

        // 4. Knowledge Seeker - 50+ conversations
        this.achievements.set('knowledge_seeker', (convs) => {
            const count = convs.length;
            return {
                id: 'knowledge_seeker',
                name: 'Knowledge Seeker',
                icon: '📚',
                description: 'Had 50+ learning conversations',
                criteria: 'Reach 50 conversations',
                rarity: 'rare',
                unlocked: count >= 50,
                progress: Math.min(count / 50, 1),
                category: 'activity'
            };
        });

        // 5. Chatty - 50+ messages in one conversation
        this.achievements.set('chatty', (convs) => {
            const maxMessages = Math.max(...convs.map(c => c.getMessageCount()), 0);
            return {
                id: 'chatty',
                name: 'Deep Diver',
                icon: '💬',
                description: 'Had a conversation with 50+ messages',
                criteria: 'Single conversation with 50+ messages',
                rarity: 'rare',
                unlocked: maxMessages >= 50,
                progress: Math.min(maxMessages / 50, 1),
                category: 'activity'
            };
        });

        // 6. Marathon - Longest streak 14+ days
        this.achievements.set('marathon', (convs, report, heatmap) => {
            const longest = heatmap.streak.longestStreak;
            return {
                id: 'marathon',
                name: 'Marathon Runner',
                icon: '🏃',
                description: 'Achieved a 14-day conversation streak',
                criteria: 'Maintain 14-day streak',
                rarity: 'legendary',
                unlocked: longest >= 14,
                progress: Math.min(longest / 14, 1),
                category: 'consistency'
            };
        });

        // 7. Tech Enthusiast - 5+ technologies
        this.achievements.set('tech_enthusiast', (convs, report) => {
            const techCount = report.techStackClusters.getLargestClusters(100).length;
            return {
                id: 'tech_enthusiast',
                name: 'Tech Enthusiast',
                icon: '💻',
                description: 'Explored 5+ different technologies',
                criteria: 'Discuss 5+ tech stacks',
                rarity: 'common',
                unlocked: techCount >= 5,
                progress: Math.min(techCount / 5, 1),
                category: 'exploration'
            };
        });

        // 8. Consistent - 30+ active days
        this.achievements.set('consistent', (convs, report, heatmap) => {
            const activeDays = heatmap.stats.activeDays;
            return {
                id: 'consistent',
                name: 'Consistent Learner',
                icon: '📅',
                description: 'Active on 30+ different days',
                criteria: 'Be active on 30+ days',
                rarity: 'rare',
                unlocked: activeDays >= 30,
                progress: Math.min(activeDays / 30, 1),
                category: 'consistency'
            };
        });

        // 9. First Steps - First conversation
        this.achievements.set('first_steps', (convs) => {
            const count = convs.length;
            return {
                id: 'first_steps',
                name: 'First Steps',
                icon: '👣',
                description: 'Started your journey with Claude',
                criteria: 'Have your first conversation',
                rarity: 'common',
                unlocked: count >= 1,
                progress: Math.min(count, 1),
                category: 'activity'
            };
        });

        // 10. Productive Day - 5+ conversations in one day
        this.achievements.set('productive_day', (convs, report, heatmap) => {
            const maxDay = heatmap.stats.maxDayCount;
            return {
                id: 'productive_day',
                name: 'Productive Day',
                icon: '⚡',
                description: 'Had 5+ conversations in a single day',
                criteria: '5+ conversations in one day',
                rarity: 'common',
                unlocked: maxDay >= 5,
                progress: Math.min(maxDay / 5, 1),
                category: 'activity'
            };
        });
    }

    /**
     * Get rarity color for styling
     */
    getRarityColor(rarity: Achievement['rarity']): string {
        switch (rarity) {
            case 'common': return '#10b981'; // Green
            case 'rare': return '#3b82f6'; // Blue
            case 'epic': return '#a855f7'; // Purple
            case 'legendary': return '#f59e0b'; // Gold
        }
    }

    /**
     * Get category icon
     */
    getCategoryIcon(category: Achievement['category']): string {
        switch (category) {
            case 'activity': return '📊';
            case 'consistency': return '🎯';
            case 'exploration': return '🧭';
            case 'mastery': return '🎓';
            case 'social': return '👥';
        }
    }

    /**
     * Format progress percentage
     */
    formatProgress(progress: number): string {
        return `${Math.round(progress * 100)}%`;
    }
}
