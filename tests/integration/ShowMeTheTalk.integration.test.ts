import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShowMeTheTalk } from '@/ShowMeTheTalk';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('ShowMeTheTalk Integration Tests', () => {
  const testDir = './test-claude-data';
  const projectDir = join(testDir, 'projects', '-test-project');
  const sessionFile = join(projectDir, 'test-session-123.jsonl');

  beforeEach(() => {
    // Setup test directory structure
    mkdirSync(projectDir, { recursive: true });

    // Create test JSONL data
    const testMessages = [
      {
        uuid: 'user-1',
        parentUuid: null,
        sessionId: 'test-session-123',
        timestamp: '2023-01-01T10:00:00Z',
        type: 'user',
        message: {
          role: 'user',
          content: 'How do I implement DDD in TypeScript?'
        }
      },
      {
        uuid: 'assistant-1',
        parentUuid: 'user-1',
        sessionId: 'test-session-123',
        timestamp: '2023-01-01T10:01:00Z',
        type: 'assistant',
        message: {
          id: 'msg-1',
          type: 'message',
          role: 'assistant',
          model: 'claude-3',
          content: [
            {
              type: 'text',
              text: 'To implement Domain Driven Design in TypeScript, you should start with defining your domain models...'
            }
          ],
          usage: {
            input_tokens: 20,
            output_tokens: 50
          }
        }
      },
      {
        uuid: 'user-2',
        parentUuid: 'assistant-1',
        sessionId: 'test-session-123',
        timestamp: '2023-01-01T10:02:00Z',
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: '/src/domain/models/User.ts\nclass User {\n  constructor(...)'
            }
          ]
        }
      },
      {
        uuid: 'assistant-2',
        parentUuid: 'user-2',
        sessionId: 'test-session-123',
        timestamp: '2023-01-01T10:03:00Z',
        type: 'assistant',
        message: {
          id: 'msg-2',
          type: 'message',
          role: 'assistant',
          model: 'claude-3',
          content: [
            {
              type: 'text',
              text: 'Great! I can see you\'ve started with a User domain model. Let me help you improve it...'
            },
            {
              type: 'tool_use',
              id: 'tool-2',
              name: 'Edit',
              input: {
                file_path: '/src/domain/models/User.ts',
                old_string: 'class User {',
                new_string: 'export class User {'
              }
            }
          ],
          usage: {
            input_tokens: 30,
            output_tokens: 40
          }
        }
      }
    ];

    const jsonlContent = testMessages.map(msg => JSON.stringify(msg)).join('\n');
    writeFileSync(sessionFile, jsonlContent);
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Basic Functionality', () => {
    it('should parse conversations from test data', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const conversations = await smtt.getAllConversations();

      expect(conversations).toHaveLength(1);
      expect(conversations[0].sessionId).toBe('test-session-123');
      expect(conversations[0].projectPath).toBe('-test-project');
      expect(conversations[0].messageCount).toBe(3); // Tool result message is filtered out
    });

    it('should get specific conversation by session ID', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const conversation = await smtt.getConversation('test-session-123');

      expect(conversation).toBeTruthy();
      expect(conversation!.sessionId).toBe('test-session-123');
      expect(conversation!.messages).toHaveLength(3); // Tool result message is filtered out
    });

    it('should return null for non-existent session', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const conversation = await smtt.getConversation('non-existent');

      expect(conversation).toBeNull();
    });
  });

  describe('Export Functionality', () => {
    it('should export to JSON format', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const outputPath = join(testDir, 'export-test.json');

      const result = await smtt.export({
        format: 'json',
        outputPath,
        includeMetadata: true
      });

      expect(result.success).toBe(true);
      expect(result.conversationCount).toBe(1);
      expect(existsSync(outputPath)).toBe(true);

      // Verify exported content
      const exportedData = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));
      expect(exportedData.conversations).toHaveLength(1);
      expect(exportedData.metrics).toBeTruthy();
    });

    it('should export to simplified markdown format', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const outputPath = join(testDir, 'export-test.md');

      const result = await smtt.export({
        format: 'simple',
        outputPath,
        simplifyToolInteractions: true
      });

      expect(result.success).toBe(true);
      expect(existsSync(outputPath)).toBe(true);

      // Verify exported content
      const exportedContent = require('fs').readFileSync(outputPath, 'utf-8');
      expect(exportedContent).toContain('# Claude Code Conversations (Simplified)');
      expect(exportedContent).toContain('How do I implement DDD in TypeScript?');
      expect(exportedContent).toContain('To implement Domain Driven Design');
      // Tool result messages are now filtered out, so this content won't appear
      // expect(exportedContent).toContain('[Viewed: /src/domain/models/User.ts]');
    });

    it('should export specific session only', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const outputPath = join(testDir, 'session-export.json');

      const result = await smtt.export({
        format: 'json',
        outputPath,
        sessionId: 'test-session-123'
      });

      expect(result.success).toBe(true);
      expect(result.conversationCount).toBe(1);

      const exportedData = JSON.parse(require('fs').readFileSync(outputPath, 'utf-8'));
      expect(exportedData.conversations).toHaveLength(1);
      expect(exportedData.conversations[0].sessionId).toBe('test-session-123');
    });
  });

  describe('Metrics and Analysis', () => {
    it('should calculate conversation metrics', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const metrics = await smtt.getMetrics();

      expect(metrics.totalConversations).toBe(1);
      expect(metrics.totalMessages).toBe(3); // Tool result message is filtered out
      expect(metrics.averageMessagesPerConversation).toBe(3);
      expect(metrics.projectCounts['-test-project']).toBe(1);
    });

    it('should categorize conversations', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const categorized = await smtt.getCategorizedConversations();

      expect(categorized.learning).toHaveLength(1); // \"How do I implement\" indicates learning
      expect(categorized.debugging).toHaveLength(0);
      expect(categorized.implementation).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy?.mockRestore();
      consoleErrorSpy = null;
    });

    it('should handle non-existent claude directory gracefully', async () => {
      const smtt = new ShowMeTheTalk('./non-existent-dir');
      const conversations = await smtt.getAllConversations();

      expect(conversations).toHaveLength(0);
    });

    it('should handle export to invalid path gracefully', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const invalidPath = '/invalid/path/that/does/not/exist/file.json';

      const result = await smtt.export({
        format: 'json',
        outputPath: invalidPath
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle empty JSONL files gracefully', async () => {
      const emptyFile = join(projectDir, 'empty-session.jsonl');
      writeFileSync(emptyFile, '');

      const smtt = new ShowMeTheTalk(testDir);
      const conversations = await smtt.getAllConversations();

      // Should still return the valid conversation, ignoring empty file
      expect(conversations).toHaveLength(1);
      expect(conversations[0].sessionId).toBe('test-session-123');
    });

    it('should handle malformed JSONL data gracefully', async () => {
      const malformedFile = join(projectDir, 'malformed-session.jsonl');
      writeFileSync(malformedFile, '{invalid json\n{"valid": "json"}');

      const smtt = new ShowMeTheTalk(testDir);
      const conversations = await smtt.getAllConversations();

      // Should still return the valid conversation
      expect(conversations).toHaveLength(1);
    });
  });

  describe('Advanced Scenarios', () => {
    it('should handle multiple projects with different conversation patterns', async () => {
      // Create a second project with different conversation types
      const project2Dir = join(testDir, 'projects', 'debugging-project');
      const session2File = join(project2Dir, 'debug-session-456.jsonl');
      mkdirSync(project2Dir, { recursive: true });

      const debugMessages = [
        {
          uuid: 'debug-user-1',
          parentUuid: null,
          sessionId: 'debug-session-456',
          timestamp: '2023-02-01T10:00:00Z',
          type: 'user',
          message: {
            role: 'user',
            content: 'I have a bug in my application that crashes on startup'
          }
        },
        {
          uuid: 'debug-assistant-1',
          parentUuid: 'debug-user-1',
          sessionId: 'debug-session-456',
          timestamp: '2023-02-01T10:01:00Z',
          type: 'assistant',
          message: {
            id: 'debug-msg-1',
            type: 'message',
            role: 'assistant',
            model: 'claude-3',
            content: [
              {
                type: 'text',
                text: 'Let me help you debug this startup crash. Can you share the error logs?'
              }
            ],
            usage: {
              input_tokens: 15,
              output_tokens: 25
            }
          }
        }
      ];

      const debugJsonlContent = debugMessages.map(msg => JSON.stringify(msg)).join('\n');
      writeFileSync(session2File, debugJsonlContent);

      const smtt = new ShowMeTheTalk(testDir);
      const conversations = await smtt.getAllConversations();
      const categorized = await smtt.getCategorizedConversations();
      const metrics = await smtt.getMetrics();

      expect(conversations).toHaveLength(2);
      expect(categorized.learning).toHaveLength(1); // DDD question
      expect(categorized.debugging).toHaveLength(1); // Bug report
      expect(metrics.totalConversations).toBe(2);
      expect(metrics.projectCounts['-test-project']).toBe(1);
      expect(metrics.projectCounts['debugging-project']).toBe(1);
    });

    it('should export to full markdown with rich metadata', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const outputPath = join(testDir, 'full-export.md');

      const result = await smtt.export({
        format: 'markdown',
        outputPath,
        includeMetadata: true
      });

      expect(result.success).toBe(true);
      expect(existsSync(outputPath)).toBe(true);

      const exportedContent = require('fs').readFileSync(outputPath, 'utf-8');
      expect(exportedContent).toContain('# Claude Code Conversations');
      expect(exportedContent).toContain('Session: test-session-123');
      expect(exportedContent).toContain('**Project:** -test-project');
      expect(exportedContent).toContain('**Message Count:** 3'); // Tool result message is filtered out
      expect(exportedContent).toContain('🙋 User Question'); // Enhanced markdown format
      expect(exportedContent).toContain('🤖 Assistant Response'); // Enhanced markdown format
    });

    it('should handle project filtering correctly', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const projectConversations = await smtt.getProjectConversations('-test-project');

      expect(projectConversations).toHaveLength(1);
      expect(projectConversations[0].sessionId).toBe('test-session-123');
      expect(projectConversations[0].projectPath).toBe('-test-project');
    });

    it('should calculate accurate duration metrics', async () => {
      const smtt = new ShowMeTheTalk(testDir);
      const conversations = await smtt.getAllConversations();
      const metrics = await smtt.getMetrics();

      expect(conversations[0].duration).toBeGreaterThan(0);
      expect(metrics.averageDurationMs).toBeGreaterThan(0);
      expect(metrics.dateRange.earliest).toBeTruthy();
      expect(metrics.dateRange.latest).toBeTruthy();
    });
  });
});
