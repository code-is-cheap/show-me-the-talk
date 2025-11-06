import { describe, it, expect } from 'vitest';
import { SentencePatternAnalyzer } from '@/domain/services/analytics/SentencePatternAnalyzer.js';
import { buildConversation } from '../../../utils/conversationFactory';

const analyzer = new SentencePatternAnalyzer();

describe('SentencePatternAnalyzer', () => {
  it('extracts intents, sentiments, and summary metrics', () => {
    const conversation = buildConversation('conv-1', 'proj', [
      { content: 'How do I fix this bug? It keeps failing.' },
      { content: 'Please show me a refactor plan. I need help understanding the difference.' }
    ]);

    const summary = analyzer.analyze([conversation]);

    expect(summary.totalSentences).toBe(4);
    expect(summary.uniqueSentences).toBeGreaterThanOrEqual(3);
    const totalIntentCounts = summary.intentBreakdown.reduce((sum, entry) => sum + entry.count, 0);
    expect(totalIntentCounts).toBe(summary.totalSentences);
    expect(summary.intentBreakdown.some(entry => entry.count > 0)).toBe(true);
    expect(summary.topSentences.length).toBeGreaterThan(0);
    expect(summary.topSentences[0].sentence.length).toBeGreaterThan(0);
  });

  it('collectSentencePrompts limits the number of prompts emitted', () => {
    const conversations = [
      buildConversation('conv-2', 'proj', Array.from({ length: 20 }, (_, idx) => ({
        content: `Sentence number ${idx + 1}.`
      })))
    ];

    const prompts = analyzer.collectSentencePrompts(conversations, 5);
    expect(prompts).toHaveLength(5);
    expect(prompts[0]).toContain('Sentence number 1');
    expect(prompts.at(-1)).toContain('Sentence number 5');
  });
});
