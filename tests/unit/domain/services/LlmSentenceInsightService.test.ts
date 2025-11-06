import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LlmSentenceInsightService } from '@/domain/services/analytics/LlmSentenceInsightService.js';
import { SentencePatternAnalyzer } from '@/domain/services/analytics/SentencePatternAnalyzer.js';
import { buildConversation } from '../../../utils/conversationFactory';

const analyzer = new SentencePatternAnalyzer();
const sampleConversations = [
  buildConversation('conv-llm', 'proj', [
    { content: 'How do I deploy this service?' },
    { content: 'Please help me refactor the auth flow.' }
  ])
];

const mockFallback = analyzer.analyze(sampleConversations);

describe('LlmSentenceInsightService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_AUTH_TOKEN: '' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns fallback analysis when API key is missing', async () => {
    const service = new LlmSentenceInsightService({ apiKey: undefined });
    const result = await service.enhanceAnalysis(sampleConversations, analyzer, mockFallback);
    expect(result).toEqual(mockFallback);
  });

  it('invokes remote endpoint and merges response when enabled', async () => {
    const service = new LlmSentenceInsightService({
      endpoint: 'https://open.bigmodel.cn/api/anthropic/v1/messages',
      apiKey: 'test-key',
      model: 'GLM-4.6',
      maxSentences: 10,
      maxTokens: 256
    });

    const remoteSummary = {
      totalSentences: 99,
      uniqueSentences: 50,
      averageSentenceLength: 42,
      averageSentencesPerConversation: 12,
      intentBreakdown: [{ intent: 'question', count: 70, percentage: 70 }],
      topSentences: [
        {
          sentence: 'How do I deploy this service?',
          normalized: 'how do i deploy this service',
          frequency: 10,
          intent: 'question',
          sentiment: 'neutral',
          averageLength: 26,
          tags: ['deployment'],
          conversationCount: 3,
          sampleContexts: ['...deploy this service?...']
        }
      ],
      topQuestions: [],
      troubleshootingSentences: []
    };

    const mockResponse = {
      ok: true,
      json: async () => ({
        id: 'resp-1',
        content: [{ type: 'text', text: JSON.stringify(remoteSummary) }]
      })
    } as unknown as Response;

    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue(mockResponse);

    const result = await service.enhanceAnalysis(sampleConversations, analyzer, mockFallback);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.totalSentences).toBe(remoteSummary.totalSentences);
    expect(result.topSentences[0].sentence).toBe(remoteSummary.topSentences[0].sentence);
  });

  it('falls back when remote response cannot be parsed', async () => {
    const service = new LlmSentenceInsightService({
      endpoint: 'https://open.bigmodel.cn/api/anthropic/v1/messages',
      apiKey: 'test-key'
    });

    const mockResponse = {
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'not-json' }] })
    } as unknown as Response;

    vi.spyOn(global, 'fetch' as any).mockResolvedValue(mockResponse);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await service.enhanceAnalysis(sampleConversations, analyzer, mockFallback);
    expect(result).toEqual(mockFallback);
    warnSpy.mockRestore();
  });
});
