import { AnalyticsReport } from '../../models/analytics/AnalyticsReport.js';
import { DeveloperPersona } from './DeveloperPersonaService.js';

/**
 * Story card type
 */
export type StoryCardType =
    | 'welcome'
    | 'big_number'
    | 'word_cloud'
    | 'heatmap'
    | 'tech_stack'
    | 'achievements'
    | 'persona'
    | 'share';

/**
 * Story card data
 */
export interface StoryCard {
    /** Card type */
    type: StoryCardType;
    /** Card index (0-based) */
    index: number;
    /** Card title */
    title: string;
    /** Card subtitle (optional) */
    subtitle?: string;
    /** Primary content */
    content: StoryCardContent;
    /** Background theme */
    theme: 'gradient-blue' | 'gradient-purple' | 'gradient-orange' | 'solid-dark' | 'solid-light';
}

/**
 * Story card content (varies by type)
 */
export type StoryCardContent =
    | WelcomeContent
    | BigNumberContent
    | WordCloudContent
    | HeatmapContent
    | TechStackContent
    | AchievementsContent
    | PersonaContent
    | ShareContent;

export interface WelcomeContent {
    type: 'welcome';
    year: number;
    totalConversations: number;
}

export interface BigNumberContent {
    type: 'big_number';
    label: string;
    number: number;
    suffix?: string;
    context: string;
}

export interface WordCloudContent {
    type: 'word_cloud';
    words: Array<{ text: string; size: number; weight: number }>;
}

export interface HeatmapContent {
    type: 'heatmap';
    currentStreak: number;
    longestStreak: number;
    activeDays: number;
    isActiveStreak: boolean;
}

export interface TechStackContent {
    type: 'tech_stack';
    technologies: Array<{ name: string; count: number; rank: number }>;
}

export interface AchievementsContent {
    type: 'achievements';
    unlockedCount: number;
    totalCount: number;
    highlights: Array<{ name: string; icon: string; rarity: string }>;
}

export interface PersonaContent {
    type: 'persona';
    persona: DeveloperPersona;
}

export interface ShareContent {
    type: 'share';
    hashtag: string;
    cta: string;
}

/**
 * Service for generating Spotify Wrapped-style story cards
 */
export class WrappedStoryService {
    /**
     * Generate complete story from analytics report
     */
    generateStory(report: AnalyticsReport, persona: DeveloperPersona): StoryCard[] {
        const cards: StoryCard[] = [];

        // Card 1: Welcome
        cards.push(this.generateWelcomeCard(report));

        // Card 2: Big Number - Total Conversations
        cards.push(this.generateBigNumberCard(report));

        // Card 3: Word Cloud
        cards.push(this.generateWordCloudCard(report));

        // Card 4: Heatmap + Streak
        if (report.heatmap) {
            cards.push(this.generateHeatmapCard(report));
        }

        // Card 5: Top 5 Technologies
        cards.push(this.generateTechStackCard(report));

        // Card 6: Achievements
        if (report.achievements) {
            cards.push(this.generateAchievementsCard(report));
        }

        // Card 7: Developer Persona
        cards.push(this.generatePersonaCard(persona));

        // Card 8: Share CTA
        cards.push(this.generateShareCard());

        return cards;
    }

    /**
     * Generate welcome card
     */
    private generateWelcomeCard(report: AnalyticsReport): StoryCard {
        const year = new Date().getFullYear();

        return {
            type: 'welcome',
            index: 0,
            title: 'Your Coding Year',
            subtitle: `${year} with Claude`,
            content: {
                type: 'welcome',
                year,
                totalConversations: report.statistics.totalConversations
            },
            theme: 'gradient-blue'
        };
    }

    /**
     * Generate big number card
     */
    private generateBigNumberCard(report: AnalyticsReport): StoryCard {
        const convs = report.statistics.totalConversations;
        let context = '';

        if (convs >= 100) {
            context = "You're a Claude power user! 🔥";
        } else if (convs >= 50) {
            context = "You're building something amazing! 🚀";
        } else if (convs >= 20) {
            context = "You're on a learning journey! 📚";
        } else {
            context = "You're just getting started! ✨";
        }

        return {
            type: 'big_number',
            index: 1,
            title: 'Your Conversations',
            content: {
                type: 'big_number',
                label: 'Total Conversations',
                number: convs,
                context
            },
            theme: 'gradient-purple'
        };
    }

    /**
     * Generate word cloud card
     */
    private generateWordCloudCard(report: AnalyticsReport): StoryCard {
        const topWords = report.wordCloud.words.slice(0, 20).map(w => ({
            text: w.text,
            size: Math.max(20, Math.min(80, w.weight * 2000)),
            weight: w.weight
        }));

        return {
            type: 'word_cloud',
            index: 2,
            title: 'Your Top Words',
            subtitle: 'What you talked about most',
            content: {
                type: 'word_cloud',
                words: topWords
            },
            theme: 'solid-dark'
        };
    }

    /**
     * Generate heatmap card
     */
    private generateHeatmapCard(report: AnalyticsReport): StoryCard {
        if (!report.heatmap) {
            throw new Error('Heatmap data not available');
        }

        const { streak, stats } = report.heatmap;

        return {
            type: 'heatmap',
            index: 3,
            title: 'Your Consistency',
            subtitle: `${stats.activeDays} active days`,
            content: {
                type: 'heatmap',
                currentStreak: streak.currentStreak,
                longestStreak: streak.longestStreak,
                activeDays: stats.activeDays,
                isActiveStreak: streak.isActiveStreak
            },
            theme: 'gradient-orange'
        };
    }

    /**
     * Generate tech stack card
     */
    private generateTechStackCard(report: AnalyticsReport): StoryCard {
        const topTech = report.getMostUsedTechnologies(5);

        return {
            type: 'tech_stack',
            index: 4,
            title: 'Your Tech Stack',
            subtitle: 'Top 5 technologies',
            content: {
                type: 'tech_stack',
                technologies: topTech.map((t, i) => ({
                    name: t.tech,
                    count: t.count,
                    rank: i + 1
                }))
            },
            theme: 'gradient-blue'
        };
    }

    /**
     * Generate achievements card
     */
    private generateAchievementsCard(report: AnalyticsReport): StoryCard {
        if (!report.achievements) {
            throw new Error('Achievements data not available');
        }

        const { achievements, totalUnlocked } = report.achievements;
        const unlocked = achievements.filter(a => a.unlocked);

        // Get top 3 highest rarity unlocked badges
        const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
        const highlights = unlocked
            .sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity])
            .slice(0, 3)
            .map(a => ({
                name: a.name,
                icon: a.icon,
                rarity: a.rarity
            }));

        return {
            type: 'achievements',
            index: 5,
            title: 'Your Achievements',
            subtitle: `${totalUnlocked} badges unlocked`,
            content: {
                type: 'achievements',
                unlockedCount: totalUnlocked,
                totalCount: achievements.length,
                highlights
            },
            theme: 'gradient-purple'
        };
    }

    /**
     * Generate persona card
     */
    private generatePersonaCard(persona: DeveloperPersona): StoryCard {
        return {
            type: 'persona',
            index: 6,
            title: 'Your Developer Type',
            subtitle: persona.name,
            content: {
                type: 'persona',
                persona
            },
            theme: 'solid-dark'
        };
    }

    /**
     * Generate share card
     */
    private generateShareCard(): StoryCard {
        return {
            type: 'share',
            index: 7,
            title: 'Share Your Story',
            subtitle: 'Show the world your coding journey',
            content: {
                type: 'share',
                hashtag: '#ClaudeWrapped',
                cta: 'Tap to share on social media'
            },
            theme: 'gradient-orange'
        };
    }

    /**
     * Get total card count
     */
    getCardCount(report: AnalyticsReport): number {
        let count = 5; // welcome, big_number, word_cloud, tech_stack, share

        if (report.heatmap) count++;
        if (report.achievements) count++;

        return count + 1; // + persona
    }
}
