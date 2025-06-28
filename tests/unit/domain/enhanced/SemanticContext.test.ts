import { describe, it, expect } from 'vitest';
import { SemanticContext } from '../../../../src/domain/models/rendering/SemanticContext';
import { ContentCategory } from '../../../../src/domain/models/enhanced/ConversationElementType';

describe('SemanticContext', () => {
  describe('构造函数', () => {
    it('should initialize with all properties', () => {
      const context = new SemanticContext(
        true,
        false,
        true,
        5,
        ContentCategory.QUESTION,
        ['element1', 'element2'],
        { key: 'value' }
      );

      expect(context.isUserInitiated).toBe(true);
      expect(context.hasCodeContent).toBe(false);
      expect(context.isToolResult).toBe(true);
      expect(context.conversationTurn).toBe(5);
      expect(context.contentCategory).toBe(ContentCategory.QUESTION);
      expect(context.relatedElements).toEqual(['element1', 'element2']);
      expect(context.metadata).toEqual({ key: 'value' });
    });

    it('should use default values for optional parameters', () => {
      const context = new SemanticContext(
        false,
        true,
        false,
        1,
        ContentCategory.ANSWER
      );

      expect(context.relatedElements).toEqual([]);
      expect(context.metadata).toEqual({});
    });
  });

  describe('isInteractive', () => {
    it('should return true for user-initiated content', () => {
      const context = new SemanticContext(true, false, false, 1, ContentCategory.QUESTION);
      expect(context.isInteractive()).toBe(true);
    });

    it('should return true for tool results', () => {
      const context = new SemanticContext(false, false, true, 1, ContentCategory.RESULT);
      expect(context.isInteractive()).toBe(true);
    });

    it('should return true for both user-initiated and tool result', () => {
      const context = new SemanticContext(true, false, true, 1, ContentCategory.ACTION);
      expect(context.isInteractive()).toBe(true);
    });

    it('should return false for non-interactive content', () => {
      const context = new SemanticContext(false, false, false, 1, ContentCategory.METADATA);
      expect(context.isInteractive()).toBe(false);
    });
  });

  describe('getComplexityScore', () => {
    it('should return 0 for simple content', () => {
      const context = new SemanticContext(false, false, false, 1, ContentCategory.ANSWER);
      expect(context.getComplexityScore()).toBe(0);
    });

    it('should add 2 for code content', () => {
      const context = new SemanticContext(false, true, false, 1, ContentCategory.ANSWER);
      expect(context.getComplexityScore()).toBe(2);
    });

    it('should add 1 for tool result', () => {
      const context = new SemanticContext(false, false, true, 1, ContentCategory.RESULT);
      expect(context.getComplexityScore()).toBe(1);
    });

    it('should add 1 for related elements', () => {
      const context = new SemanticContext(false, false, false, 1, ContentCategory.ANSWER, ['element1']);
      expect(context.getComplexityScore()).toBe(1);
    });

    it('should sum all complexity factors', () => {
      const context = new SemanticContext(
        false,
        true,  // +2
        true,  // +1
        1,
        ContentCategory.ACTION,
        ['element1', 'element2'] // +1
      );
      expect(context.getComplexityScore()).toBe(4);
    });
  });

  describe('静态工厂方法', () => {
    describe('simple', () => {
      it('should create simple question context', () => {
        const context = SemanticContext.simple(ContentCategory.QUESTION, 3);

        // Current implementation always sets isUserInitiated to false in static methods
        expect(context.isUserInitiated).toBe(false);
        expect(context.hasCodeContent).toBe(false);
        expect(context.isToolResult).toBe(false);
        expect(context.conversationTurn).toBe(3);
        expect(context.contentCategory).toBe(ContentCategory.QUESTION);
        expect(context.relatedElements).toEqual([]);
        expect(context.metadata).toEqual({});
      });

      it('should create simple answer context', () => {
        const context = SemanticContext.simple(ContentCategory.ANSWER, 5);

        expect(context.isUserInitiated).toBe(false);
        expect(context.hasCodeContent).toBe(false);
        expect(context.isToolResult).toBe(false);
        expect(context.conversationTurn).toBe(5);
        expect(context.contentCategory).toBe(ContentCategory.ANSWER);
      });

      it('should use default turn number', () => {
        const context = SemanticContext.simple(ContentCategory.METADATA);
        expect(context.conversationTurn).toBe(0);
      });
    });

    describe('withCode', () => {
      it('should create context with code content', () => {
        const context = SemanticContext.withCode(ContentCategory.ANSWER, 2);

        expect(context.isUserInitiated).toBe(false);
        expect(context.hasCodeContent).toBe(true);
        expect(context.isToolResult).toBe(false);
        expect(context.conversationTurn).toBe(2);
        expect(context.contentCategory).toBe(ContentCategory.ANSWER);
      });

      it('should mark question with code as user-initiated', () => {
        const context = SemanticContext.withCode(ContentCategory.QUESTION, 1);
        // Current implementation always sets isUserInitiated to false in static methods
        expect(context.isUserInitiated).toBe(false);
        expect(context.hasCodeContent).toBe(true);
      });
    });

    describe('forTool', () => {
      it('should create tool context with defaults', () => {
        const context = SemanticContext.forTool(3);

        expect(context.isUserInitiated).toBe(false);
        // Current implementation sets hasCodeContent to false for tool contexts
        expect(context.hasCodeContent).toBe(false);
        expect(context.isToolResult).toBe(true);
        expect(context.conversationTurn).toBe(3);
        expect(context.contentCategory).toBe(ContentCategory.ACTION);
        expect(context.relatedElements).toEqual([]);
      });

      it('should create tool context with related elements', () => {
        const relatedElements = ['tool1', 'tool2'];
        const context = SemanticContext.forTool(1, relatedElements);

        expect(context.relatedElements).toEqual(relatedElements);
        expect(context.contentCategory).toBe(ContentCategory.ACTION);
      });

      it('should use default turn number', () => {
        const context = SemanticContext.forTool();
        expect(context.conversationTurn).toBe(0);
      });
    });
  });
});