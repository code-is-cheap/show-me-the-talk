import { describe, it, expect } from 'vitest';
import { UsageCostReportBuilder } from '../../../../src/domain/services/usage/UsageCostReportBuilder.js';
import { NormalizedUsageData } from '../../../../src/domain/models/usage/UsageReport.js';

describe('UsageCostReportBuilder', () => {
    it('builds aggregated insights and recommendations', () => {
        const builder = new UsageCostReportBuilder();
        const normalized: NormalizedUsageData = {
            grouping: 'daily',
            entries: [
                {
                    id: '20241101',
                    label: 'Nov 1',
                    costUSD: 0.8,
                    inputTokens: 1200,
                    outputTokens: 2400,
                    cacheCreationTokens: 0,
                    cacheReadTokens: 0,
                    totalTokens: 3600,
                    metadata: {
                        date: '2024-11-01'
                    },
                    modelBreakdown: [
                        {
                            model: 'claude-3-5-sonnet-20241022',
                            inputTokens: 1200,
                            outputTokens: 2400,
                            cacheCreationTokens: 0,
                            cacheReadTokens: 0,
                            totalTokens: 3600,
                            costUSD: 0.8
                        }
                    ]
                },
                {
                    id: '20241102',
                    label: 'Nov 2',
                    costUSD: 0.2,
                    inputTokens: 400,
                    outputTokens: 600,
                    cacheCreationTokens: 0,
                    cacheReadTokens: 0,
                    totalTokens: 1000,
                    metadata: {
                        date: '2024-11-02'
                    },
                    modelBreakdown: [
                        {
                            model: 'claude-3-haiku-20240307',
                            inputTokens: 400,
                            outputTokens: 600,
                            cacheCreationTokens: 0,
                            cacheReadTokens: 0,
                            totalTokens: 1000,
                            costUSD: 0.2
                        }
                    ]
                }
            ],
            totals: {
                costUSD: 1,
                inputTokens: 1600,
                outputTokens: 3000,
                totalTokens: 4600,
                entryCount: 2
            }
        };

        const report = builder.build(normalized, {
            grouping: 'daily',
            command: ['ccusage', 'daily', '--json']
        });

        expect(report.totals.costUSD).toBeCloseTo(1);
        expect(report.averageCostPerEntry).toBeCloseTo(0.5);
        expect(report.modelUsage[0].model).toBe('claude-3-5-sonnet-20241022');
        expect(report.modelUsage[0].shareOfCost).toBeCloseTo(0.8);
        expect(report.insights.length).toBeGreaterThan(0);
        expect(report.recommendations.length).toBeGreaterThan(0);
        expect(report.topEntries?.byCost[0].id).toBe('20241101');
        expect(report.costDistribution?.median).toBeCloseTo(0.5);
        expect(report.tokenEfficiency?.costPerThousandTokens).toBeGreaterThan(0);
        expect(report.segments?.some(segment => segment.label === 'Weekdays')).toBe(true);
        const weekendSegment = report.segments?.find(segment => segment.label === 'Weekends');
        expect(weekendSegment?.entryCount).toBe(1);
        expect(report.streaks?.longestPaidRun).toBeGreaterThan(0);
    });
});
