import { Conversation } from '@/domain/models/Conversation.js';
import { ProjectContext } from '@/domain/models/ProjectContext.js';
import { UserMessage, AssistantMessage } from '@/domain/models/Message.js';

type MessageRole = 'user' | 'assistant';

interface MessageInput {
  role?: MessageRole;
  content: string;
  minutesOffset?: number;
}

const DEFAULT_START = new Date('2025-01-01T09:00:00.000Z');

export function buildConversation(
  id: string,
  project: string,
  messages: MessageInput[]
): Conversation {
  const conversation = new Conversation(
    id,
    new ProjectContext(project, `/projects/${project}`),
    DEFAULT_START
  );

  messages.forEach((msg, index) => {
    const timestamp = new Date(DEFAULT_START.getTime() + (msg.minutesOffset ?? index) * 60_000);
    const role: MessageRole = msg.role ?? 'user';
    if (role === 'assistant') {
      conversation.addMessage(
        new AssistantMessage(
          `${id}-assistant-${index}`,
          timestamp,
          null,
          msg.content,
          [],
          'test-model',
          { inputTokens: 0, outputTokens: 0 }
        )
      );
    } else {
      conversation.addMessage(
        new UserMessage(
          `${id}-user-${index}`,
          timestamp,
          null,
          msg.content
        )
      );
    }
  });

  return conversation;
}
