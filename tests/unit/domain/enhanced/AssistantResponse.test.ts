import { describe, it, expect, vi } from 'vitest';
import { AssistantResponse } from '../../../../src/domain/models/enhanced/AssistantResponse';
import { TokenUsage, ToolUse } from '../../../../src/domain/models/enhanced/ResponseTypes';
import { ConversationElementType, ContentImportance, ContentCategory } from '../../../../src/domain/models/enhanced/ConversationElementType';
import { ConversationRenderVisitor } from '../../../../src/domain/models/rendering/ConversationRenderVisitor';
import { RenderableContent, VisualStyle } from '../../../../src/domain/models/rendering/RenderableContent';

describe('AssistantResponse', () => {
  const mockVisitor: ConversationRenderVisitor = {
    visitUserQuestion: vi.fn(),
    visitAssistantResponse: vi.fn().mockReturnValue(RenderableContent.create('rendered response', VisualStyle.STANDARD)),
    visitToolInteractionGroup: vi.fn(),
    visitCodeBlock: vi.fn()
  };

  const mockCodeBlock = {
    language: 'javascript',
    content: 'function test() { return "hello"; }',
    filename: 'test.js'
  };

  const mockToolUse = new ToolUse(
    'tool1',
    'read',
    { file_path: '/test/file.js' },
    'file content',
    true,
    150
  );

  const mockTokenUsage = new TokenUsage(500, 800);

  describe('构造函数和基础属性', () => {
    it('should initialize with required properties', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const response = new AssistantResponse(
        'r1',
        timestamp,
        'This is a test response',
        [mockCodeBlock],
        [mockToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage,
        'This is my reasoning',
        0.9,
        1
      );

      expect(response.id).toBe('r1');
      expect(response.timestamp).toBe(timestamp);
      expect(response.textContent).toBe('This is a test response');
      expect(response.codeBlocks).toEqual([mockCodeBlock]);
      expect(response.toolUses).toEqual([mockToolUse]);
      expect(response.model).toBe('claude-3.5-sonnet');
      expect(response.usage).toBe(mockTokenUsage);
      expect(response.reasoning).toBe('This is my reasoning');
      expect(response.confidence).toBe(0.9);
      expect(response.turnNumber).toBe(1);
      expect(response.type).toBe(ConversationElementType.ASSISTANT_RESPONSE);
      expect(response.importance).toBe(ContentImportance.PRIMARY);
    });

    it('should use default values for optional parameters', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Simple response',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.reasoning).toBeUndefined();
      expect(response.confidence).toBeUndefined();
      expect(response.turnNumber).toBe(0);
      expect(response.codeBlocks).toEqual([]);
      expect(response.toolUses).toEqual([]);
    });
  });

  describe('响应类型识别', () => {
    it('should identify mixed response type', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Here is the solution with code:',
        [mockCodeBlock],
        [mockToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.getResponseType()).toBe('mixed');
    });

    it('should identify code-solution response type', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Here is the code solution:',
        [mockCodeBlock],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.getResponseType()).toBe('code-solution');
    });

    it('should identify analysis response type', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Let me analyze this for you.',
        [],
        [mockToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.getResponseType()).toBe('analysis');
    });

    it('should identify explanation response type', () => {
      const longExplanation = 'This is a very detailed explanation that goes into great depth about the topic at hand, covering various aspects and providing comprehensive information to help you understand the concept thoroughly and completely with all necessary details and examples.';
      const response = new AssistantResponse(
        'r1',
        new Date(),
        longExplanation,
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.getResponseType()).toBe('explanation');
    });

    it('should identify guidance response type', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'I recommend you should try this approach.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.getResponseType()).toBe('guidance');
    });

    it('should identify correction response type', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Actually, that is incorrect. The right answer is...',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.getResponseType()).toBe('correction');
    });

    it('should identify confirmation response type', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Yes, that is exactly correct.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.getResponseType()).toBe('confirmation');
    });
  });

  describe('内容类型检查', () => {
    it('should detect code content', () => {
      const responseWithCodeBlocks = new AssistantResponse(
        'r1',
        new Date(),
        'Here is code:',
        [mockCodeBlock],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const responseWithInlineCode = new AssistantResponse(
        'r2',
        new Date(),
        'Use `console.log()` for debugging.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const responseWithoutCode = new AssistantResponse(
        'r3',
        new Date(),
        'This is just text.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(responseWithCodeBlocks.hasContentType('code')).toBe(true);
      expect(responseWithInlineCode.hasContentType('code')).toBe(true);
      expect(responseWithoutCode.hasContentType('code')).toBe(false);
    });

    it('should detect tools usage', () => {
      const responseWithTools = new AssistantResponse(
        'r1',
        new Date(),
        'Let me check that file.',
        [],
        [mockToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const responseWithoutTools = new AssistantResponse(
        'r2',
        new Date(),
        'Simple response.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(responseWithTools.hasContentType('tools')).toBe(true);
      expect(responseWithoutTools.hasContentType('tools')).toBe(false);
    });

    it('should detect long content', () => {
      const longContent = 'x'.repeat(1500);
      const longResponse = new AssistantResponse(
        'r1',
        new Date(),
        longContent,
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const shortResponse = new AssistantResponse(
        'r2',
        new Date(),
        'Short response.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(longResponse.hasContentType('long')).toBe(true);
      expect(shortResponse.hasContentType('long')).toBe(false);
    });

    it('should detect reasoning content', () => {
      const responseWithReasoning = new AssistantResponse(
        'r1',
        new Date(),
        'Answer',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage,
        'This is my reasoning process'
      );

      const responseWithoutReasoning = new AssistantResponse(
        'r2',
        new Date(),
        'Answer',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(responseWithReasoning.hasContentType('reasoning')).toBe(true);
      expect(responseWithoutReasoning.hasContentType('reasoning')).toBe(false);
    });

    it('should detect confident responses', () => {
      const confidentResponse = new AssistantResponse(
        'r1',
        new Date(),
        'Answer',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage,
        undefined,
        0.9
      );

      const uncertainResponse = new AssistantResponse(
        'r2',
        new Date(),
        'Answer',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage,
        undefined,
        0.3
      );

      expect(confidentResponse.hasContentType('confident')).toBe(true);
      expect(uncertainResponse.hasContentType('confident')).toBe(false);
      expect(uncertainResponse.hasContentType('experimental')).toBe(true);
    });

    it('should detect critical tool operations', () => {
      // Tool name needs to contain 'Write' (capital W) to be considered critical
      const criticalToolUse = new ToolUse('tool1', 'Write', { file_path: '/test.js' }, 'success');
      const responseWithCriticalTool = new AssistantResponse(
        'r1',
        new Date(),
        'I will write the file.',
        [],
        [criticalToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(responseWithCriticalTool.hasContentType('critical-tools')).toBe(true);
    });

    it('should detect high-cost responses', () => {
      // Need more than 5000 total tokens to be considered high-cost
      const highCostUsage = new TokenUsage(3000, 3000); // Total: 6000 > 5000 threshold
      const highCostResponse = new AssistantResponse(
        'r1',
        new Date(),
        'Expensive response',
        [],
        [],
        'claude-3.5-sonnet',
        highCostUsage
      );

      expect(highCostResponse.hasContentType('high-cost')).toBe(true);
    });
  });

  describe('摘要生成', () => {
    it('should generate summary with word count', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'This is a test response with multiple words',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const summary = response.getSummary();
      expect(summary).toContain('8词回答'); // "This is a test response with multiple words" = 8 words
      expect(summary).toContain('📝'); // explanation icon
    });

    it('should include code blocks in summary', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Here is the code:',
        [mockCodeBlock],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const summary = response.getSummary();
      expect(summary).toContain('1个代码块');
      expect(summary).toContain('💻'); // code-solution icon
    });

    it('should include tool usage in summary', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Let me check that.',
        [],
        [mockToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const summary = response.getSummary();
      expect(summary).toContain('1个工具调用');
      expect(summary).toContain('🔍'); // analysis icon
    });

    it('should show mixed type for complex responses', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Here is the analysis with code:',
        [mockCodeBlock],
        [mockToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const summary = response.getSummary();
      expect(summary).toContain('1个代码块');
      expect(summary).toContain('1个工具调用');
      expect(summary).toContain('🎭'); // mixed icon
    });
  });

  describe('语义上下文', () => {
    it('should create correct semantic context', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Here is my response with reasoning',
        [mockCodeBlock],
        [mockToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage,
        'This is my reasoning',
        0.8,
        2
      );

      const context = response.getSemanticContext();

      expect(context.isUserInitiated).toBe(false);
      expect(context.hasCodeContent).toBe(true);
      expect(context.isToolResult).toBe(false);
      expect(context.conversationTurn).toBe(2);
      expect(context.contentCategory).toBe(ContentCategory.ANSWER);
      expect(context.relatedElements).toEqual(['tool1']);
      expect(context.metadata.model).toBe('claude-3.5-sonnet');
      expect(context.metadata.confidence).toBe(0.8);
      expect(context.metadata.responseType).toBe('mixed');
      expect(context.metadata.hasReasoning).toBe(true);
    });
  });

  describe('复杂度评分', () => {
    it('should calculate complexity based on content length', () => {
      const shortResponse = new AssistantResponse(
        'r1',
        new Date(),
        'Short answer.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const longResponse = new AssistantResponse(
        'r2',
        new Date(),
        'This is a much longer response with many words that should receive a higher complexity score because of its length and detail level including extensive information about the topic at hand and comprehensive coverage of all relevant aspects. ' +
        'This response continues with additional detailed explanations and comprehensive analysis of the problem domain, providing thorough documentation and extensive examples to illustrate the concepts clearly. ' +
        'Furthermore, this response includes multiple perspectives and considerations that demonstrate deep understanding of the subject matter and addresses various edge cases and scenarios that might arise during implementation.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(longResponse.getComplexityScore()).toBeGreaterThan(shortResponse.getComplexityScore());
    });

    it('should add complexity for code blocks', () => {
      const responseWithCode = new AssistantResponse(
        'r1',
        new Date(),
        'Here is code:',
        [mockCodeBlock, mockCodeBlock],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const responseWithoutCode = new AssistantResponse(
        'r2',
        new Date(),
        'Here is text:',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(responseWithCode.getComplexityScore()).toBeGreaterThan(responseWithoutCode.getComplexityScore());
    });

    it('should add complexity for tool usage', () => {
      const responseWithTools = new AssistantResponse(
        'r1',
        new Date(),
        'Analysis:',
        [],
        [mockToolUse, mockToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const responseWithoutTools = new AssistantResponse(
        'r2',
        new Date(),
        'Analysis:',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(responseWithTools.getComplexityScore()).toBeGreaterThan(responseWithoutTools.getComplexityScore());
    });

    it('should add complexity for reasoning', () => {
      const responseWithReasoning = new AssistantResponse(
        'r1',
        new Date(),
        'Answer',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage,
        'Complex reasoning process'
      );

      const responseWithoutReasoning = new AssistantResponse(
        'r2',
        new Date(),
        'Answer',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(responseWithReasoning.getComplexityScore()).toBeGreaterThan(responseWithoutReasoning.getComplexityScore());
    });
  });

  describe('工具使用统计', () => {
    it('should return tool usage statistics', () => {
      // Tool names need to be capitalized to match getToolCategory logic
      const readTool = new ToolUse('tool1', 'Read', {}, 'content');
      const writeTool = new ToolUse('tool2', 'Write', {}, 'success');
      const grepTool = new ToolUse('tool3', 'Grep', {}, 'results');

      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Using multiple tools',
        [],
        [readTool, writeTool, grepTool],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const stats = response.getToolUsageStats();
      expect(stats['file-operation']).toBe(2); // Read + Write
      expect(stats['search']).toBe(1); // Grep
    });
  });

  describe('主要编程语言', () => {
    it('should identify primary language from code blocks', () => {
      const jsBlock1 = { language: 'javascript', content: 'code1', filename: 'file1.js' };
      const jsBlock2 = { language: 'javascript', content: 'code2', filename: 'file2.js' };
      const pyBlock = { language: 'python', content: 'code3', filename: 'file3.py' };

      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Multi-language response',
        [jsBlock1, jsBlock2, pyBlock],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.getPrimaryLanguage()).toBe('javascript');
    });

    it('should return null when no code blocks', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'No code here',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(response.getPrimaryLanguage()).toBeNull();
    });
  });

  describe('质量评分', () => {
    it('should calculate quality score based on multiple factors', () => {
      const highQualityResponse = new AssistantResponse(
        'r1',
        new Date(),
        'This is a comprehensive response with detailed explanation and helpful guidance for the user to understand the concept thoroughly.',
        [mockCodeBlock],
        [mockToolUse],
        'claude-3.5-sonnet',
        mockTokenUsage,
        'Thoughtful reasoning process',
        0.9
      );

      const lowQualityResponse = new AssistantResponse(
        'r2',
        new Date(),
        'Short.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage,
        undefined,
        0.2
      );

      expect(highQualityResponse.getQualityScore()).toBeGreaterThan(lowQualityResponse.getQualityScore());
      expect(highQualityResponse.getQualityScore()).toBeGreaterThanOrEqual(1);
      expect(highQualityResponse.getQualityScore()).toBeLessThanOrEqual(10);
    });
  });

  describe('阅读时间估算', () => {
    it('should estimate reading time based on content', () => {
      const shortResponse = new AssistantResponse(
        'r1',
        new Date(),
        'Quick answer.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const longResponseWithCode = new AssistantResponse(
        'r2',
        new Date(),
        'This is a very long and detailed response that contains extensive information and comprehensive explanations about the topic at hand, providing thorough coverage of all relevant aspects and multiple examples to illustrate the concepts clearly.',
        [{ language: 'javascript', content: 'function test() {\n  // code\n  return true;\n}', filename: 'test.js' }],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(longResponseWithCode.estimateReadingTime()).toBeGreaterThan(shortResponse.estimateReadingTime());
      expect(shortResponse.estimateReadingTime()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('完整性检查', () => {
    it('should detect complete responses', () => {
      const completeResponse = new AssistantResponse(
        'r1',
        new Date(),
        'This is a complete response with all necessary information.',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const incompleteResponse = new AssistantResponse(
        'r2',
        new Date(),
        'This response is incomplete...',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      expect(completeResponse.isComplete()).toBe(true);
      expect(incompleteResponse.isComplete()).toBe(false);
    });
  });

  describe('预览生成', () => {
    it('should generate preview with length limit', () => {
      const longContent = 'This is a very long response that should be truncated when generating a preview because it exceeds the maximum allowed length for preview display purposes.';
      const response = new AssistantResponse(
        'r1',
        new Date(),
        longContent,
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const preview = response.getPreview(50);
      expect(preview.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(preview).toContain('...');
    });

    it('should return full content if within limit', () => {
      const shortContent = 'Short response.';
      const response = new AssistantResponse(
        'r1',
        new Date(),
        shortContent,
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const preview = response.getPreview(50);
      expect(preview).toBe(shortContent);
      expect(preview).not.toContain('...');
    });
  });

  describe('访问者模式', () => {
    it('should accept visitor and return renderable content', () => {
      const response = new AssistantResponse(
        'r1',
        new Date(),
        'Test response',
        [],
        [],
        'claude-3.5-sonnet',
        mockTokenUsage
      );

      const result = response.accept(mockVisitor);

      expect(mockVisitor.visitAssistantResponse).toHaveBeenCalledWith(response);
      expect(result).toBeInstanceOf(RenderableContent);
      expect(result.content).toBe('rendered response');
    });
  });
});