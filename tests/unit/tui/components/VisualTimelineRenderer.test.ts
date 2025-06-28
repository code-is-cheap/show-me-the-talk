import { describe, it, expect, beforeEach } from 'vitest';
import { VisualTimelineRenderer } from '../../../../src/presentation/tui/components/VisualTimelineRenderer';
import { Message, UserMessage, AssistantMessage, TokenUsage } from '../../../../src/domain/models/Message';

describe('VisualTimelineRenderer', () => {
  let renderer: VisualTimelineRenderer;

  beforeEach(() => {
    renderer = new VisualTimelineRenderer();
  });

  describe('constructor and basic functionality', () => {
    it('should create a VisualTimelineRenderer instance', () => {
      expect(renderer).toBeInstanceOf(VisualTimelineRenderer);
    });

    it('should handle empty message arrays', () => {
      expect(() => {
        renderer.renderTimeline([], 0);
      }).not.toThrow();
    });

    it('should return empty timeline indicator for empty messages', () => {
      const result = renderer.renderTimeline([], 0);
      expect(result.some(line => line.includes('No messages to display'))).toBe(true);
    });

    it('should handle basic timeline rendering with messages', () => {
      const messages: Message[] = [
        new UserMessage(
          'user-1',
          new Date('2024-01-01T10:00:00Z'),
          null,
          'Test question'
        ),
        new AssistantMessage(
          'assistant-1',
          new Date('2024-01-01T10:01:00Z'),
          'user-1',
          'Test answer',
          [],
          'claude-3',
          new TokenUsage(50, 30)
        )
      ];

      expect(() => {
        renderer.renderTimeline(messages, 0);
      }).not.toThrow();
    });

    it('should handle configuration options', () => {
      const customRenderer = new VisualTimelineRenderer({
        maxWidth: 60,
        showBorder: false,
        compactMode: true
      });

      expect(customRenderer).toBeInstanceOf(VisualTimelineRenderer);
    });

    it('should return non-empty result for valid messages', () => {
      const messages: Message[] = [
        new UserMessage(
          'user-1',
          new Date('2024-01-01T10:00:00Z'),
          null,
          'Hello'
        )
      ];

      const result = renderer.renderTimeline(messages, 0);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(line => typeof line === 'string')).toBe(true);
    });

    it('should handle current message index', () => {
      const messages: Message[] = [
        new UserMessage('user-1', new Date('2024-01-01T10:00:00Z'), null, 'Message 1'),
        new UserMessage('user-2', new Date('2024-01-01T10:01:00Z'), null, 'Message 2'),
        new UserMessage('user-3', new Date('2024-01-01T10:02:00Z'), null, 'Message 3')
      ];

      expect(() => {
        renderer.renderTimeline(messages, 1); // Second message
      }).not.toThrow();
    });
  });
});