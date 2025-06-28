import { describe, it, expect, vi } from 'vitest';
import { CodeBlock } from '../../../../src/domain/models/enhanced/CodeBlock';
import { ConversationElementType, ContentImportance, ContentCategory } from '../../../../src/domain/models/enhanced/ConversationElementType';
import { ConversationRenderVisitor } from '../../../../src/domain/models/rendering/ConversationRenderVisitor';
import { RenderableContent, VisualStyle } from '../../../../src/domain/models/rendering/RenderableContent';

describe('CodeBlock', () => {
  const mockVisitor: ConversationRenderVisitor = {
    visitUserQuestion: vi.fn(),
    visitAssistantResponse: vi.fn(),
    visitToolInteractionGroup: vi.fn(),
    visitCodeBlock: vi.fn().mockReturnValue(RenderableContent.create('rendered code', VisualStyle.CODE))
  };

  const simpleJavaScriptCode = `function greet(name) {
  return \`Hello, \${name}!\`;
}`;

  const complexTypeScriptCode = `interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  constructor(private apiClient: ApiClient) {}

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    try {
      const response = await this.apiClient.post('/users', userData);
      const newUser = { ...userData, id: response.id };
      this.users.push(newUser);
      return newUser;
    } catch (error) {
      throw new Error(\`Failed to create user: \${error.message}\`);
    }
  }

  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }
}`;

  const testCode = `describe('Calculator', () => {
  it('should add two numbers correctly', () => {
    const calculator = new Calculator();
    expect(calculator.add(2, 3)).toBe(5);
  });

  it('should handle edge cases', () => {
    const calculator = new Calculator();
    expect(calculator.add(0, 0)).toBe(0);
    expect(calculator.add(-1, 1)).toBe(0);
  });
});`;

  const configCode = `{
  "name": "my-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^4.9.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest"
  }
}`;

  describe('构造函数和基础属性', () => {
    it('should initialize with required properties', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const codeBlock = new CodeBlock(
        'cb1',
        timestamp,
        'javascript',
        simpleJavaScriptCode,
        'greet.js',
        { start: 1, end: 3 },
        false,
        'A simple greeting function',
        1
      );

      expect(codeBlock.id).toBe('cb1');
      expect(codeBlock.timestamp).toBe(timestamp);
      expect(codeBlock.language).toBe('javascript');
      expect(codeBlock.content).toBe(simpleJavaScriptCode);
      expect(codeBlock.filename).toBe('greet.js');
      expect(codeBlock.lineNumbers).toEqual({ start: 1, end: 3 });
      expect(codeBlock.isPartial).toBe(false);
      expect(codeBlock.context).toBe('A simple greeting function');
      expect(codeBlock.turnNumber).toBe(1);
      expect(codeBlock.type).toBe(ConversationElementType.CODE_BLOCK);
      expect(codeBlock.importance).toBe(ContentImportance.SECONDARY);
    });

    it('should use default values for optional parameters', () => {
      const codeBlock = new CodeBlock(
        'cb1',
        new Date(),
        'python',
        'print("Hello World")'
      );

      expect(codeBlock.filename).toBeUndefined();
      expect(codeBlock.lineNumbers).toBeUndefined();
      expect(codeBlock.isPartial).toBe(false);
      expect(codeBlock.context).toBeUndefined();
      expect(codeBlock.turnNumber).toBe(0);
    });

    it('should handle partial code blocks', () => {
      const codeBlock = new CodeBlock(
        'cb1',
        new Date(),
        'javascript',
        'function incomplete() {\n  // TODO: implement\n}',
        undefined,
        undefined,
        true,
        'Partial implementation'
      );

      expect(codeBlock.isPartial).toBe(true);
      expect(codeBlock.context).toBe('Partial implementation');
    });
  });

  describe('代码用途识别', () => {
    it('should identify test code', () => {
      const testCodeBlock = new CodeBlock('test', new Date(), 'javascript', testCode, 'calculator.test.js');
      expect(testCodeBlock.getCodePurpose()).toBe('test');
    });

    it('should identify configuration code by language', () => {
      const configCodeBlock = new CodeBlock('config', new Date(), 'json', configCode, 'package.json');
      expect(configCodeBlock.getCodePurpose()).toBe('config');
    });

    it('should identify fix code by context', () => {
      const fixCodeBlock = new CodeBlock(
        'fix', 
        new Date(), 
        'javascript', 
        'const fixed = value || defaultValue;',
        undefined,
        undefined,
        false,
        'Fix for the undefined value bug'
      );
      expect(fixCodeBlock.getCodePurpose()).toBe('fix');
    });

    it('should identify refactor code by context', () => {
      const refactorCodeBlock = new CodeBlock(
        'refactor',
        new Date(),
        'javascript',
        complexTypeScriptCode,
        undefined,
        undefined,
        false,
        'Refactored user service for better performance'
      );
      expect(refactorCodeBlock.getCodePurpose()).toBe('refactor');
    });

    it('should identify example code', () => {
      const exampleCodeBlock = new CodeBlock(
        'example',
        new Date(),
        'javascript',
        simpleJavaScriptCode,
        undefined,
        undefined,
        false,
        'Example of a greeting function'
      );
      expect(exampleCodeBlock.getCodePurpose()).toBe('example');
    });

    it('should default to solution for unclassified code', () => {
      const solutionCodeBlock = new CodeBlock('solution', new Date(), 'javascript', simpleJavaScriptCode);
      expect(solutionCodeBlock.getCodePurpose()).toBe('solution');
    });
  });

  describe('内容类型检查', () => {
    it('should always identify as code content', () => {
      const codeBlock = new CodeBlock('test', new Date(), 'javascript', simpleJavaScriptCode);
      expect(codeBlock.hasContentType('code')).toBe(true);
    });

    it('should detect executable code', () => {
      const jsCodeBlock = new CodeBlock('js', new Date(), 'javascript', simpleJavaScriptCode);
      const htmlCodeBlock = new CodeBlock('html', new Date(), 'html', '<div>Hello</div>');
      
      expect(jsCodeBlock.hasContentType('executable')).toBe(true);
      expect(htmlCodeBlock.hasContentType('executable')).toBe(false);
    });

    it('should detect configuration code', () => {
      const configCodeBlock = new CodeBlock('config', new Date(), 'json', configCode, 'package.json');
      const regularCodeBlock = new CodeBlock('regular', new Date(), 'javascript', simpleJavaScriptCode);
      
      expect(configCodeBlock.hasContentType('configuration')).toBe(true);
      expect(regularCodeBlock.hasContentType('configuration')).toBe(false);
    });

    it('should detect test code', () => {
      const testCodeBlock = new CodeBlock('test', new Date(), 'javascript', testCode, 'test.js');
      const regularCodeBlock = new CodeBlock('regular', new Date(), 'javascript', simpleJavaScriptCode);
      
      expect(testCodeBlock.hasContentType('test')).toBe(true);
      expect(regularCodeBlock.hasContentType('test')).toBe(false);
    });

    it('should detect documentation', () => {
      const documentedCode = `/**
 * Calculates the sum of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum
 */
function add(a, b) {
  return a + b;
}`;
      const documentedCodeBlock = new CodeBlock('doc', new Date(), 'javascript', documentedCode);
      const undocumentedCodeBlock = new CodeBlock('undoc', new Date(), 'javascript', simpleJavaScriptCode);
      
      expect(documentedCodeBlock.hasContentType('documentation')).toBe(true);
      expect(undocumentedCodeBlock.hasContentType('documentation')).toBe(false);
    });

    it('should detect partial code', () => {
      const partialCodeBlock = new CodeBlock('partial', new Date(), 'javascript', 'code...', undefined, undefined, true);
      const completeCodeBlock = new CodeBlock('complete', new Date(), 'javascript', simpleJavaScriptCode);
      
      expect(partialCodeBlock.hasContentType('partial')).toBe(true);
      expect(completeCodeBlock.hasContentType('partial')).toBe(false);
    });

    it('should detect complete code', () => {
      const completeCodeBlock = new CodeBlock('complete', new Date(), 'javascript', simpleJavaScriptCode);
      const incompleteCode = 'function test() {\n  // TODO: implement\n}';
      const incompleteCodeBlock = new CodeBlock('incomplete', new Date(), 'javascript', incompleteCode);
      
      expect(completeCodeBlock.hasContentType('complete')).toBe(true);
      expect(incompleteCodeBlock.hasContentType('complete')).toBe(false);
    });

    it('should detect complex code', () => {
      const complexCodeBlock = new CodeBlock('complex', new Date(), 'typescript', complexTypeScriptCode);
      const simpleCodeBlock = new CodeBlock('simple', new Date(), 'javascript', 'const x = 1;');
      
      expect(complexCodeBlock.hasContentType('complex')).toBe(true);
      expect(simpleCodeBlock.hasContentType('complex')).toBe(false);
    });
  });

  describe('摘要生成', () => {
    it('should generate summary with language and line count', () => {
      const codeBlock = new CodeBlock('test', new Date(), 'javascript', simpleJavaScriptCode);
      const summary = codeBlock.getSummary();
      
      expect(summary).toContain('javascript代码');
      expect(summary).toContain('行');
      expect(summary).toContain('💻'); // solution icon
    });

    it('should include filename in summary', () => {
      const codeBlock = new CodeBlock('test', new Date(), 'javascript', simpleJavaScriptCode, 'greet.js');
      const summary = codeBlock.getSummary();
      
      expect(summary).toContain('文件: greet.js');
    });

    it('should indicate partial code in summary', () => {
      const codeBlock = new CodeBlock('test', new Date(), 'javascript', 'partial code...', undefined, undefined, true);
      const summary = codeBlock.getSummary();
      
      expect(summary).toContain('(部分)');
    });

    it('should include appropriate icons for different purposes', () => {
      const testCodeBlock = new CodeBlock('test', new Date(), 'javascript', testCode, 'test.js');
      const configCodeBlock = new CodeBlock('config', new Date(), 'json', configCode, 'config.json');
      
      expect(testCodeBlock.getSummary()).toContain('🧪'); // test icon
      expect(configCodeBlock.getSummary()).toContain('⚙️'); // config icon
    });
  });

  describe('语义上下文', () => {
    it('should create correct semantic context', () => {
      const codeBlock = new CodeBlock(
        'test',
        new Date(),
        'typescript',
        complexTypeScriptCode,
        'user.service.ts',
        { start: 1, end: 30 },
        false,
        'Complete user service implementation',
        2
      );

      const context = codeBlock.getSemanticContext();

      expect(context.isUserInitiated).toBe(false);
      expect(context.hasCodeContent).toBe(true);
      expect(context.isToolResult).toBe(false);
      expect(context.conversationTurn).toBe(2);
      expect(context.contentCategory).toBe(ContentCategory.CODE);
      expect(context.relatedElements).toEqual(['user.service.ts']);
      expect(context.metadata.language).toBe('typescript');
      expect(context.metadata.purpose).toBe('solution');
      expect(context.metadata.isPartial).toBe(false);
      expect(context.metadata.hasDocumentation).toBe(false);
    });

    it('should handle code blocks without filename', () => {
      const codeBlock = new CodeBlock('test', new Date(), 'javascript', simpleJavaScriptCode);
      const context = codeBlock.getSemanticContext();

      expect(context.relatedElements).toEqual([]);
    });
  });

  describe('复杂度评分', () => {
    it('should calculate complexity based on multiple factors', () => {
      const simpleCodeBlock = new CodeBlock('simple', new Date(), 'javascript', 'const x = 1;');
      const complexCodeBlock = new CodeBlock('complex', new Date(), 'typescript', complexTypeScriptCode);

      expect(complexCodeBlock.getComplexityScore()).toBeGreaterThan(simpleCodeBlock.getComplexityScore());
    });

    it('should add complexity for line count', () => {
      const shortCode = 'const x = 1;';
      const longCode = Array(100).fill('console.log("line");').join('\n');
      
      const shortCodeBlock = new CodeBlock('short', new Date(), 'javascript', shortCode);
      const longCodeBlock = new CodeBlock('long', new Date(), 'javascript', longCode);

      expect(longCodeBlock.getComplexityScore()).toBeGreaterThan(shortCodeBlock.getComplexityScore());
    });

    it('should add complexity for language difficulty', () => {
      const jsCodeBlock = new CodeBlock('js', new Date(), 'javascript', 'const x = 1;');
      const rustCodeBlock = new CodeBlock('rust', new Date(), 'rust', 'let x: i32 = 1;');

      expect(rustCodeBlock.getComplexityScore()).toBeGreaterThan(jsCodeBlock.getComplexityScore());
    });

    it('should add complexity for partial code', () => {
      const completeCodeBlock = new CodeBlock('complete', new Date(), 'javascript', simpleJavaScriptCode);
      const partialCodeBlock = new CodeBlock('partial', new Date(), 'javascript', simpleJavaScriptCode, undefined, undefined, true);

      expect(partialCodeBlock.getComplexityScore()).toBeGreaterThan(completeCodeBlock.getComplexityScore());
    });

    it('should add complexity for control structures', () => {
      const simpleCode = 'const x = 1;';
      const complexCode = `
        if (condition) {
          for (let i = 0; i < 10; i++) {
            try {
              doSomething();
            } catch (error) {
              handleError(error);
            }
          }
        }
      `;
      
      const simpleCodeBlock = new CodeBlock('simple', new Date(), 'javascript', simpleCode);
      const complexCodeBlock = new CodeBlock('complex', new Date(), 'javascript', complexCode);

      expect(complexCodeBlock.getComplexityScore()).toBeGreaterThan(simpleCodeBlock.getComplexityScore());
    });
  });

  describe('代码分析方法', () => {
    it('should count lines correctly', () => {
      const codeBlock = new CodeBlock('test', new Date(), 'javascript', simpleJavaScriptCode);
      expect(codeBlock.getLineCount()).toBe(3); // Non-empty lines
    });

    it('should detect executable languages', () => {
      const executableCodeBlock = new CodeBlock('exec', new Date(), 'python', 'print("hello")');
      const nonExecutableCodeBlock = new CodeBlock('markup', new Date(), 'html', '<div>hello</div>');

      expect(executableCodeBlock.isExecutableCode()).toBe(true);
      expect(nonExecutableCodeBlock.isExecutableCode()).toBe(false);
    });

    it('should validate syntax (basic check)', () => {
      const validCode = '{ "key": "value" }';
      const invalidCode = '{ "key": "value"';
      
      const validCodeBlock = new CodeBlock('valid', new Date(), 'json', validCode);
      const invalidCodeBlock = new CodeBlock('invalid', new Date(), 'json', invalidCode);

      expect(validCodeBlock.isValidSyntax()).toBe(true);
      expect(invalidCodeBlock.isValidSyntax()).toBe(false);
    });

    it('should detect complete vs incomplete code', () => {
      const completeCode = 'function complete() { return true; }';
      const incompleteCode = 'function incomplete() { // TODO: implement }';
      
      const completeCodeBlock = new CodeBlock('complete', new Date(), 'javascript', completeCode);
      const incompleteCodeBlock = new CodeBlock('incomplete', new Date(), 'javascript', incompleteCode);

      expect(completeCodeBlock.isCompleteCode()).toBe(true);
      expect(incompleteCodeBlock.isCompleteCode()).toBe(false);
    });
  });

  describe('实用方法', () => {
    it('should generate code preview', () => {
      const longCode = Array(10).fill('console.log("line");').join('\n');
      const codeBlock = new CodeBlock('long', new Date(), 'javascript', longCode);
      
      const preview = codeBlock.getPreview(3);
      const lines = preview.split('\n');
      
      expect(lines.length).toBe(4); // 3 lines + "..."
      expect(preview).toContain('...');
    });

    it('should return full content for short code preview', () => {
      const codeBlock = new CodeBlock('short', new Date(), 'javascript', 'const x = 1;');
      const preview = codeBlock.getPreview(5);
      
      expect(preview).toBe('const x = 1;');
      expect(preview).not.toContain('...');
    });

    it('should estimate reading time', () => {
      const shortCodeBlock = new CodeBlock('short', new Date(), 'javascript', 'const x = 1;');
      const longCodeBlock = new CodeBlock('long', new Date(), 'typescript', complexTypeScriptCode);

      expect(longCodeBlock.estimateReadingTime()).toBeGreaterThan(shortCodeBlock.estimateReadingTime());
      expect(shortCodeBlock.estimateReadingTime()).toBeGreaterThanOrEqual(1);
    });

    it('should estimate higher reading time for complex code', () => {
      const simpleCode = 'const x = 1;';
      const complexCode = complexTypeScriptCode;
      
      const simpleCodeBlock = new CodeBlock('simple', new Date(), 'javascript', simpleCode);
      const complexCodeBlock = new CodeBlock('complex', new Date(), 'typescript', complexCode);

      expect(complexCodeBlock.estimateReadingTime()).toBeGreaterThan(simpleCodeBlock.estimateReadingTime());
    });
  });

  describe('访问者模式', () => {
    it('should accept visitor and return renderable content', () => {
      const codeBlock = new CodeBlock('test', new Date(), 'javascript', simpleJavaScriptCode);
      const result = codeBlock.accept(mockVisitor);

      expect(mockVisitor.visitCodeBlock).toHaveBeenCalledWith(codeBlock);
      expect(result).toBeInstanceOf(RenderableContent);
      expect(result.content).toBe('rendered code');
    });
  });
});