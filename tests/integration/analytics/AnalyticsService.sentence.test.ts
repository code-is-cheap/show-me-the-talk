import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnalyticsService } from '@/domain/services/analytics/AnalyticsService.js';
import { SentencePatternAnalyzer } from '@/domain/services/analytics/SentencePatternAnalyzer.js';
import { LlmSentenceInsightService } from '@/domain/services/analytics/LlmSentenceInsightService.js';
import { PrivacyLevel, PrivacySettings } from '@/domain/models/analytics/index.js';
import { buildConversation } from '../../utils/conversationFactory';

const makeService = () => new AnalyticsService();

const makeConversations = () => [
  buildConversation('conv-int-1', 'proj', [
    { content: 'How can I improve performance?' },
    { content: 'I keep seeing an error when deploying.' }
  ])
];

describe('AnalyticsService sentence pattern integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to heuristic analysis when LLM disabled', async () => {
    const conversations = makeConversations();
    const analyzer = new SentencePatternAnalyzer();
    const expected = analyzer.analyze(conversations);

    const service = makeService();
    const report = await service.generateReport(
      conversations,
      PrivacySettings.forLevel(PrivacyLevel.TRANSPARENT)
    );

    expect(report.sentencePatterns).toBeDefined();
    expect(report.sentencePatterns?.totalSentences).toBe(expected.totalSentences);
  });

  it('uses LLM-enhanced summary when available', async () => {
    const conversations = makeConversations();
    const enhancedSummary = {
      totalSentences: 123,
      uniqueSentences: 45,
      averageSentenceLength: 30,
      averageSentencesPerConversation: 12,
      intentBreakdown: [{ intent: 'question', count: 100, percentage: 81 }],
      topSentences: [],
      topQuestions: [],
      troubleshootingSentences: []
    };

    vi.spyOn(LlmSentenceInsightService.prototype, 'enhanceAnalysis').mockImplementation(
      async (_conversations, _analyzer, fallback) => ({
        ...fallback,
        ...enhancedSummary
      })
    );

    const service = makeService();
    const report = await service.generateReport(
      conversations,
      PrivacySettings.forLevel(PrivacyLevel.TRANSPARENT)
    );

    expect(report.sentencePatterns?.totalSentences).toBe(enhancedSummary.totalSentences);
    expect(report.sentencePatterns?.intentBreakdown?.[0]?.intent).toBe('question');
  });
});
