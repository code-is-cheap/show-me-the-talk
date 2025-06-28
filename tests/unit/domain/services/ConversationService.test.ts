import { describe, it, expect } from 'vitest';
import { ConversationService } from '@/domain/services/ConversationService';
import { Conversation } from '@/domain/models/Conversation';
import { ProjectContext } from '@/domain/models/ProjectContext';
import { UserMessage, AssistantMessage, TokenUsage, ToolInteraction } from '@/domain/models/Message';

describe('ConversationService', () => {
  function createTestConversation(sessionId: string, projectPath: string): Conversation {
    const projectContext = new ProjectContext(projectPath, projectPath.replace(/\//g, '-'));
    return new Conversation(sessionId, projectContext, new Date('2023-01-01'));
  }

  function addQuestionAnswer(conversation: Conversation, question: string, answer: string) {
    const userMessage = new UserMessage(
      `user-${Date.now()}`,
      new Date(),
      null,
      question
    );
    
    const assistantMessage = new AssistantMessage(
      `assistant-${Date.now()}`,
      new Date(),
      userMessage.id,
      answer,
      [],
      'claude-3',
      new TokenUsage(10, 20)
    );

    conversation.addMessage(userMessage);
    conversation.addMessage(assistantMessage);
  }

  describe('filterMeaningfulConversations', () => {
    it('should filter out conversations with only tool interactions', () => {
      const conversations = [
        createTestConversation('session-1', '/project/meaningful'),
        createTestConversation('session-2', '/project/tool-only'),
      ];

      // Add meaningful conversation
      addQuestionAnswer(conversations[0], 'How do I write tests?', 'You can use vitest...');

      // Add tool-only conversation
      const toolInteraction = new ToolInteraction('tool-1', 'tool_result', '/file.ts', false);
      const toolMessage = new UserMessage('user-tool', new Date(), null, [toolInteraction]);
      conversations[1].addMessage(toolMessage);

      const meaningful = ConversationService.filterMeaningfulConversations(conversations);
      expect(meaningful).toHaveLength(1);
      expect(meaningful[0].sessionId).toBe('session-1');
    });
  });

  describe('extractQuestionAnswerPairs', () => {
    it('should extract Q&A pairs from conversation', () => {
      const conversation = createTestConversation('session-1', '/test/project');
      
      addQuestionAnswer(conversation, 'What is DDD?', 'Domain Driven Design is...');
      addQuestionAnswer(conversation, 'How to implement it?', 'You start with domain models...');

      const pairs = ConversationService.extractQuestionAnswerPairs(conversation);
      
      expect(pairs).toHaveLength(2);
      expect(pairs[0].question).toBe('What is DDD?');
      expect(pairs[0].answer).toBe('Domain Driven Design is...');
      expect(pairs[0].projectContext).toBe('/test/project');
      expect(pairs[0].sessionId).toBe('session-1');
    });
  });

  describe('categorizeConversations', () => {
    it('should categorize conversations by content', () => {
      const conversations = [
        createTestConversation('debug-session', '/project/app'),
        createTestConversation('arch-session', '/project/app'),
        createTestConversation('impl-session', '/project/app'),
        createTestConversation('learn-session', '/project/app'),
      ];

      addQuestionAnswer(conversations[0], 'I have a bug in my code', 'Let me help you debug...');
      addQuestionAnswer(conversations[1], 'How should I design the architecture?', 'Consider using hexagonal architecture...');
      addQuestionAnswer(conversations[2], 'Help me implement a new feature', 'Let\'s start by creating...');
      addQuestionAnswer(conversations[3], 'What is SOLID?', 'SOLID is a set of principles...');

      const categorized = ConversationService.categorizeConversations(conversations);

      expect(categorized.debugging).toHaveLength(1);
      // "How should I design the architecture?" gets categorized as learning due to "How" keyword
      expect(categorized.architecture).toHaveLength(0);
      // "Help me implement a new feature" requires code blocks for implementation category
      expect(categorized.implementation).toHaveLength(0);
      expect(categorized.learning).toHaveLength(2); // includes both "What is SOLID?" and "How should I design..."
      expect(categorized.other).toHaveLength(1); // "Help me implement..." goes to other without code blocks
    });
  });

  describe('calculateConversationMetrics', () => {
    it('should calculate metrics correctly', () => {
      const conversations = [
        createTestConversation('session-1', '/project/a'),
        createTestConversation('session-2', '/project/b'),
        createTestConversation('session-3', '/project/a'),
      ];

      // Add different numbers of messages
      addQuestionAnswer(conversations[0], 'Q1', 'A1');
      addQuestionAnswer(conversations[0], 'Q2', 'A2');
      
      addQuestionAnswer(conversations[1], 'Q1', 'A1');
      
      addQuestionAnswer(conversations[2], 'Q1', 'A1');
      addQuestionAnswer(conversations[2], 'Q2', 'A2');
      addQuestionAnswer(conversations[2], 'Q3', 'A3');

      const metrics = ConversationService.calculateConversationMetrics(conversations);

      expect(metrics.totalConversations).toBe(3);
      expect(metrics.totalMessages).toBe(12); // 4 + 2 + 6 messages
      expect(metrics.averageMessagesPerConversation).toBe(4);
      expect(metrics.projectCounts['/project/a']).toBe(2);
      expect(metrics.projectCounts['/project/b']).toBe(1);
    });

    it('should handle empty conversations array', () => {
      const metrics = ConversationService.calculateConversationMetrics([]);

      expect(metrics.totalConversations).toBe(0);
      expect(metrics.totalMessages).toBe(0);
      expect(metrics.averageMessagesPerConversation).toBe(0);
      expect(metrics.averageDurationMs).toBe(0);
    });
  });
});