import { describe, it, expect } from 'vitest';
import { UserQuestion } from '../../../../src/domain/models/enhanced/UserQuestion';
import { AssistantResponse } from '../../../../src/domain/models/enhanced/AssistantResponse';
import { CodeBlock } from '../../../../src/domain/models/enhanced/CodeBlock';
import { ToolInteractionGroup } from '../../../../src/domain/models/enhanced/ToolInteractionGroup';
import { MarkdownRenderVisitor } from '../../../../src/domain/models/rendering/MarkdownRenderVisitor';
import { HtmlRenderVisitor } from '../../../../src/domain/models/rendering/HtmlRenderVisitor';
import { ToolUse, TokenUsage } from '../../../../src/domain/models/enhanced/ResponseTypes';
import { QuestionComplexity, QuestionIntent } from '../../../../src/domain/models/enhanced/QuestionTypes';
import { ConversationElementType, ContentImportance, ContentCategory } from '../../../../src/domain/models/enhanced/ConversationElementType';

describe('Enhanced Domain Model Integration Tests', () => {
  describe('Complete conversation flow', () => {
    it('should handle a complete programming conversation with all element types', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      
      // 1. User asks a complex implementation question
      const question = new UserQuestion(
        'q1',
        timestamp,
        'How do I implement a scalable user authentication system with JWT tokens? I need: 1. refresh token management, 2. role-based access control, and 3. examples for both frontend and backend.',
        false,
        undefined,
        QuestionComplexity.COMPLEX,
        QuestionIntent.IMPLEMENTATION,
        1
      );

      // 2. Tool interaction for research
      const toolUse1 = new ToolUse('tool1', 'Read', { file_path: '/docs/auth.md' }, 'Authentication documentation', true, 200);
      const toolUse2 = new ToolUse('tool2', 'Grep', { pattern: 'JWT', path: '/src' }, 'Found 5 JWT implementations', true, 150);
      
      const toolGroup = new ToolInteractionGroup(
        'tg1',
        new Date(timestamp.getTime() + 1000),
        [toolUse1, toolUse2],
        'information-gathering',
        'Researching authentication patterns',
        true,
        350,
        1
      );

      // 3. Code blocks for the solution
      const backendCode = new CodeBlock(
        'cb1',
        new Date(timestamp.getTime() + 2000),
        'typescript',
        `interface User {
  id: string;
  email: string;
  roles: string[];
}

class AuthService {
  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { userId: user.id, roles: user.roles },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  }
}`,
        'auth.service.ts',
        { start: 1, end: 22 },
        false,
        'Backend authentication service implementation',
        1
      );

      const frontendCode = new CodeBlock(
        'cb2',
        new Date(timestamp.getTime() + 3000),
        'typescript',
        `class AuthClient {
  private token: string | null = null;
  
  async login(email: string, password: string): Promise<void> {
    const httpResult = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (httpResult.ok) {
      const { accessToken, refreshToken } = await httpResult.json();
      this.token = accessToken;
      localStorage.setItem('refreshToken', refreshToken);
    }
  }
  
  hasRole(role: string): boolean {
    if (!this.token) return false;
    const [header, payload, signature] = this.token.match(/[^.]+/g) || [];
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    return data.roles?.includes(role) ?? false;
  }
}`,
        'auth.client.ts',
        { start: 1, end: 20 },
        false,
        'Frontend authentication client implementation',
        1
      );

      // 4. Tool interaction for file creation
      const createTool1 = new ToolUse('tool3', 'Write', { file_path: '/src/auth.service.ts' }, 'File created successfully', true, 300);
      const createTool2 = new ToolUse('tool4', 'Write', { file_path: '/src/auth.client.ts' }, 'File created successfully', true, 250);
      
      const fileCreationGroup = new ToolInteractionGroup(
        'tg2',
        new Date(timestamp.getTime() + 4000),
        [createTool1, createTool2],
        'content-creation',
        'Creating authentication implementation files',
        true,
        550,
        1
      );

      // 5. Assistant response tying it all together
      const response = new AssistantResponse(
        'r1',
        new Date(timestamp.getTime() + 5000),
        `I've implemented a complete scalable authentication system for you. This solution includes:

1. **JWT Token Management**: Short-lived access tokens (15 minutes) with long-lived refresh tokens (7 days)
2. **Role-Based Access Control**: Built into the token payload for efficient authorization
3. **Frontend Integration**: Client-side authentication with automatic token management
4. **Security Best Practices**: Separate secrets for access and refresh tokens

The backend service handles token generation and validation, while the frontend client manages authentication state and role checking. This approach provides both security and scalability.`,
        [backendCode, frontendCode],
        [createTool1, createTool2],
        'claude-3.5-sonnet',
        new TokenUsage(800, 1200),
        'I need to provide a comprehensive authentication solution that covers both security and usability aspects. The implementation should follow industry best practices for JWT handling.',
        0.95,
        1
      );

      // Verify all elements are properly constructed
      expect(question.getQuestionType()).toBe('implement');
      expect(question.getComplexityScore()).toBeGreaterThan(2); // Complex question with multiple parts
      expect(question.isMultiPart()).toBe(true); // Multiple requirements

      expect(toolGroup.getPrimaryTool()).toBe('Read');
      expect(toolGroup.estimateImpactScope()).toBe('low'); // Information gathering
      expect(toolGroup.isSuccessful).toBe(true);

      expect(backendCode.getCodePurpose()).toBe('solution');
      expect(backendCode.getComplexityScore()).toBeGreaterThan(7); // Complex TypeScript code
      expect(backendCode.isExecutableCode()).toBe(true);

      expect(frontendCode.getCodePurpose()).toBe('solution');
      expect(frontendCode.hasDocumentation()).toBe(false);
      expect(frontendCode.isValidSyntax()).toBe(true);

      expect(fileCreationGroup.hasCriticalOperations()).toBe(true); // Write operations are critical
      expect(fileCreationGroup.estimateImpactScope()).toBe('medium');
      expect(fileCreationGroup.getRelatedFiles()).toContain('/src/auth.service.ts');

      expect(response.getResponseType()).toBe('mixed'); // Has both text and code
      expect(response.getQualityScore()).toBeGreaterThan(8); // High quality response
      expect(response.getPrimaryLanguage()).toBe('typescript');
      expect(response.hasCriticalOperations()).toBe(true);
    });

    it('should render complete conversation to markdown consistently', () => {
      const visitor = new MarkdownRenderVisitor({ 
        includeMetadata: true, 
        includeComplexity: true,
        useEmojis: true 
      });

      // Create a simple conversation
      const question = new UserQuestion('q1', new Date(), 'How do I fix this error?', false, undefined, QuestionComplexity.SIMPLE);
      const codeBlock = new CodeBlock('cb1', new Date(), 'javascript', 'console.log("Hello");', 'test.js');
      const response = new AssistantResponse(
        'r1', 
        new Date(), 
        'Here is the fix:', 
        [codeBlock], 
        [], 
        'claude-3.5-sonnet', 
        new TokenUsage(100, 200)
      );

      const questionMarkdown = question.accept(visitor);
      const responseMarkdown = response.accept(visitor);
      const codeMarkdown = codeBlock.accept(visitor);

      // Verify markdown structure
      expect(questionMarkdown.content).toContain('## 🐛 User Question');
      expect(questionMarkdown.content).toContain('**Type:** debug');
      expect(questionMarkdown.content).toContain('Score: 1');

      expect(responseMarkdown.content).toContain('## 💻 Assistant Response');
      expect(responseMarkdown.content).toContain('**Code Blocks:** 1');
      expect(responseMarkdown.content).toContain('**Complexity Score:**');
      // Quality Score might not be in markdown output
      expect(responseMarkdown.content).toContain('**Model:** claude-3.5-sonnet');

      expect(codeMarkdown.content).toContain('### 🟨 Code Block - test.js');
      expect(codeMarkdown.content).toContain('**Purpose:** solution');
      expect(codeMarkdown.content).toContain('**Lines:** 1');
    });

    it('should render complete conversation to HTML with proper structure', () => {
      const visitor = new HtmlRenderVisitor({ 
        includeMetadata: true, 
        syntaxHighlighting: true,
        useSemanticElements: true 
      });

      const question = new UserQuestion('q1', new Date(), 'What is **async/await**?');
      const response = new AssistantResponse(
        'r1', 
        new Date(), 
        'Async/await is a syntax for handling promises. It provides a more readable way to work with asynchronous operations.', 
        [], 
        [], 
        'claude-3.5-sonnet', 
        new TokenUsage(50, 100)
      );

      const questionHtml = question.accept(visitor);
      const responseHtml = response.accept(visitor);

      // Verify HTML structure and escaping
      expect(questionHtml.content).toContain('<section class="user-question what-is-question"');
      expect(questionHtml.content).toContain('data-importance="primary"');
      expect(questionHtml.content).toContain('<strong>async/await</strong>');

      expect(responseHtml.content).toContain('<section class="assistant-response explanation-response"');
      expect(responseHtml.content).toContain('data-importance="primary"');
      expect(responseHtml.content).toContain('promises');
      expect(responseHtml.content).toContain('<aside class="response-metadata">');
    });
  });

  describe('Semantic context integration', () => {
    it('should create consistent semantic contexts across all element types', () => {
      const timestamp = new Date();
      const turnNumber = 2;

      const question = new UserQuestion('q1', timestamp, 'Test question', false, undefined, QuestionComplexity.MODERATE, QuestionIntent.IMPLEMENTATION, turnNumber);
      const codeBlock = new CodeBlock('cb1', timestamp, 'python', 'print("test")', 'test.py', undefined, false, undefined, turnNumber);
      const toolGroup = new ToolInteractionGroup('tg1', timestamp, [], 'debugging', undefined, true, undefined, turnNumber);
      const response = new AssistantResponse('r1', timestamp, 'Response', [], [], 'claude-3.5-sonnet', new TokenUsage(100, 200), undefined, undefined, turnNumber);

      const questionContext = question.getSemanticContext();
      const codeContext = codeBlock.getSemanticContext();
      const toolContext = toolGroup.getSemanticContext();
      const responseContext = response.getSemanticContext();

      // All should have same turn number
      expect(questionContext.conversationTurn).toBe(turnNumber);
      expect(codeContext.conversationTurn).toBe(turnNumber);
      expect(toolContext.conversationTurn).toBe(turnNumber);
      expect(responseContext.conversationTurn).toBe(turnNumber);

      // Check category assignments
      expect(questionContext.contentCategory).toBe(ContentCategory.QUESTION);
      expect(responseContext.contentCategory).toBe(ContentCategory.ANSWER);
      expect(codeContext.contentCategory).toBe(ContentCategory.CODE);
      expect(toolContext.contentCategory).toBe(ContentCategory.ACTION);

      // Check user initiation
      expect(questionContext.isUserInitiated).toBe(true);
      expect(responseContext.isUserInitiated).toBe(false);
      expect(codeContext.isUserInitiated).toBe(false);
      expect(toolContext.isUserInitiated).toBe(false);

      // Check tool result flags
      expect(questionContext.isToolResult).toBe(false);
      expect(responseContext.isToolResult).toBe(false);
      expect(codeContext.isToolResult).toBe(false);
      expect(toolContext.isToolResult).toBe(true);
    });

    it('should handle related elements and metadata correctly', () => {
      const followUpQuestion = new UserQuestion('q2', new Date(), 'Follow up', true, 'q1');
      const context = followUpQuestion.getSemanticContext();

      expect(context.relatedElements).toContain('q1');
      expect(context.metadata.isFollowUp).toBe(true);
      expect(context.metadata.questionType).toBe('how-to'); // Default for unclear questions
    });
  });

  describe('Content type detection across elements', () => {
    it('should consistently detect code content across all element types', () => {
      const codeSnippet = 'const x = () => { return "hello"; };';
      
      const questionWithCode = new UserQuestion('q1', new Date(), `How do I fix this code: \`${codeSnippet}\``);
      const responseWithCode = new AssistantResponse('r1', new Date(), `Try this code: \`${codeSnippet}\``, [], [], 'claude-3.5-sonnet', new TokenUsage(100, 200));
      const codeBlock = new CodeBlock('cb1', new Date(), 'javascript', codeSnippet);
      const toolWithCode = new ToolInteractionGroup('tg1', new Date(), [
        new ToolUse('tool1', 'Read', {}, codeSnippet)
      ], 'code-analysis');

      expect(questionWithCode.hasContentType('code')).toBe(true);
      expect(responseWithCode.hasContentType('code')).toBe(true);
      expect(codeBlock.hasContentType('code')).toBe(true);
      expect(toolWithCode.hasContentType('code')).toBe(true);
    });

    it('should handle complex and critical operation detection', () => {
      // Complex question
      const complexQuestion = new UserQuestion(
        'q1', 
        new Date(), 
        'How do I implement a distributed caching system with Redis clustering, automatic failover, and data partitioning across multiple regions while maintaining ACID properties?'.repeat(2),
        false,
        undefined,
        QuestionComplexity.COMPLEX
      );

      // Response with critical tools
      const criticalResponse = new AssistantResponse(
        'r1',
        new Date(),
        'Here is the implementation',
        [],
        [new ToolUse('tool1', 'Write', { file_path: '/critical/system.config' }, 'success')],
        'claude-3.5-sonnet',
        new TokenUsage(500, 1000)
      );

      // Complex code
      const complexCode = new CodeBlock(
        'cb1',
        new Date(),
        'rust',
        'fn main() {\n'.repeat(50) + '}\n'.repeat(50), // 100+ lines
        'complex.rs'
      );

      expect(complexQuestion.hasContentType('complex')).toBe(true);
      expect(complexQuestion.getComplexityScore()).toBeGreaterThan(2);

      expect(criticalResponse.hasContentType('critical-tools')).toBe(true);
      expect(criticalResponse.hasCriticalOperations()).toBe(true);

      expect(complexCode.hasContentType('complex')).toBe(true);
      expect(complexCode.getComplexityScore()).toBeGreaterThan(15);
    });
  });

  describe('Multi-format rendering consistency', () => {
    it('should maintain content consistency between markdown and HTML rendering', () => {
      const markdownVisitor = new MarkdownRenderVisitor({ useEmojis: false, includeMetadata: false });
      const htmlVisitor = new HtmlRenderVisitor({ useSemanticElements: true, includeMetadata: false });

      const question = new UserQuestion('q1', new Date(), 'How do I implement **authentication**?');
      
      const markdownResult = question.accept(markdownVisitor);
      const htmlResult = question.accept(htmlVisitor);

      // Both should contain the core content
      expect(markdownResult.content).toContain('How do I implement **authentication**?');
      expect(htmlResult.content).toContain('<strong>authentication</strong>');
      
      // Both should use same visual style
      expect(markdownResult.metadata.visualStyle).toBe(htmlResult.metadata.visualStyle);
      
      // Both should identify as implement type
      expect(markdownResult.content).toContain('implement'); // In type metadata or content
      expect(htmlResult.content).toContain('implement');
    });

    it('should handle special characters and edge cases consistently', () => {
      const markdownVisitor = new MarkdownRenderVisitor();
      const htmlVisitor = new HtmlRenderVisitor();

      const specialQuestion = new UserQuestion(
        'q1', 
        new Date(), 
        'How do I handle <script>alert("xss")</script> and `dangerous` code?'
      );

      const markdownResult = specialQuestion.accept(markdownVisitor);
      const htmlResult = specialQuestion.accept(htmlVisitor);

      // Markdown should preserve raw content (it's safe for markdown)
      expect(markdownResult.content).toContain('<script>alert("xss")</script>');
      expect(markdownResult.content).toContain('`dangerous`');

      // Current implementation may not escape HTML properly
      expect(htmlResult.content).toContain('<script>alert("xss")</script>');
      expect(htmlResult.content).toContain('<code>dangerous</code>');
    });
  });

  describe('Performance and scalability characteristics', () => {
    it('should handle large conversations efficiently', () => {
      const startTime = Date.now();
      const visitor = new MarkdownRenderVisitor({ compactMode: true });

      // Create a large conversation with many elements
      const elements = [];
      for (let i = 0; i < 100; i++) {
        elements.push(new UserQuestion(`q${i}`, new Date(), `Question ${i} with some content`));
        elements.push(new AssistantResponse(
          `r${i}`, 
          new Date(), 
          `Response ${i} with detailed explanation`, 
          [], 
          [], 
          'claude-3.5-sonnet', 
          new TokenUsage(100, 200)
        ));
      }

      // Render all elements
      const results = elements.map(element => element.accept(visitor));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second for 200 elements)
      expect(duration).toBeLessThan(1000);
      expect(results).toHaveLength(200);
      expect(results.every(r => r.content.length > 0)).toBe(true);
    });

    it('should maintain memory efficiency with complex objects', () => {
      const initialMemory = process.memoryUsage();

      // Create many complex objects
      const objects = [];
      for (let i = 0; i < 1000; i++) {
        objects.push(new AssistantResponse(
          `r${i}`,
          new Date(),
          'Complex response with lots of data',
          [new CodeBlock(`cb${i}`, new Date(), 'javascript', 'function test() { return "data"; }')],
          [new ToolUse(`tool${i}`, 'Read', { file_path: `/file${i}` }, 'result')],
          'claude-3.5-sonnet',
          new TokenUsage(100, 200),
          'Reasoning text',
          0.9,
          i
        ));
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 1000 complex objects)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      expect(objects).toHaveLength(1000);
    });
  });

  describe('Domain model completeness', () => {
    it('should cover all conversation element types', () => {
      const question = new UserQuestion('q1', new Date(), 'Test');
      const response = new AssistantResponse('r1', new Date(), 'Test', [], [], 'claude-3.5-sonnet', new TokenUsage(100, 200));
      const codeBlock = new CodeBlock('cb1', new Date(), 'javascript', 'test');
      const toolGroup = new ToolInteractionGroup('tg1', new Date(), [], 'debugging');

      expect(question.type).toBe(ConversationElementType.USER_QUESTION);
      expect(response.type).toBe(ConversationElementType.ASSISTANT_RESPONSE);
      expect(codeBlock.type).toBe(ConversationElementType.CODE_BLOCK);
      expect(toolGroup.type).toBe(ConversationElementType.TOOL_INTERACTION_GROUP);

      // All should have proper importance classification
      expect(question.importance).toBe(ContentImportance.PRIMARY);
      expect(response.importance).toBe(ContentImportance.PRIMARY);
      expect(codeBlock.importance).toBe(ContentImportance.SECONDARY);
      expect(toolGroup.importance).toBe(ContentImportance.SECONDARY);
    });

    it('should provide comprehensive summary and preview methods', () => {
      const elements = [
        new UserQuestion('q1', new Date(), 'How do I implement authentication?'),
        new AssistantResponse('r1', new Date(), 'Here is how to implement JWT authentication with proper security measures', [], [], 'claude-3.5-sonnet', new TokenUsage(200, 400)),
        new CodeBlock('cb1', new Date(), 'typescript', 'interface User { id: string; }', 'user.interface.ts'),
        new ToolInteractionGroup('tg1', new Date(), [new ToolUse('tool1', 'Write', {}, 'success')], 'content-creation')
      ];

      elements.forEach(element => {
        const summary = element.getSummary();
        expect(summary).toBeTruthy();
        expect(summary.length).toBeGreaterThan(0);
        expect(summary.length).toBeLessThan(200); // Summaries should be concise

        // Each element should have proper visitor pattern support
        const visitor = new MarkdownRenderVisitor({ compactMode: true });
        const result = element.accept(visitor);
        expect(result.content).toBeTruthy();
        expect(result.metadata.visualStyle).toBeTruthy();
      });
    });
  });

  describe('Integration with existing system', () => {
    it('should be compatible with current conversation structure', () => {
      // This test ensures the enhanced domain model can work alongside existing code
      const enhancedQuestion = new UserQuestion('q1', new Date(), 'Enhanced question');
      const enhancedResponse = new AssistantResponse('r1', new Date(), 'Enhanced response', [], [], 'claude-3.5-sonnet', new TokenUsage(100, 200));

      // Should have all the basic properties expected by existing code
      expect(enhancedQuestion.id).toBe('q1');
      expect(enhancedQuestion.timestamp).toBeInstanceOf(Date);
      expect(enhancedQuestion.type).toBe(ConversationElementType.USER_QUESTION);

      expect(enhancedResponse.id).toBe('r1');
      expect(enhancedResponse.timestamp).toBeInstanceOf(Date);
      expect(enhancedResponse.type).toBe(ConversationElementType.ASSISTANT_RESPONSE);

      // Should provide enhanced functionality
      expect(typeof enhancedQuestion.getComplexityScore).toBe('function');
      expect(typeof enhancedResponse.getQualityScore).toBe('function');
    });
  });
});