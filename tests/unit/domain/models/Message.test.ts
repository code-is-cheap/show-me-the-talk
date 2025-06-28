import { describe, it, expect } from 'vitest';
import { UserMessage, AssistantMessage, ToolInteraction, ToolUse, TokenUsage, MessageType } from '@/domain/models/Message';

describe('Message Domain Models', () => {
  describe('UserMessage', () => {
    it('should create user message with string content', () => {
      const message = new UserMessage(
        'test-id',
        new Date('2023-01-01'),
        null,
        'Hello, world!'
      );

      expect(message.id).toBe('test-id');
      expect(message.getType()).toBe(MessageType.USER);
      expect(message.getContent()).toBe('Hello, world!');
      expect(message.hasToolInteractions()).toBe(false);
    });

    it('should create user message with tool interactions', () => {
      const toolInteraction = new ToolInteraction(
        'tool-1',
        'tool_result',
        '/path/to/file.ts',
        false
      );

      const message = new UserMessage(
        'test-id',
        new Date('2023-01-01'),
        null,
        [toolInteraction]
      );

      expect(message.hasToolInteractions()).toBe(true);
      expect(message.getToolInteractions()).toHaveLength(1);
      expect(message.getContent()).toContain('[Viewed: /path/to/file.ts]');
    });
  });

  describe('AssistantMessage', () => {
    it('should create assistant message with all properties', () => {
      const toolUse = new ToolUse('tool-1', 'Read', { file_path: '/test.ts' });
      const usage = new TokenUsage(100, 50, 10, 5);

      const message = new AssistantMessage(
        'test-id',
        new Date('2023-01-01'),
        'parent-id',
        'This is the response',
        [toolUse],
        'claude-3',
        usage
      );

      expect(message.getType()).toBe(MessageType.ASSISTANT);
      expect(message.getContent()).toBe('This is the response');
      expect(message.getModel()).toBe('claude-3');
      expect(message.getUsage().getTotalTokens()).toBe(150);
      expect(message.getToolUses()).toHaveLength(1);
    });
  });

  describe('ToolInteraction', () => {
    it('should create summary for file path', () => {
      const interaction = new ToolInteraction(
        'tool-1',
        'tool_result',
        '/Users/test/project/file.ts\nline 2\nline 3',
        false
      );

      expect(interaction.getSummary()).toBe('[Viewed: /Users/test/project/file.ts]');
    });

    it('should create summary for error', () => {
      const interaction = new ToolInteraction(
        'tool-1',
        'tool_result',
        'Error: File not found',
        true
      );

      expect(interaction.getSummary()).toBe('[Error: Error: File not found...]');
    });

    it('should create summary for regular tool result', () => {
      const interaction = new ToolInteraction(
        'tool-1',
        'tool_result',
        'Some output from tool execution that is quite long',
        false
      );

      expect(interaction.getSummary()).toBe('[Tool result: Some output from tool execution that is quite long...]');
    });
  });

  describe('TokenUsage', () => {
    it('should calculate total tokens correctly', () => {
      const usage = new TokenUsage(100, 50, 25, 10);
      expect(usage.getTotalTokens()).toBe(150);
    });
  });
});