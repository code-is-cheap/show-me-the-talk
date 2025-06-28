import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { ShowMeTheTalk } from '../../src/ShowMeTheTalk';
import { ExportResult } from '../../src/application/dto/ExportDto';

describe('Export Functionality Integration Tests', () => {
  let testDir: string;
  let mockClaudeDir: string;
  let mockProjectDir: string;
  let showMeTheTalk: ShowMeTheTalk;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), 'show-me-the-talk-export-tests');
    mockClaudeDir = join(testDir, '.claude');
    mockProjectDir = join(mockClaudeDir, 'projects');

    // Clean up if exists
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Create directory structure
    mkdirSync(testDir, { recursive: true });
    mkdirSync(mockClaudeDir, { recursive: true });
    mkdirSync(mockProjectDir, { recursive: true });

    // Create mock conversation data
    createMockConversationData();

    // Initialize ShowMeTheTalk with mock directory
    showMeTheTalk = new ShowMeTheTalk(mockClaudeDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('HTML Export Tests', () => {
    it('should export conversations to HTML with proper structure', async () => {
      const outputPath = join(testDir, 'test-export.html');
      
      const result = await showMeTheTalk.export({
        format: 'html',
        outputPath,
        includeMetadata: true,
        simplifyToolInteractions: false
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.conversationCount).toBeGreaterThan(0);
      expect(existsSync(outputPath)).toBe(true);

      // Verify HTML structure
      const htmlContent = readFileSync(outputPath, 'utf-8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<title>Claude Code Conversations - Enhanced View</title>');
      expect(htmlContent).toContain('class="conversation"');
      expect(htmlContent.includes('user-question')).toBe(true);
      expect(htmlContent.includes('assistant-response')).toBe(true);
      expect(htmlContent).toContain('🤖 Assistant');
      expect(htmlContent).toContain('👤 User');
    });

    it('should include styling and responsive design', async () => {
      const outputPath = join(testDir, 'styled-export.html');
      
      const result = await showMeTheTalk.export({
        format: 'html',
        outputPath,
        includeMetadata: true
      });

      expect(result.success).toBe(true);
      
      const htmlContent = readFileSync(outputPath, 'utf-8');
      expect(htmlContent).toContain('font-family: -apple-system');
      expect(htmlContent).toContain('box-shadow:');
      expect(htmlContent).toContain('border-radius:');
      expect(htmlContent).toContain('max-width: 1200px');
      expect(htmlContent).toContain('grid-template-columns');
    });

    it('should properly escape HTML content', async () => {
      // Create conversation with HTML-like content
      const projectPath = join(mockProjectDir, '-test-html-escape');
      mkdirSync(projectPath, { recursive: true });
      
      const sessionId = `html-escape-session-${Date.now()}`;
      const messages = [
        {
          uuid: 'msg-escape-1',
          type: 'user',
          timestamp: new Date().toISOString(),
          sessionId,
          parentUuid: null,
          message: {
            content: '<script>alert("xss")</script> & other HTML entities'
          }
        },
        {
          uuid: 'msg-escape-2',
          type: 'assistant',
          timestamp: new Date().toISOString(),
          sessionId,
          parentUuid: 'msg-escape-1',
          message: {
            content: [
              {
                type: 'text',
                text: 'Response with <code>HTML</code> & "quotes"'
              }
            ]
          }
        }
      ];

      const jsonlContent = messages.map(msg => JSON.stringify(msg)).join('\n') + '\n';
      writeFileSync(
        join(projectPath, `${sessionId}.jsonl`),
        jsonlContent
      );

      const outputPath = join(testDir, 'escaped-export.html');
      const result = await showMeTheTalk.export({
        format: 'html',
        outputPath
      });

      expect(result.success).toBe(true);
      
      const htmlContent = readFileSync(outputPath, 'utf-8');
      expect(htmlContent).toContain('&lt;script&gt;');
      expect(htmlContent).toContain('&amp;');
      expect(htmlContent).toContain('&quot;');
      expect(htmlContent).not.toContain('<script>alert');
    });
  });

  describe('Enhanced Markdown Export Tests', () => {
    it('should export with emojis and enhanced formatting', async () => {
      const outputPath = join(testDir, 'enhanced-markdown.md');
      
      const result = await showMeTheTalk.export({
        format: 'markdown',
        outputPath,
        includeMetadata: true,
        simplifyToolInteractions: false
      });

      expect(result.success).toBe(true);
      
      const mdContent = readFileSync(outputPath, 'utf-8');
      expect(mdContent).toContain('🙋 User Question');
      expect(mdContent).toContain('🤖 Assistant Response');
      expect(mdContent).toContain('🔧 Tools Used');
      expect(mdContent).toContain('💬 Tokens:');
      expect(mdContent).toContain('## Conversation Metrics');
      expect(mdContent).toContain('### Projects');
    });

    it('should include comprehensive metadata', async () => {
      const outputPath = join(testDir, 'metadata-export.md');
      
      const result = await showMeTheTalk.export({
        format: 'markdown',
        outputPath,
        includeMetadata: true
      });

      expect(result.success).toBe(true);
      
      const mdContent = readFileSync(outputPath, 'utf-8');
      expect(mdContent).toContain('**Start Time:**');
      expect(mdContent).toContain('**End Time:**');
      expect(mdContent).toContain('**Duration:**');
      expect(mdContent).toContain('**Message Count:**');
      expect(mdContent).toContain('**Total Conversations:**');
      expect(mdContent).toContain('**Average Messages per Conversation:**');
    });
  });

  describe('Export Format Compatibility Tests', () => {
    it('should export to all supported formats', async () => {
      const formats = [
        { format: 'json', extension: 'json' },
        { format: 'markdown', extension: 'md' },
        { format: 'simple', extension: 'md' },
        { format: 'html', extension: 'html' }
      ];

      for (const { format, extension } of formats) {
        const outputPath = join(testDir, `test-${format}.${extension}`);
        
        const result = await showMeTheTalk.export({
          format: format as any,
          outputPath,
          includeMetadata: true
        });

        expect(result.success).toBe(true);
        expect(result.outputPath).toBe(outputPath);
        expect(existsSync(outputPath)).toBe(true);
        
        const content = readFileSync(outputPath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty conversation data gracefully', async () => {
      // Create empty project directory
      const emptyProjectPath = join(mockProjectDir, '-empty-project');
      mkdirSync(emptyProjectPath, { recursive: true });

      const outputPath = join(testDir, 'empty-export.html');
      const result = await showMeTheTalk.export({
        format: 'html',
        outputPath,
        projectPath: emptyProjectPath
      });

      // Should still succeed with empty data
      expect(result.success).toBe(true);
      expect(result.conversationCount).toBe(0);
      expect(existsSync(outputPath)).toBe(true);
    });
  });

  describe('Export Configuration Tests', () => {
    it('should respect includeMetadata option', async () => {
      const withMetadata = join(testDir, 'with-metadata.md');
      const withoutMetadata = join(testDir, 'without-metadata.md');

      await showMeTheTalk.export({
        format: 'markdown',
        outputPath: withMetadata,
        includeMetadata: true
      });

      await showMeTheTalk.export({
        format: 'markdown',
        outputPath: withoutMetadata,
        includeMetadata: false
      });

      const withContent = readFileSync(withMetadata, 'utf-8');
      const withoutContent = readFileSync(withoutMetadata, 'utf-8');

      // includeMetadata controls whether overall metrics are included
      expect(withContent).toContain('## Conversation Metrics');
      expect(withContent).toContain('**Total Conversations:**');
      expect(withoutContent).not.toContain('## Conversation Metrics');
      expect(withoutContent).not.toContain('**Total Conversations:**');
    });

    it('should handle tool interaction simplification', async () => {
      const simplified = join(testDir, 'simplified-tools.md');
      const detailed = join(testDir, 'detailed-tools.md');

      await showMeTheTalk.export({
        format: 'markdown',
        outputPath: simplified,
        simplifyToolInteractions: true
      });

      await showMeTheTalk.export({
        format: 'markdown',
        outputPath: detailed,
        simplifyToolInteractions: false
      });

      const simplifiedContent = readFileSync(simplified, 'utf-8');
      const detailedContent = readFileSync(detailed, 'utf-8');

      // Detailed should have more tool information
      expect(detailedContent.length).toBeGreaterThanOrEqual(simplifiedContent.length);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid export format', async () => {
      const outputPath = join(testDir, 'invalid-format.txt');
      
      await expect(showMeTheTalk.export({
        format: 'invalid' as any,
        outputPath
      })).rejects.toThrow('Unsupported format');
    });

    it('should handle invalid output path', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/output.html';
      
      const result = await showMeTheTalk.export({
        format: 'html',
        outputPath: invalidPath
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle malformed conversation data', async () => {
      // Create malformed JSONL file
      const malformedProjectPath = join(mockProjectDir, '-malformed-project');
      mkdirSync(malformedProjectPath, { recursive: true });
      
      writeFileSync(
        join(malformedProjectPath, 'malformed.jsonl'),
        'invalid json content\n'
      );

      const outputPath = join(testDir, 'malformed-export.html');
      const result = await showMeTheTalk.export({
        format: 'html',
        outputPath
      });

      // Should still succeed, skipping malformed data
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large conversation exports efficiently', async () => {
      // Create a large conversation
      const largeProjectPath = join(mockProjectDir, '-large-project');
      mkdirSync(largeProjectPath, { recursive: true });

      const sessionId = `large-session-${Date.now()}`;
      const messages = [];

      // Generate 1000 messages
      for (let i = 0; i < 1000; i++) {
        if (i % 2 === 0) {
          // User message
          messages.push({
            uuid: `msg-large-${i}`,
            type: 'user',
            timestamp: new Date(Date.now() + i * 1000).toISOString(),
            sessionId,
            parentUuid: i > 0 ? `msg-large-${i-1}` : null,
            message: {
              content: `This is message ${i} with some content that makes it realistic length for testing performance.`
            }
          });
        } else {
          // Assistant message
          messages.push({
            uuid: `msg-large-${i}`,
            type: 'assistant',
            timestamp: new Date(Date.now() + i * 1000).toISOString(),
            sessionId,
            parentUuid: `msg-large-${i-1}`,
            message: {
              content: [
                {
                  type: 'text',
                  text: `This is message ${i} with some content that makes it realistic length for testing performance.`
                }
              ]
            }
          });
        }
      }

      const jsonlContent = messages.map(msg => JSON.stringify(msg)).join('\n') + '\n';
      writeFileSync(
        join(largeProjectPath, `${sessionId}.jsonl`),
        jsonlContent
      );

      const outputPath = join(testDir, 'large-export.html');
      const startTime = Date.now();
      
      const result = await showMeTheTalk.export({
        format: 'html',
        outputPath
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(existsSync(outputPath)).toBe(true);
    });
  });

  // Helper function to create mock conversation data
  function createMockConversationData() {
    const projects = [
      '-test-project-1',
      '-test-project-2',
      '-test-project-3'
    ];

    projects.forEach((projectName, index) => {
      const projectPath = join(mockProjectDir, projectName);
      mkdirSync(projectPath, { recursive: true });

      const sessionId = `session-${index + 1}-${Date.now()}`;
      const startTime = new Date(Date.now() - (index + 1) * 86400000);
      
      // Create individual message entries in Claude Code JSONL format
      const messages = [
        {
          uuid: `msg-${index + 1}-1`,
          type: 'user',
          timestamp: startTime.toISOString(),
          sessionId,
          parentUuid: null,
          message: {
            content: `How can I implement feature ${index + 1} in my project?`
          }
        },
        {
          uuid: `msg-${index + 1}-2`, 
          type: 'assistant',
          timestamp: new Date(startTime.getTime() + 1000).toISOString(),
          sessionId,
          parentUuid: `msg-${index + 1}-1`,
          message: {
            content: [
              {
                type: 'text',
                text: `I'll help you implement feature ${index + 1}. Here's what you need to do:\n\n\`\`\`javascript\nfunction feature${index + 1}() {\n  return 'implementation';\n}\n\`\`\``
              },
              {
                type: 'tool_use',
                id: `tool-${index + 1}-1`,
                name: 'Read',
                input: { file_path: `file${index + 1}.js` }
              },
              {
                type: 'tool_use',
                id: `tool-${index + 1}-2`,
                name: 'Edit',
                input: { file_path: `file${index + 1}.js`, old_string: 'old', new_string: 'new' }
              }
            ],
            usage: {
              input_tokens: 50 + index * 10,
              output_tokens: 200 + index * 20
            }
          }
        },
        {
          uuid: `msg-${index + 1}-3`,
          type: 'user', 
          timestamp: new Date(startTime.getTime() + 2000).toISOString(),
          sessionId,
          parentUuid: `msg-${index + 1}-2`,
          message: {
            content: `Thank you! That works perfectly.`
          }
        },
        {
          uuid: `msg-${index + 1}-4`,
          type: 'assistant',
          timestamp: new Date(startTime.getTime() + 3000).toISOString(),
          sessionId,
          parentUuid: `msg-${index + 1}-3`,
          message: {
            content: [
              {
                type: 'text',
                text: `Great! I'm glad the implementation works for you. Is there anything else you'd like me to help with?`
              }
            ],
            usage: {
              input_tokens: 20,
              output_tokens: 50
            }
          }
        }
      ];

      // Write each message as a separate line in JSONL format
      const jsonlContent = messages.map(msg => JSON.stringify(msg)).join('\n') + '\n';
      
      writeFileSync(
        join(projectPath, `${sessionId}.jsonl`),
        jsonlContent
      );
    });
  }
});