import { Conversation } from '../../models/Conversation.js';
import { AnalyticsReport } from '../../models/analytics/AnalyticsReport.js';
import { HeatmapData } from './ConversationHeatmapService.js';

/**
 * Developer persona type
 */
export interface DeveloperPersona {
    /** Persona ID */
    id: string;
    /** Display name */
    name: string;
    /** Persona emoji */
    emoji: string;
    /** Short description */
    description: string;
    /** Detailed traits */
    traits: string[];
    /** Matching score (0-1) */
    score: number;
    /** MBTI-style typing */
    mbti: string;
    /** MBTI explanation */
    mbtiDescription: string;
}

/**
 * Activity pattern analysis
 */
interface ActivityPattern {
    /** Most active hour (0-23) */
    peakHour: number;
    /** Most active day of week (1=Mon, 7=Sun) */
    peakDayOfWeek: number;
    /** Weekend vs weekday ratio */
    weekendRatio: number;
    /** Night hours percentage (22:00-06:00) */
    nightPercentage: number;
    /** Early hours percentage (05:00-09:00) */
    earlyPercentage: number;
}

/**
 * Learning pattern analysis
 */
interface LearningPattern {
    /** Technology breadth (number of unique techs) */
    breadth: number;
    /** Technology depth (avg conversations per tech) */
    depth: number;
    /** Consistency score (0-1) */
    consistency: number;
    /** Exploration rate (new techs / total convs) */
    explorationRate: number;
}

/**
 * Service for classifying developer personas
 *
 * Inspired by:
 * - Spotify Wrapped personality types
 * - Myers-Briggs for developers
 * - GitHub developer archetypes
 */
export class DeveloperPersonaService {
    /**
     * Classify user into developer persona
     */
    classifyPersona(
        conversations: Conversation[],
        report: AnalyticsReport,
        heatmap: HeatmapData
    ): DeveloperPersona {
        const activityPattern = this.analyzeActivityPattern(conversations, heatmap);
        const learningPattern = this.analyzeLearningPattern(conversations, report);

        // Score all personas
        const personas = this.getAllPersonas();
        const scores = personas.map(persona => ({
            ...persona,
            score: this.calculatePersonaScore(persona, activityPattern, learningPattern, heatmap)
        }));

        // Return highest scoring persona
        return scores.sort((a, b) => b.score - a.score)[0];
    }

    /**
     * Analyze activity patterns
     */
    private analyzeActivityPattern(
        conversations: Conversation[],
        heatmap: HeatmapData
    ): ActivityPattern {
        // Calculate peak hour (mock - would need message timestamps in real implementation)
        const peakHour = 14; // Default to 2 PM

        // Peak day of week from heatmap
        const peakDayOfWeek = heatmap.stats.mostProductiveDayOfWeek;

        // Weekend ratio (Sat=6, Sun=7)
        const weekendCells = heatmap.cells.filter(c => c.dayOfWeek >= 6 && c.count > 0);
        const weekdayCells = heatmap.cells.filter(c => c.dayOfWeek < 6 && c.count > 0);
        const weekendRatio = weekendCells.length / (weekendCells.length + weekdayCells.length || 1);

        // Time patterns (simplified - would need actual timestamps)
        const nightPercentage = 0.2; // Mock
        const earlyPercentage = 0.1; // Mock

        return {
            peakHour,
            peakDayOfWeek,
            weekendRatio,
            nightPercentage,
            earlyPercentage
        };
    }

    /**
     * Analyze learning patterns
     */
    private analyzeLearningPattern(
        conversations: Conversation[],
        report: AnalyticsReport
    ): LearningPattern {
        const techCount = report.techStackClusters.getLargestClusters(100).length;
        const convCount = conversations.length;

        const breadth = techCount;
        const depth = convCount / (techCount || 1);
        const consistency = Math.min(report.heatmap?.stats.activeDays || 0 / 90, 1);
        const explorationRate = techCount / convCount;

        return {
            breadth,
            depth,
            consistency,
            explorationRate
        };
    }

    /**
     * Calculate persona match score
     */
    private calculatePersonaScore(
        persona: DeveloperPersona,
        activity: ActivityPattern,
        learning: LearningPattern,
        heatmap: HeatmapData
    ): number {
        let score = 0;

        switch (persona.id) {
            case 'night_owl_full_stack':
                score += activity.nightPercentage * 3;
                score += learning.breadth > 8 ? 2 : 0;
                score += activity.weekendRatio > 0.3 ? 1 : 0;
                break;

            case 'early_bird_architect':
                score += activity.earlyPercentage * 3;
                score += learning.depth > 3 ? 2 : 0;
                score += activity.peakDayOfWeek <= 5 ? 1 : 0;
                break;

            case 'weekend_warrior':
                score += activity.weekendRatio * 5;
                score += heatmap.streak.longestStreak > 7 ? 1 : 0;
                break;

            case 'consistent_learner':
                score += learning.consistency * 4;
                score += heatmap.streak.currentStreak > 5 ? 2 : 0;
                break;

            case 'tech_explorer':
                score += learning.explorationRate * 5;
                score += learning.breadth > 10 ? 2 : 0;
                break;

            case 'deep_specialist':
                score += learning.depth > 5 ? 4 : 0;
                score += learning.breadth < 5 ? 2 : 0;
                break;

            case 'sprint_coder':
                score += (heatmap.stats.maxDayCount >= 5) ? 3 : 0;
                score += (heatmap.stats.activeDays < 30) ? 2 : 0;
                break;

            case 'steady_builder':
                score += learning.consistency * 3;
                score += (heatmap.stats.avgPerActiveDay >= 2 && heatmap.stats.avgPerActiveDay <= 4) ? 2 : 0;
                break;
        }

        return score;
    }

    /**
     * Get all available personas
     */
    private getAllPersonas(): DeveloperPersona[] {
        return [
            {
                id: 'night_owl_full_stack',
                name: 'Night Owl Full-Stack',
                emoji: '🦉',
                description: 'You code when the world sleeps, exploring everything from frontend to backend',
                traits: [
                    'Most active after 10 PM',
                    'Explores multiple technologies',
                    'Weekend coding sessions',
                    'Full-stack curiosity'
                ],
                score: 0,
                mbti: 'ENTP',
                mbtiDescription: 'The Innovator - You thrive on exploring new possibilities and debating technical approaches'
            },
            {
                id: 'early_bird_architect',
                name: 'Early Bird Architect',
                emoji: '🌅',
                description: 'You start early, plan carefully, and build with intention',
                traits: [
                    'Peak productivity before noon',
                    'Deep focus on architecture',
                    'Weekday routine',
                    'Quality over quantity'
                ],
                score: 0,
                mbti: 'INTJ',
                mbtiDescription: 'The Architect - You excel at strategic planning and building robust systems'
            },
            {
                id: 'weekend_warrior',
                name: 'Weekend Warrior',
                emoji: '⚔️',
                description: 'You save your coding adventures for the weekend',
                traits: [
                    'Saturday/Sunday focus',
                    'Long coding sessions',
                    'Side project enthusiast',
                    'Work-life balance champion'
                ],
                score: 0,
                mbti: 'ENFP',
                mbtiDescription: 'The Champion - You pursue passion projects with infectious enthusiasm'
            },
            {
                id: 'consistent_learner',
                name: 'Consistent Learner',
                emoji: '📚',
                description: 'Every day is a learning day - your consistency is impressive',
                traits: [
                    'Daily conversation habit',
                    'Long streaks',
                    'Steady progress',
                    'Learning mindset'
                ],
                score: 0,
                mbti: 'ISFJ',
                mbtiDescription: 'The Defender - You learn methodically and build knowledge brick by brick'
            },
            {
                id: 'tech_explorer',
                name: 'Tech Explorer',
                emoji: '🧭',
                description: 'You love discovering new technologies and frameworks',
                traits: [
                    'High technology variety',
                    'Frequent tech switching',
                    'Curiosity-driven',
                    'Broad knowledge base'
                ],
                score: 0,
                mbti: 'ENTP',
                mbtiDescription: 'The Visionary - You see connections across technologies and love the new'
            },
            {
                id: 'deep_specialist',
                name: 'Deep Specialist',
                emoji: '🎯',
                description: 'You dive deep into specific technologies, mastering them thoroughly',
                traits: [
                    'Focused technology stack',
                    'Many conversations per tech',
                    'Expert-level depth',
                    'Specialized knowledge'
                ],
                score: 0,
                mbti: 'ISTJ',
                mbtiDescription: 'The Logistician - You master details and build deep expertise through focus'
            },
            {
                id: 'sprint_coder',
                name: 'Sprint Coder',
                emoji: '⚡',
                description: 'You work in intense bursts, crushing multiple conversations in a day',
                traits: [
                    'High-intensity days',
                    'Burst productivity',
                    'Fast iteration',
                    'Sprint mentality'
                ],
                score: 0,
                mbti: 'ESTP',
                mbtiDescription: 'The Entrepreneur - You take action fast and ship quickly'
            },
            {
                id: 'steady_builder',
                name: 'Steady Builder',
                emoji: '🏗️',
                description: 'You build consistently, making steady progress day by day',
                traits: [
                    'Regular cadence',
                    'Moderate daily volume',
                    'Sustainable pace',
                    'Long-term mindset'
                ],
                score: 0,
                mbti: 'ISFJ',
                mbtiDescription: 'The Protector - You build sustainable systems through reliable, steady effort'
            }
        ];
    }

    /**
     * Get persona by ID
     */
    getPersonaById(id: string): DeveloperPersona | undefined {
        return this.getAllPersonas().find(p => p.id === id);
    }

    /**
     * Get all persona types
     */
    getAllPersonaTypes(): DeveloperPersona[] {
        return this.getAllPersonas();
    }
}
