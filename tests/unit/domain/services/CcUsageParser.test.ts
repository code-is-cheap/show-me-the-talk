import { describe, it, expect } from 'vitest';
import { CcUsageParser } from '../../../../src/domain/services/usage/CcUsageParser.js';

describe('CcUsageParser', () => {
    it('normalizes daily report output with breakdowns', () => {
        const parser = new CcUsageParser();
        const raw = {
            daily: [
                {
                    date: '20241101',
                    displayDate: 'Nov 1, 2024',
                    inputTokens: 1200,
                    outputTokens: 2300,
                    cacheCreationTokens: 0,
                    cacheReadTokens: 100,
                    totalTokens: 3600,
                    totalCost: 0.54,
                    timeRange: {
                        start: '2024-11-01T00:00:00-07:00',
                        end: '2024-11-01T23:59:59-07:00'
                    },
                    modelBreakdowns: [
                        {
                            modelName: 'claude-3-5-sonnet-20241022',
                            inputTokens: 1200,
                            outputTokens: 2300,
                            cacheCreationTokens: 0,
                            cacheReadTokens: 100,
                            totalTokens: 3600,
                            cost: 0.54
                        }
                    ]
                },
                {
                    date: '20241102',
                    inputTokens: 800,
                    outputTokens: 1300,
                    cacheCreationTokens: 0,
                    cacheReadTokens: 0,
                    totalTokens: 2100,
                    totalCost: 0.18,
                    modelBreakdowns: [
                        {
                            modelName: 'claude-3-haiku-20240307',
                            inputTokens: 800,
                            outputTokens: 1300,
                            cacheCreationTokens: 0,
                            cacheReadTokens: 0,
                            totalTokens: 2100,
                            cost: 0.18
                        }
                    ]
                }
            ],
            totals: {
                totalCost: 0.72,
                inputTokens: 2000,
                outputTokens: 3600,
                totalTokens: 5700
            }
        };

        const normalized = parser.normalize(raw, 'daily');

        expect(normalized.entries).toHaveLength(2);
        expect(normalized.entries[0].label).toBe('Nov 1, 2024');
        expect(normalized.entries[0].modelBreakdown?.[0].model).toBe('claude-3-5-sonnet-20241022');
        expect(normalized.entries[0].modelBreakdown?.[0].totalTokens).toBe(3600);
        expect(normalized.entries[1].totalTokens).toBe(2100);
        expect(normalized.totals?.costUSD).toBeCloseTo(0.72);
    });

    it('normalizes project-level ccusage output', () => {
        const parser = new CcUsageParser();
        const raw = {
            projects: {
                'repo-a': {
                    daily: [
                        {
                            date: '20241103',
                            inputTokens: 500,
                            outputTokens: 1000,
                            totalTokens: 1500,
                            totalCost: 0.12
                        }
                    ]
                },
                'repo-b': {
                    daily: [
                        {
                            date: '20241103',
                            inputTokens: 300,
                            outputTokens: 900,
                            totalTokens: 1200,
                            totalCost: 0.09
                        }
                    ]
                }
            },
            totals: {
                totalCost: 0.21,
                totalTokens: 2700
            }
        };

        const normalized = parser.normalize(raw, 'daily');

        expect(normalized.projects).toBeDefined();
        expect(normalized.projects?.length).toBe(2);
        const repoATotals = normalized.projects?.find(project => project.project === 'repo-a')?.totals;
        expect(repoATotals?.costUSD).toBeCloseTo(0.12);
        expect(normalized.totals?.totalTokens).toBe(2700);
    });
});
