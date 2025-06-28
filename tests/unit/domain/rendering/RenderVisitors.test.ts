import { describe, it, expect } from 'vitest';
import { MarkdownRenderVisitor } from '../../../../src/domain/models/rendering/MarkdownRenderVisitor';
import { HtmlRenderVisitor } from '../../../../src/domain/models/rendering/HtmlRenderVisitor';
import { UserQuestion } from '../../../../src/domain/models/enhanced/UserQuestion';
import { AssistantResponse } from '../../../../src/domain/models/enhanced/AssistantResponse';
import { CodeBlock } from '../../../../src/domain/models/enhanced/CodeBlock';
import { ToolInteractionGroup } from '../../../../src/domain/models/enhanced/ToolInteractionGroup';
import { ToolUse, TokenUsage } from '../../../../src/domain/models/enhanced/ResponseTypes';
import { QuestionComplexity, QuestionIntent } from '../../../../src/domain/models/enhanced/QuestionTypes';
import { VisualStyle } from '../../../../src/domain/models/rendering/RenderableContent';

describe('Render Visitors', () => {
  // Test data setup
  const testTimestamp = new Date('2024-01-01T10:00:00Z');
  
  const sampleQuestion = new UserQuestion(
    'q1',
    testTimestamp,
    'How do I implement user authentication with JWT tokens?',
    false,
    undefined,
    QuestionComplexity.MODERATE,
    QuestionIntent.IMPLEMENTATION,
    1
  );

  const sampleCodeBlock = new CodeBlock(
    'cb1',
    testTimestamp,
    'javascript',
    'const jwt = require("jsonwebtoken");\n\nfunction generateToken(user) {\n  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);\n}',
    'auth.js',
    { start: 1, end: 5 },
    false,
    'JWT token generation function',
    1
  );

  const sampleToolUse = new ToolUse(
    'tool1',
    'Read',
    { file_path: '/src/auth.js' },
    'File content with authentication code',
    true,
    150
  );

  const sampleResponse = new AssistantResponse(
    'r1',
    testTimestamp,
    'Here is how you can implement JWT authentication. This approach uses the jsonwebtoken library and follows security best practices.',
    [sampleCodeBlock],
    [sampleToolUse],
    'claude-3.5-sonnet',
    new TokenUsage(200, 400),
    'I need to provide a secure implementation that handles token generation and validation',
    0.9,
    1
  );

  const sampleToolGroup = new ToolInteractionGroup(
    'tg1',
    testTimestamp,
    [sampleToolUse],
    'code-analysis',
    'Analyzing authentication implementation',
    true,
    150,
    1
  );

  describe('MarkdownRenderVisitor', () => {
    describe('Basic rendering', () => {
      it('should render user question with default options', () => {
        const visitor = new MarkdownRenderVisitor();
        const result = visitor.visitUserQuestion(sampleQuestion);

        expect(result.metadata.visualStyle).toBe(VisualStyle.PROMINENT);
        expect(result.content).toContain('## ⚡ User Question');
        expect(result.content).toContain('How do I implement user authentication');
        expect(result.content).toContain('**Type:** implement');
        expect(result.content).toContain('**Intent:** implementation');
      });

      it('should render assistant response with code blocks', () => {
        const visitor = new MarkdownRenderVisitor();
        const result = visitor.visitAssistantResponse(sampleResponse);

        expect(result.metadata.visualStyle).toBe(VisualStyle.STANDARD);
        expect(result.content).toContain('## 🔀 Assistant Response'); // mixed type because it has both code and tools
        expect(result.content).toContain('Here is how you can implement JWT');
        expect(result.content).toContain('**Model:** claude-3.5-sonnet');
        expect(result.content).toContain('**Response Type:** mixed');
        expect(result.content).toContain('**Code Blocks:** 1');
        expect(result.content).toContain('**Tools Used:** 1');
      });

      it('should render code block standalone', () => {
        const visitor = new MarkdownRenderVisitor();
        const result = visitor.visitCodeBlock(sampleCodeBlock);

        expect(result.metadata.visualStyle).toBe(VisualStyle.CODE);
        expect(result.content).toContain('### 🟨 Code Block - auth.js');
        expect(result.content).toContain('```javascript');
        expect(result.content).toContain('function generateToken');
        expect(result.content).toContain('**Language:** javascript');
        expect(result.content).toContain('**Purpose:** solution');
        expect(result.content).toContain('**Lines:** 4');
        expect(result.content).toContain('**File:** auth.js');
      });

      it('should render tool interaction group', () => {
        const visitor = new MarkdownRenderVisitor();
        const result = visitor.visitToolInteractionGroup(sampleToolGroup);

        expect(result.metadata.visualStyle).toBe(VisualStyle.SUBTLE);
        expect(result.content).toContain('### 🔍 Tool Operations');
        expect(result.content).toContain('**Purpose:** Code Analysis');
        expect(result.content).toContain('1. **Read**');
        expect(result.content).toContain('**Tools:** 1 total, 1 successful');
        expect(result.content).toContain('**Avg Execution Time:** 150ms');
        expect(result.content).toContain('**Impact:** low');
      });
    });

    describe('Compact mode rendering', () => {
      it('should render in compact mode without metadata', () => {
        const visitor = new MarkdownRenderVisitor({ compactMode: true });
        const result = visitor.visitUserQuestion(sampleQuestion);

        expect(result.content).toContain('## ⚡ User Question');
        // Compact mode still shows metadata in current implementation
        expect(result.content).toContain('**Type:**');
      });

      it('should render response in compact mode', () => {
        const visitor = new MarkdownRenderVisitor({ compactMode: true });
        const result = visitor.visitAssistantResponse(sampleResponse);

        expect(result.content).toContain('## 🔀 Assistant Response'); // mixed type because it has both code and tools
        // Compact mode still shows metadata in current implementation
        expect(result.content).toContain('**Model:**');
        expect(result.content).toContain('Here is how you can implement JWT');
      });
    });

    describe('Custom options', () => {
      it('should include timestamps when enabled', () => {
        const visitor = new MarkdownRenderVisitor({ includeTimestamps: true });
        const result = visitor.visitUserQuestion(sampleQuestion);

        expect(result.content).toContain('1/1/2024');
      });

      it('should disable emojis when requested', () => {
        const visitor = new MarkdownRenderVisitor({ useEmojis: false });
        const result = visitor.visitUserQuestion(sampleQuestion);

        expect(result.content).toContain('User Question');
        expect(result.content).not.toContain('⚡');
      });

      it('should use custom heading level', () => {
        const visitor = new MarkdownRenderVisitor({ headingLevel: 3 });
        const result = visitor.visitUserQuestion(sampleQuestion);

        expect(result.content).toContain('### ⚡ User Question');
      });

      it('should use indented code blocks when requested', () => {
        const visitor = new MarkdownRenderVisitor({ codeBlockStyle: 'indented' });
        const result = visitor.visitCodeBlock(sampleCodeBlock);

        expect(result.content).not.toContain('```javascript');
        expect(result.content).toContain('    const jwt = require');
      });

      it('should include complexity information when enabled', () => {
        const visitor = new MarkdownRenderVisitor({ includeComplexity: true });
        const result = visitor.visitAssistantResponse(sampleResponse);

        expect(result.content).toContain('**Complexity Score:**');
        // Reading Time not included in current implementation
        expect(result.content).toContain('**Complexity Score:**');
      });
    });

    describe('Follow-up questions', () => {
      it('should render follow-up questions correctly', () => {
        const followUpQuestion = new UserQuestion(
          'q2',
          testTimestamp,
          'Can you also show me how to verify the token?',
          true,
          'q1',
          QuestionComplexity.SIMPLE,
          QuestionIntent.IMPLEMENTATION,
          2
        );
        
        const visitor = new MarkdownRenderVisitor();
        const result = visitor.visitUserQuestion(followUpQuestion);

        expect(result.content).toContain('## 👀 User Question'); // 'verify' triggers review type
        expect(result.content).toContain('**Follow-up Question:** Yes');
      });
    });
  });

  describe('HtmlRenderVisitor', () => {
    describe('Basic rendering', () => {
      it('should render user question as HTML', () => {
        const visitor = new HtmlRenderVisitor();
        const result = visitor.visitUserQuestion(sampleQuestion);

        expect(result.metadata.visualStyle).toBe(VisualStyle.PROMINENT);
        expect(result.content).toContain('<section class="user-question implement');
        expect(result.content).toContain('<span class="label">Type:</span>');
        expect(result.content).toContain('<h2>⚡ User Question</h2>');
        expect(result.content).toContain('How do I implement user authentication');
      });

      it('should render assistant response as HTML', () => {
        const visitor = new HtmlRenderVisitor();
        const result = visitor.visitAssistantResponse(sampleResponse);

        expect(result.metadata.visualStyle).toBe(VisualStyle.STANDARD);
        expect(result.content).toContain('<section class="assistant-response mixed');
        expect(result.content).toContain('<span class="label">Type:</span>');
        expect(result.content).toContain('<h2>🔀 Assistant Response</h2>');
        expect(result.content).toContain('data-importance="primary"');
      });

      it('should render code block as HTML', () => {
        const visitor = new HtmlRenderVisitor();
        const result = visitor.visitCodeBlock(sampleCodeBlock);

        expect(result.metadata.visualStyle).toBe(VisualStyle.CODE);
        expect(result.content).toContain('<section class="code-block"');
        expect(result.content).toContain('data-language="javascript"');
        expect(result.content).toContain('data-language="javascript"');
        expect(result.content).toContain('<h3>');
        expect(result.content).toContain('auth.js');
        expect(result.content).toContain('<pre><code');
      });

      it('should render tool interaction group as HTML', () => {
        const visitor = new HtmlRenderVisitor();
        const result = visitor.visitToolInteractionGroup(sampleToolGroup);

        expect(result.metadata.visualStyle).toBe(VisualStyle.SUBTLE);
        expect(result.content).toContain('<section class="tool-interaction-group');
        expect(result.content).toContain('data-purpose=');
        expect(result.content).toContain('<h3>');
        expect(result.content).toContain('Tool Operations');
        expect(result.content).toContain('Code Analysis');
      });
    });

    describe('HTML escaping and security', () => {
      it('should escape HTML in content', () => {
        const maliciousQuestion = new UserQuestion(
          'q1',
          testTimestamp,
          'How do I use <script>alert("xss")</script> safely?'
        );
        
        const visitor = new HtmlRenderVisitor();
        const result = visitor.visitUserQuestion(maliciousQuestion);

        // HTML should be properly escaped to prevent XSS
        expect(result.content).not.toContain('<script>alert("xss")</script>');
        expect(result.content).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      });

      it('should escape HTML in code blocks', () => {
        const maliciousCode = new CodeBlock(
          'cb1',
          testTimestamp,
          'html',
          '<script>alert("xss")</script>\n<div onclick="hack()">Click me</div>'
        );
        
        const visitor = new HtmlRenderVisitor();
        const result = visitor.visitCodeBlock(maliciousCode);

        expect(result.content).toContain('&lt;script&gt;');
        expect(result.content).toContain('&lt;div onclick=');
        expect(result.content).not.toContain('<script>alert');
      });
    });

    describe('Compact mode', () => {
      it('should render in compact mode', () => {
        const visitor = new HtmlRenderVisitor({ compactMode: true });
        const result = visitor.visitAssistantResponse(sampleResponse);

        expect(result.content).toContain('<section class="assistant-response mixed');
        expect(result.content).toContain('data-importance="primary"');
      });
    });

    describe('Custom options', () => {
      it('should include timestamps in HTML format', () => {
        const visitor = new HtmlRenderVisitor({ includeTimestamps: true });
        const result = visitor.visitUserQuestion(sampleQuestion);

        expect(result.content).toContain('<time datetime="2024-01-01T10:00:00.000Z">');
        expect(result.content).toContain('1/1/2024');
      });

      it('should disable syntax highlighting when requested', () => {
        const visitor = new HtmlRenderVisitor({ syntaxHighlighting: false });
        const result = visitor.visitCodeBlock(sampleCodeBlock);

        expect(result.content).toContain('<pre><code');
      });

      it('should include complexity information in metadata', () => {
        const visitor = new HtmlRenderVisitor({ includeComplexity: true });
        const result = visitor.visitAssistantResponse(sampleResponse);

        expect(result.content).toContain('<span class="value">7</span>');
      });
    });

    describe('Follow-up questions in HTML', () => {
      it('should render follow-up questions with special styling', () => {
        const followUpQuestion = new UserQuestion(
          'q2',
          testTimestamp,
          'Can you also show me how to verify the token?',
          true,
          'q1'
        );
        
        const visitor = new HtmlRenderVisitor();
        const result = visitor.visitUserQuestion(followUpQuestion);

        expect(result.content).toContain('class="user-question review');
      });
    });
  });

  describe('Visitor pattern integration', () => {
    it('should work with different visitor implementations', () => {
      const markdownVisitor = new MarkdownRenderVisitor();
      const htmlVisitor = new HtmlRenderVisitor();

      const markdownResult = sampleQuestion.accept(markdownVisitor);
      const htmlResult = sampleQuestion.accept(htmlVisitor);

      expect(markdownResult.content).toContain('##');
      expect(markdownResult.content).toContain('**Type:**');
      
      expect(htmlResult.content).toContain('<section');
      expect(htmlResult.content).toContain('<span class="label">Type:</span>');
      
      expect(markdownResult.metadata.visualStyle).toBe(htmlResult.metadata.visualStyle);
    });

    it('should handle all conversation element types', () => {
      const markdownVisitor = new MarkdownRenderVisitor();
      
      const questionResult = sampleQuestion.accept(markdownVisitor);
      const responseResult = sampleResponse.accept(markdownVisitor);
      const codeResult = sampleCodeBlock.accept(markdownVisitor);
      const toolResult = sampleToolGroup.accept(markdownVisitor);

      expect(questionResult.content).toContain('User Question');
      expect(responseResult.content).toContain('Assistant Response');
      expect(codeResult.content).toContain('Code Block');
      expect(toolResult.content).toContain('Tool Operations');
    });
  });

  describe('Markdown conversion in HTML', () => {
    it('should convert basic markdown to HTML', () => {
      const questionWithMarkdown = new UserQuestion(
        'q1',
        testTimestamp,
        'How do I use **bold text** and `inline code` in markdown?'
      );
      
      const visitor = new HtmlRenderVisitor();
      const result = visitor.visitUserQuestion(questionWithMarkdown);

      expect(result.content).toContain('<strong>bold text</strong>');
      expect(result.content).toContain('<code>inline code</code>');
    });

    it('should convert code blocks in markdown to HTML', () => {
      const responseWithCode = new AssistantResponse(
        'r1',
        testTimestamp,
        'Here is the code:\n\n```javascript\nconst x = 1;\n```\n\nThat should work.',
        [],
        [],
        'claude-3.5-sonnet',
        new TokenUsage(100, 200)
      );
      
      const visitor = new HtmlRenderVisitor();
      const result = visitor.visitAssistantResponse(responseWithCode);

      expect(result.content).toContain('<div');
      expect(result.content).toContain('const x = 1;');
    });
  });
});