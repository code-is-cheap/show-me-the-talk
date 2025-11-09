import { describe, it, expect } from 'vitest';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { HourlyActivityAnalyzer } from '@/domain/services/analytics/HourlyActivityAnalyzer.js';
import { Conversation } from '@/domain/models/Conversation.js';
import { ProjectContext } from '@/domain/models/ProjectContext.js';

function createConversationAtHour(hour: number): Conversation {
    const start = new Date('2025-01-15T00:00:00Z');
    start.setHours(hour, 0, 0, 0);
    return new Conversation(`session-${hour}`, new ProjectContext('demo', 'demo'), start);
}

describe('HourlyActivityAnalyzer', () => {
    it('returns undefined when no events are available', async () => {
        const analyzer = new HourlyActivityAnalyzer();
        const summary = await analyzer.analyze([]);
        expect(summary).toBeUndefined();
    });

    it('merges conversation starts with history.jsonl entries', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'hourly-'));
        try {
            const historyPath = join(tmp, 'history.jsonl');
            const now = Date.now();
            const historyEvents = [
                { timestamp: now, display: 'Opened repo README', project: '/demo' },
                { timestamp: now - 60 * 60 * 1000, display: 'Ran tests', project: '/demo' }
            ];
            writeFileSync(historyPath, historyEvents.map(event => JSON.stringify(event)).join('\n'));

            const analyzer = new HourlyActivityAnalyzer({
                claudeDir: tmp,
                lookbackDays: 30
            });

            const conversations = [
                createConversationAtHour(new Date(historyEvents[0].timestamp).getHours()),
                createConversationAtHour(6)
            ];

            const summary = await analyzer.analyze(conversations);
            expect(summary).toBeDefined();
            expect(summary?.totalEvents).toBe(historyEvents.length + conversations.length);
            expect(summary?.buckets.some(bucket => bucket.count > 0)).toBe(true);
            expect(summary?.samples[0].source).toBe('history');
            expect(summary?.recommendations.length).toBeGreaterThan(0);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});
