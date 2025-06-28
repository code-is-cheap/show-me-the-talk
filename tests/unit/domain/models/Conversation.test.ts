import { describe, it, expect } from 'vitest';
import { Conversation } from '@/domain/models/Conversation';
import { ProjectContext } from '@/domain/models/ProjectContext';
import { UserMessage, AssistantMessage, TokenUsage, MessageType } from '@/domain/models/Message';

describe('Conversation', () => {
  const projectContext = new ProjectContext('/test/project', 'test-project');
  const startTime = new Date('2023-01-01T10:00:00Z');

  it('should create conversation with basic properties', () => {
    const conversation = new Conversation('session-1', projectContext, startTime);

    expect(conversation.sessionId).toBe('session-1');
    expect(conversation.getProjectContext()).toBe(projectContext);
    expect(conversation.getStartTime()).toBe(startTime);
    expect(conversation.getMessageCount()).toBe(0);
    expect(conversation.hasMessages()).toBe(false);
  });

  it('should add messages and update metrics', () => {
    const conversation = new Conversation('session-1', projectContext, startTime);
    
    const userMessage = new UserMessage(
      'user-1',
      new Date('2023-01-01T10:01:00Z'),
      null,
      'Hello!'
    );
    
    const assistantMessage = new AssistantMessage(
      'assistant-1',
      new Date('2023-01-01T10:02:00Z'),
      'user-1',
      'Hi there!',
      [],
      'claude-3',
      new TokenUsage(10, 5)
    );

    conversation.addMessage(userMessage);
    conversation.addMessage(assistantMessage);

    expect(conversation.getMessageCount()).toBe(2);
    expect(conversation.hasMessages()).toBe(true);
    expect(conversation.getEndTime()).toEqual(new Date('2023-01-01T10:02:00Z'));
    expect(conversation.getDuration()).toBe(2 * 60 * 1000); // 2 minutes in ms
  });

  it('should filter messages by type', () => {
    const conversation = new Conversation('session-1', projectContext, startTime);
    
    const userMessage = new UserMessage('user-1', new Date(), null, 'Question');
    const assistantMessage = new AssistantMessage(
      'assistant-1',
      new Date(),
      null,
      'Answer',
      [],
      'claude-3',
      new TokenUsage(10, 5)
    );

    conversation.addMessage(userMessage);
    conversation.addMessage(assistantMessage);

    expect(conversation.getUserMessages()).toHaveLength(1);
    expect(conversation.getAssistantMessages()).toHaveLength(1);
    expect(conversation.getUserMessages()[0].getType()).toBe(MessageType.USER);
    expect(conversation.getAssistantMessages()[0].getType()).toBe(MessageType.ASSISTANT);
  });

  it('should extract meaningful exchanges', () => {
    const conversation = new Conversation('session-1', projectContext, startTime);
    
    const userMessage1 = new UserMessage('user-1', new Date(), null, 'What is TypeScript?');
    const assistantMessage1 = new AssistantMessage(
      'assistant-1',
      new Date(),
      'user-1',
      'TypeScript is a programming language...',
      [],
      'claude-3',
      new TokenUsage(10, 20)
    );
    
    const userMessage2 = new UserMessage('user-2', new Date(), null, 'How do I install it?');
    const assistantMessage2 = new AssistantMessage(
      'assistant-2',
      new Date(),
      'user-2',
      'You can install TypeScript using npm...',
      [],
      'claude-3',
      new TokenUsage(15, 25)
    );

    conversation.addMessage(userMessage1);
    conversation.addMessage(assistantMessage1);
    conversation.addMessage(userMessage2);
    conversation.addMessage(assistantMessage2);

    const exchanges = conversation.getMeaningfulExchanges();
    expect(exchanges).toHaveLength(2);
    expect(exchanges[0].userMessage.getContent()).toBe('What is TypeScript?');
    expect(exchanges[0].assistantResponses).toHaveLength(1);
    expect(exchanges[1].userMessage.getContent()).toBe('How do I install it?');
    expect(exchanges[1].assistantResponses).toHaveLength(1);
  });
});