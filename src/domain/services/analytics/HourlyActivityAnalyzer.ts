import { Conversation } from '../../models/Conversation.js';
import { existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

export interface HourlyActivityOptions {
    claudeDir?: string;
    lookbackDays?: number;
    maxHistoryRecords?: number;
    timezone?: string;
}

export interface HourlyActivityEvent {
    timestamp: Date;
    source: 'history' | 'conversation';
    label: string;
    project?: string;
}

export interface HourlyActivityBucket {
    hour: number;
    count: number;
    label: string;
}

export interface HourlyFocusWindow {
    startHour: number;
    endHour: number;
    spanHours: number;
    averageCount: number;
    label: string;
}

export interface HourlyActivityRecommendation {
    icon: string;
    title: string;
    description: string;
    tone: 'positive' | 'warning' | 'neutral';
}

export interface HourlyActivitySummary {
    timezone: string;
    totalEvents: number;
    buckets: HourlyActivityBucket[];
    weekdayMatrix: number[][];
    peakHour?: HourlyActivityBucket;
    quietHour?: HourlyActivityBucket;
    focusWindow?: HourlyFocusWindow;
    nightShare: number;
    earlyShare: number;
    weekendShare: number;
    dominantDay?: { dayIndex: number; label: string; count: number };
    recommendations: HourlyActivityRecommendation[];
    samples: HourlyActivityEvent[];
    sourceBreakdown: Record<string, number>;
    trendStatement: string;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export class HourlyActivityAnalyzer {
    private readonly lookbackMs: number;
    private readonly maxHistoryRecords: number;
    private readonly timezone: string;

    constructor(private readonly options: HourlyActivityOptions = {}) {
        const lookbackDays = Math.max(7, options.lookbackDays ?? 120);
        this.lookbackMs = lookbackDays * 24 * 60 * 60 * 1000;
        this.maxHistoryRecords = Math.max(5000, options.maxHistoryRecords ?? 20000);
        this.timezone = options.timezone
            ?? Intl.DateTimeFormat().resolvedOptions().timeZone
            ?? 'Local Time';
    }

    async analyze(conversations: Conversation[]): Promise<HourlyActivitySummary | undefined> {
        const events: HourlyActivityEvent[] = [];
        events.push(...this.extractConversationEvents(conversations));

        const historyEvents = await this.loadHistoryEvents();
        events.push(...historyEvents);

        if (events.length === 0) {
            return undefined;
        }

        return this.buildSummary(events);
    }

    private extractConversationEvents(conversations: Conversation[]): HourlyActivityEvent[] {
        return conversations.map(conv => ({
            timestamp: conv.getStartTime(),
            source: 'conversation' as const,
            label: `Conversation • ${conv.getProjectContext().getProjectName()}`,
            project: conv.getProjectContext().getProjectName()
        }));
    }

    private async loadHistoryEvents(): Promise<HourlyActivityEvent[]> {
        if (!this.options.claudeDir) {
            return [];
        }

        const historyPath = join(this.options.claudeDir, 'history.jsonl');
        if (!existsSync(historyPath)) {
            return [];
        }

        const cutoff = Date.now() - this.lookbackMs;
        const events: HourlyActivityEvent[] = [];

        try {
            const stream = createReadStream(historyPath, { encoding: 'utf8' });
            const rl = createInterface({
                input: stream,
                crlfDelay: Infinity
            });

            for await (const line of rl) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    const rawTs = parsed.timestamp ?? parsed.ts;
                    if (!rawTs) continue;

                    const timestamp = typeof rawTs === 'number' || typeof rawTs === 'string'
                        ? new Date(Number(rawTs))
                        : new Date(rawTs);
                    if (isNaN(timestamp.getTime())) continue;
                    if (timestamp.getTime() < cutoff) continue;

                    const label = typeof parsed.display === 'string'
                        ? parsed.display.split('\n')[0].trim()
                        : 'Claude activity';
                    const project = typeof parsed.project === 'string' ? parsed.project : undefined;

                    events.push({
                        timestamp,
                        source: 'history',
                        label: label || 'Claude activity',
                        project
                    });

                    if (events.length > this.maxHistoryRecords) {
                        events.shift();
                    }
                } catch {
                    // Ignore malformed lines
                }
            }

            rl.close();
            stream.close();
        } catch (error) {
            console.warn('[HourlyActivityAnalyzer] Failed to read history.jsonl', error);
        }

        return events;
    }

    private buildSummary(events: HourlyActivityEvent[]): HourlyActivitySummary {
        const totalEvents = events.length;
        const buckets: HourlyActivityBucket[] = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            count: 0,
            label: this.formatHour(hour)
        }));

        const weekdayMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        const sourceBreakdown: Record<string, number> = {};
        let nightCount = 0;
        let earlyCount = 0;
        let weekendCount = 0;

        for (const event of events) {
            const hour = event.timestamp.getHours();
            const dayIndex = this.toWeekdayIndex(event.timestamp.getDay());
            buckets[hour].count += 1;
            weekdayMatrix[dayIndex][hour] += 1;
            sourceBreakdown[event.source] = (sourceBreakdown[event.source] || 0) + 1;

            if (hour >= 22 || hour < 6) {
                nightCount += 1;
            }
            if (hour >= 5 && hour < 9) {
                earlyCount += 1;
            }
            if (dayIndex >= 5) {
                weekendCount += 1;
            }
        }

        const peakHour = this.getExtremumBucket(buckets, 'max');
        const quietHour = this.getExtremumBucket(buckets, 'min');
        const focusWindow = this.getFocusWindow(buckets);
        const dominantDay = this.getDominantDay(weekdayMatrix);
        const recommendations = this.buildRecommendations({
            nightShare: totalEvents ? nightCount / totalEvents : 0,
            earlyShare: totalEvents ? earlyCount / totalEvents : 0,
            weekendShare: totalEvents ? weekendCount / totalEvents : 0,
            peakHour,
            focusWindow,
            dominantDay
        });

        const samples = [...events]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 8);

        return {
            timezone: this.timezone,
            totalEvents,
            buckets,
            weekdayMatrix,
            peakHour,
            quietHour,
            focusWindow,
            nightShare: totalEvents ? nightCount / totalEvents : 0,
            earlyShare: totalEvents ? earlyCount / totalEvents : 0,
            weekendShare: totalEvents ? weekendCount / totalEvents : 0,
            dominantDay,
            recommendations,
            samples,
            sourceBreakdown,
            trendStatement: this.buildTrendStatement(peakHour, dominantDay)
        };
    }

    private getExtremumBucket(
        buckets: HourlyActivityBucket[],
        mode: 'max' | 'min'
    ): HourlyActivityBucket | undefined {
        const filtered = mode === 'max'
            ? buckets.filter(bucket => bucket.count === Math.max(...buckets.map(b => b.count)))
            : buckets.filter(bucket => bucket.count === Math.min(...buckets.map(b => b.count)));

        const candidate = filtered.find(bucket => bucket.count > 0) ?? filtered[0];
        if (!candidate || candidate.count === 0) {
            return buckets.reduce((best, current) => current.count > best.count ? current : best, buckets[0]);
        }
        return candidate;
    }

    private getFocusWindow(buckets: HourlyActivityBucket[]): HourlyFocusWindow | undefined {
        const span = 3;
        let bestStart = 0;
        let bestValue = -1;

        for (let hour = 0; hour < 24; hour++) {
            let sum = 0;
            for (let offset = 0; offset < span; offset++) {
                sum += buckets[(hour + offset) % 24].count;
            }
            if (sum > bestValue) {
                bestValue = sum;
                bestStart = hour;
            }
        }

        if (bestValue <= 0) return undefined;

        const avg = bestValue / span;
        return {
            startHour: bestStart,
            endHour: (bestStart + span) % 24,
            spanHours: span,
            averageCount: avg,
            label: `${this.formatHour(bestStart)} – ${this.formatHour((bestStart + span) % 24)}`
        };
    }

    private getDominantDay(matrix: number[][]): { dayIndex: number; label: string; count: number } | undefined {
        const totals = matrix.map(row => row.reduce((sum, value) => sum + value, 0));
        const max = Math.max(...totals);
        if (max === 0) return undefined;
        const dayIndex = totals.findIndex(total => total === max);
        return {
            dayIndex,
            label: WEEKDAY_LABELS[dayIndex],
            count: max
        };
    }

    private buildRecommendations(context: {
        nightShare: number;
        earlyShare: number;
        weekendShare: number;
        peakHour?: HourlyActivityBucket;
        focusWindow?: HourlyFocusWindow;
        dominantDay?: { dayIndex: number; label: string; count: number };
    }): HourlyActivityRecommendation[] {
        const recs: HourlyActivityRecommendation[] = [];

        if (context.focusWindow) {
            recs.push({
                icon: '🎯',
                title: 'Protect your prime window',
                description: `Your ${context.focusWindow.label} block captures the densest activity. Guard it for deep work or showcase posts.`,
                tone: 'positive'
            });
        }

        if (context.nightShare > 0.35) {
            recs.push({
                icon: '🌙',
                title: 'Night-owl surge',
                description: 'Over a third of your activity happens after 10 PM. Great for stealth mode, but consider syncing with teammates during daylight.',
                tone: 'warning'
            });
        } else if (context.earlyShare > 0.25) {
            recs.push({
                icon: '🌅',
                title: 'Sunrise builder',
                description: 'You log meaningful sessions before 9 AM. Keep teeing up decisions early while inboxes stay quiet.',
                tone: 'positive'
            });
        }

        if (context.weekendShare > 0.2) {
            recs.push({
                icon: '📆',
                title: 'Weekend warrior',
                description: 'Weekends carry a big share of your check-ins. Highlight that hustle—but remember to broadcast wins on weekday peaks for visibility.',
                tone: 'warning'
            });
        }

        if (context.dominantDay && context.peakHour) {
            recs.push({
                icon: '📣',
                title: 'Broadcast timing',
                description: `Your loudest spike lands ${context.dominantDay.label} around ${context.peakHour.label}. Mirror big launches there for max reach.`,
                tone: 'neutral'
            });
        }

        if (recs.length < 3) {
            recs.push({
                icon: '⚙️',
                title: 'Maintain rhythm',
                description: 'Hourly activity is evenly spread. Keep instrumenting logs so we can surface sharper pulses over time.',
                tone: 'neutral'
            });
        }

        return recs.slice(0, 4);
    }

    private buildTrendStatement(
        peakHour?: HourlyActivityBucket,
        dominantDay?: { dayIndex: number; label: string; count: number }
    ): string {
        if (!peakHour) {
            return 'Activity is warming up—log a few more sessions to unlock hourly insights.';
        }
        const dayText = dominantDay ? `${dominantDay.label}s` : 'weekdays';
        return `Peak energy hits around ${peakHour.label} on ${dayText}.`;
    }

    private toWeekdayIndex(jsDay: number): number {
        // JS: 0 = Sunday, convert to 0 = Monday
        return jsDay === 0 ? 6 : jsDay - 1;
    }

    private formatHour(hour: number): string {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true,
            timeZone: this.timezone
        });
    }
}
