import { Conversation } from '../../models/Conversation.js';

/**
 * Heatmap cell representing a single day
 */
export interface HeatmapCell {
    /** Date in YYYY-MM-DD format */
    date: string;
    /** Number of conversations on this day */
    count: number;
    /** Activity level (0-4, like GitHub) */
    level: 0 | 1 | 2 | 3 | 4;
    /** ISO day of week (1=Mon, 7=Sun) */
    dayOfWeek: number;
    /** Week number in the year */
    weekNumber: number;
}

/**
 * Streak information
 */
export interface StreakInfo {
    /** Current streak in days */
    currentStreak: number;
    /** Longest streak in days */
    longestStreak: number;
    /** Start date of current streak */
    currentStreakStart?: string;
    /** End date of current streak (today if active) */
    currentStreakEnd?: string;
    /** Start date of longest streak */
    longestStreakStart?: string;
    /** End date of longest streak */
    longestStreakEnd?: string;
    /** Whether current streak is active (includes today) */
    isActiveStreak: boolean;
}

/**
 * Heatmap statistics
 */
export interface HeatmapStats {
    /** Total days with activity */
    activeDays: number;
    /** Most productive day count */
    maxDayCount: number;
    /** Most productive day date */
    maxDayDate: string;
    /** Average conversations per active day */
    avgPerActiveDay: number;
    /** Most productive day of week (1=Mon, 7=Sun) */
    mostProductiveDayOfWeek: number;
    /** Total conversations in period */
    totalConversations: number;
}

/**
 * Complete heatmap data
 */
export interface HeatmapData {
    /** Array of 365 cells (one year) */
    cells: HeatmapCell[];
    /** Streak information */
    streak: StreakInfo;
    /** Statistics */
    stats: HeatmapStats;
    /** Start date of heatmap */
    startDate: string;
    /** End date of heatmap */
    endDate: string;
}

/**
 * Service for generating GitHub-style conversation heatmaps
 *
 * Features:
 * - 365-day activity grid
 * - Streak calculation (current + longest)
 * - Activity level coloring (0-4)
 * - Week-based layout
 */
export class ConversationHeatmapService {
    /**
     * Generate complete heatmap data for conversations
     *
     * @param conversations - All conversations
     * @param endDate - End date (default: today)
     * @param days - Number of days to include (default: 365)
     * @returns Complete heatmap data
     */
    generateHeatmap(
        conversations: Conversation[],
        endDate: Date = new Date(),
        days: number = 365
    ): HeatmapData {
        // Calculate start date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(start.getDate() - days + 1);
        start.setHours(0, 0, 0, 0);

        // Build daily conversation counts
        const dailyCounts = this.buildDailyCounts(conversations, start, end);

        // Generate cells
        const cells = this.generateCells(dailyCounts, start, end);

        // Calculate streaks
        const streak = this.calculateStreaks(cells, end);

        // Calculate statistics
        const stats = this.calculateStats(cells);

        return {
            cells,
            streak,
            stats,
            startDate: this.formatDate(start),
            endDate: this.formatDate(end)
        };
    }

    /**
     * Build map of date -> conversation count
     */
    private buildDailyCounts(
        conversations: Conversation[],
        startDate: Date,
        endDate: Date
    ): Map<string, number> {
        const counts = new Map<string, number>();

        for (const conv of conversations) {
            const convDate = new Date(conv.updatedAt);

            // Skip if outside date range
            if (convDate < startDate || convDate > endDate) {
                continue;
            }

            const dateKey = this.formatDate(convDate);
            counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
        }

        return counts;
    }

    /**
     * Generate heatmap cells for date range
     */
    private generateCells(
        dailyCounts: Map<string, number>,
        startDate: Date,
        endDate: Date
    ): HeatmapCell[] {
        const cells: HeatmapCell[] = [];
        const current = new Date(startDate);

        // Find max count for level calculation
        const maxCount = Math.max(...Array.from(dailyCounts.values()), 1);

        while (current <= endDate) {
            const dateKey = this.formatDate(current);
            const count = dailyCounts.get(dateKey) || 0;
            const level = this.calculateLevel(count, maxCount);

            cells.push({
                date: dateKey,
                count,
                level,
                dayOfWeek: this.getISODayOfWeek(current),
                weekNumber: this.getWeekNumber(current)
            });

            current.setDate(current.getDate() + 1);
        }

        return cells;
    }

    /**
     * Calculate activity level (0-4, like GitHub)
     *
     * Level 0: No activity
     * Level 1: 1-25th percentile
     * Level 2: 25-50th percentile
     * Level 3: 50-75th percentile
     * Level 4: 75-100th percentile
     */
    private calculateLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
        if (count === 0) return 0;

        const ratio = count / maxCount;
        if (ratio > 0.75) return 4;
        if (ratio > 0.50) return 3;
        if (ratio > 0.25) return 2;
        return 1;
    }

    /**
     * Calculate streak information
     */
    private calculateStreaks(cells: HeatmapCell[], endDate: Date): StreakInfo {
        const today = this.formatDate(endDate);

        // Find all streaks
        const streaks: Array<{ start: string; end: string; length: number }> = [];
        let currentStart: string | null = null;
        let currentLength = 0;

        for (const cell of cells) {
            if (cell.count > 0) {
                if (currentStart === null) {
                    currentStart = cell.date;
                    currentLength = 1;
                } else {
                    currentLength++;
                }
            } else {
                if (currentStart !== null) {
                    // End of streak
                    const prevCell = cells[cells.length - currentLength - 1];
                    streaks.push({
                        start: currentStart,
                        end: prevCell?.date || currentStart,
                        length: currentLength
                    });
                    currentStart = null;
                    currentLength = 0;
                }
            }
        }

        // Handle ongoing streak
        if (currentStart !== null) {
            const lastCell = cells[cells.length - 1];
            streaks.push({
                start: currentStart,
                end: lastCell.date,
                length: currentLength
            });
        }

        // Find longest streak
        let longestStreak = 0;
        let longestStreakStart: string | undefined;
        let longestStreakEnd: string | undefined;

        for (const streak of streaks) {
            if (streak.length > longestStreak) {
                longestStreak = streak.length;
                longestStreakStart = streak.start;
                longestStreakEnd = streak.end;
            }
        }

        // Find current streak (must include today or yesterday)
        let currentStreak = 0;
        let currentStreakStart: string | undefined;
        let currentStreakEnd: string | undefined;
        let isActiveStreak = false;

        const lastStreak = streaks[streaks.length - 1];
        if (lastStreak) {
            const lastDate = new Date(lastStreak.end);
            const yesterday = new Date(endDate);
            yesterday.setDate(yesterday.getDate() - 1);

            // Check if streak is current (includes today or yesterday)
            if (lastStreak.end === today ||
                this.formatDate(lastDate) === this.formatDate(yesterday)) {
                currentStreak = lastStreak.length;
                currentStreakStart = lastStreak.start;
                currentStreakEnd = lastStreak.end;
                isActiveStreak = (lastStreak.end === today);
            }
        }

        return {
            currentStreak,
            longestStreak,
            currentStreakStart,
            currentStreakEnd,
            longestStreakStart,
            longestStreakEnd,
            isActiveStreak
        };
    }

    /**
     * Calculate heatmap statistics
     */
    private calculateStats(cells: HeatmapCell[]): HeatmapStats {
        const activeCells = cells.filter(c => c.count > 0);
        const totalConversations = cells.reduce((sum, c) => sum + c.count, 0);

        // Find max day
        let maxDayCount = 0;
        let maxDayDate = '';
        for (const cell of cells) {
            if (cell.count > maxDayCount) {
                maxDayCount = cell.count;
                maxDayDate = cell.date;
            }
        }

        // Find most productive day of week
        const dowCounts = new Map<number, number>();
        for (const cell of activeCells) {
            dowCounts.set(cell.dayOfWeek, (dowCounts.get(cell.dayOfWeek) || 0) + cell.count);
        }

        let mostProductiveDayOfWeek = 1; // Monday default
        let maxDowCount = 0;
        for (const [dow, count] of dowCounts.entries()) {
            if (count > maxDowCount) {
                maxDowCount = count;
                mostProductiveDayOfWeek = dow;
            }
        }

        return {
            activeDays: activeCells.length,
            maxDayCount,
            maxDayDate,
            avgPerActiveDay: activeCells.length > 0 ? totalConversations / activeCells.length : 0,
            mostProductiveDayOfWeek,
            totalConversations
        };
    }

    /**
     * Format date as YYYY-MM-DD
     */
    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get ISO day of week (1=Monday, 7=Sunday)
     */
    private getISODayOfWeek(date: Date): number {
        const dow = date.getDay();
        return dow === 0 ? 7 : dow;
    }

    /**
     * Get ISO week number
     */
    private getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    /**
     * Get day of week name
     */
    getDayOfWeekName(dayOfWeek: number): string {
        const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return names[dayOfWeek - 1] || 'Mon';
    }

    /**
     * Get month name
     */
    getMonthName(monthIndex: number): string {
        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return names[monthIndex] || 'Jan';
    }
}
