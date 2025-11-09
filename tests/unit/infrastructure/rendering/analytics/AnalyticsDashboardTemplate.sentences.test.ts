import { describe, it, expect } from 'vitest';
import { AnalyticsDashboardTemplate } from '@/infrastructure/rendering/analytics/AnalyticsDashboardTemplate.js';
import { AnalyticsReport, WordCloudData, WordCloudMode, ClusterCollection, ClusterType, PrivacySettings, PrivacyLevel } from '@/domain/models/analytics/index.js';

const emptyCluster = new ClusterCollection([], ClusterType.TASK_TYPE, 0);
const baseWordCloud = new WordCloudData([], [], [], WordCloudMode.WORD, 0, 0);
const stats = {
  totalConversations: 1,
  totalMessages: 2,
  totalWords: 20,
  averageMessagesPerConversation: 2,
  averageWordsPerMessage: 10,
  dateRange: { start: new Date('2025-01-01T00:00:00Z'), end: new Date('2025-01-02T00:00:00Z') },
  topProjects: [],
  mostActiveDay: null,
  mostActiveHour: null
};

const sentencePatterns = {
  totalSentences: 5,
  uniqueSentences: 4,
  averageSentenceLength: 32,
  averageSentencesPerConversation: 5,
  intentBreakdown: [
    { intent: 'question', count: 3, percentage: 60 },
    { intent: 'issue', count: 2, percentage: 40 }
  ],
  topSentences: [
    {
      sentence: 'How do I deploy this service?',
      normalized: 'how do i deploy this service',
      frequency: 3,
      intent: 'question',
      sentiment: 'neutral',
      averageLength: 28,
      tags: ['deployment'],
      conversationCount: 2,
      sampleContexts: ['…deploy this service?…']
    }
  ],
  topQuestions: [],
  troubleshootingSentences: []
};

const report = new AnalyticsReport(
  baseWordCloud,
  emptyCluster,
  emptyCluster,
  emptyCluster,
  [],
  stats,
  [],
  PrivacySettings.forLevel(PrivacyLevel.TRANSPARENT),
  new Date('2025-01-05T00:00:00Z'),
  'test-version',
  undefined,
  undefined,
  undefined,
  undefined,
  sentencePatterns,
  undefined
);

describe('AnalyticsDashboardTemplate sentence section', () => {
  it('renders signature sentences section when data present', () => {
    const template = new AnalyticsDashboardTemplate();
    const html = template.render(report);

    expect(html).toContain('Signature Sentences');
    expect(html).toContain('How do I deploy this service?');
    expect(html).toContain('intent-pill');
    expect(html).toContain('sentence-table');
    expect(html).toContain('deployment');
  });

  it('renders hourly momentum section when hourly data is attached', () => {
    const hourlyReport = new AnalyticsReport(
      baseWordCloud,
      emptyCluster,
      emptyCluster,
      emptyCluster,
      [],
      stats,
      [],
      PrivacySettings.forLevel(PrivacyLevel.TRANSPARENT),
      new Date('2025-01-05T00:00:00Z'),
      'test-version',
      undefined,
      undefined,
      undefined,
      undefined,
      sentencePatterns,
      {
        timezone: 'America/Los_Angeles',
        totalEvents: 42,
        buckets: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          count: hour === 14 ? 6 : 1,
          label: `${hour}:00`
        })),
        weekdayMatrix: Array.from({ length: 7 }, () => Array(24).fill(0)),
        peakHour: { hour: 14, count: 6, label: '2 PM' },
        quietHour: { hour: 3, count: 0, label: '3 AM' },
        focusWindow: { startHour: 13, endHour: 16, spanHours: 3, averageCount: 4, label: '1 PM – 4 PM' },
        nightShare: 0.1,
        earlyShare: 0.2,
        weekendShare: 0.15,
        dominantDay: { dayIndex: 2, label: 'Wed', count: 20 },
        recommendations: [
          { icon: '🎯', title: 'Test Rec', description: 'Keep momentum high.', tone: 'positive' }
        ],
        samples: [
          { timestamp: new Date('2025-01-05T10:00:00Z'), source: 'history', label: 'Sample', project: 'demo' }
        ],
        sourceBreakdown: { history: 30, conversation: 12 },
        trendStatement: 'Peak hits around 2 PM on Wednesdays.'
      }
    );

    const template = new AnalyticsDashboardTemplate();
    const html = template.render(hourlyReport);

    expect(html).toContain('Hourly Momentum');
    expect(html).toContain('Peak Hour');
    expect(html).toContain('24-Hour Pulse');
    expect(html).toContain('Weekpart Heatmap');
  });
});
