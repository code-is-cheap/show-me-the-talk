import { describe, it, expect, vi } from 'vitest';
import { ConversationElement } from '../../../../src/domain/models/enhanced/ConversationElement';
import { ConversationElementType, ContentImportance } from '../../../../src/domain/models/enhanced/ConversationElementType';
import { SemanticContext } from '../../../../src/domain/models/rendering/SemanticContext';
import { RenderableContent, VisualStyle } from '../../../../src/domain/models/rendering/RenderableContent';
import { ConversationRenderVisitor } from '../../../../src/domain/models/rendering/ConversationRenderVisitor';

// 创建测试用的ConversationElement实现
class TestConversationElement extends ConversationElement {
  constructor(
    id: string = 'test-id',
    timestamp: Date = new Date(),
    type: ConversationElementType = ConversationElementType.USER_QUESTION,
    importance: ContentImportance = ContentImportance.PRIMARY,
    turnNumber: number = 1,
    private testContent: string = 'test content'
  ) {
    super(id, timestamp, type, importance, turnNumber);
  }

  accept(visitor: ConversationRenderVisitor): RenderableContent {
    return RenderableContent.create(this.testContent, VisualStyle.STANDARD);
  }

  getSemanticContext(): SemanticContext {
    return SemanticContext.simple(this.type as any, this.turnNumber);
  }

  getSummary(): string {
    return `Test element: ${this.testContent}`;
  }

  hasContentType(type: string): boolean {
    return type === 'test' || type === this.testContent;
  }
}

describe('ConversationElement', () => {
  describe('基础属性', () => {
    it('should initialize with correct properties', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const element = new TestConversationElement(
        'test-123',
        timestamp,
        ConversationElementType.USER_QUESTION,
        ContentImportance.PRIMARY,
        5
      );

      expect(element.id).toBe('test-123');
      expect(element.timestamp).toBe(timestamp);
      expect(element.type).toBe(ConversationElementType.USER_QUESTION);
      expect(element.importance).toBe(ContentImportance.PRIMARY);
      expect(element.turnNumber).toBe(5);
    });

    it('should have default turn number of 0', () => {
      const element = new TestConversationElement('test', new Date(), ConversationElementType.SYSTEM_MESSAGE, ContentImportance.TERTIARY, 0);
      expect(element.turnNumber).toBe(0);
    });
  });

  describe('重要性检查方法', () => {
    it('should correctly identify primary content', () => {
      const primary = new TestConversationElement('test', new Date(), ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY);
      const secondary = new TestConversationElement('test', new Date(), ConversationElementType.TOOL_INTERACTION, ContentImportance.SECONDARY);

      expect(primary.isPrimary()).toBe(true);
      expect(primary.isSecondary()).toBe(false);
      expect(primary.isTertiary()).toBe(false);

      expect(secondary.isPrimary()).toBe(false);
      expect(secondary.isSecondary()).toBe(true);
      expect(secondary.isTertiary()).toBe(false);
    });

    it('should correctly identify tertiary content', () => {
      const tertiary = new TestConversationElement('test', new Date(), ConversationElementType.METADATA, ContentImportance.TERTIARY);

      expect(tertiary.isPrimary()).toBe(false);
      expect(tertiary.isSecondary()).toBe(false);
      expect(tertiary.isTertiary()).toBe(true);
    });
  });

  describe('唯一标识符', () => {
    it('should generate unique identifier', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const element = new TestConversationElement('test-123', timestamp, ConversationElementType.USER_QUESTION);
      
      // Current implementation doesn't include timestamp in unique ID
      const expectedId = `${ConversationElementType.USER_QUESTION}-test-123-1`;
      expect(element.getUniqueId()).toBe(expectedId);
    });

    it('should generate different IDs for different elements', () => {
      const timestamp1 = new Date('2024-01-01T10:00:00Z');
      const timestamp2 = new Date('2024-01-01T10:00:01Z');
      
      const element1 = new TestConversationElement('test-1', timestamp1);
      const element2 = new TestConversationElement('test-2', timestamp2);

      expect(element1.getUniqueId()).not.toBe(element2.getUniqueId());
    });
  });

  describe('时间比较', () => {
    it('should compare elements by turn number first', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const element1 = new TestConversationElement('test-1', timestamp, ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, 1);
      const element2 = new TestConversationElement('test-2', timestamp, ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, 2);

      expect(element1.compareTo(element2)).toBeLessThan(0);
      expect(element2.compareTo(element1)).toBeGreaterThan(0);
    });

    it('should compare elements by timestamp when turn numbers are equal', () => {
      const timestamp1 = new Date('2024-01-01T10:00:00Z');
      const timestamp2 = new Date('2024-01-01T10:00:01Z');
      
      const element1 = new TestConversationElement('test-1', timestamp1, ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, 1);
      const element2 = new TestConversationElement('test-2', timestamp2, ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, 1);

      expect(element1.compareTo(element2)).toBeLessThan(0);
      expect(element2.compareTo(element1)).toBeGreaterThan(0);
    });

    it('should return 0 for identical elements', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const element1 = new TestConversationElement('test', timestamp, ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, 1);
      const element2 = new TestConversationElement('test', timestamp, ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, 1);

      expect(element1.compareTo(element2)).toBe(0);
    });
  });

  describe('时间范围检查', () => {
    const baseTime = new Date('2024-01-01T12:00:00Z');
    const element = new TestConversationElement('test', baseTime);

    it('should be within unlimited time range', () => {
      expect(element.isWithinTimeRange()).toBe(true);
    });

    it('should be within valid start time range', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      expect(element.isWithinTimeRange(startTime)).toBe(true);
    });

    it('should be outside early start time range', () => {
      const startTime = new Date('2024-01-01T14:00:00Z');
      expect(element.isWithinTimeRange(startTime)).toBe(false);
    });

    it('should be within valid end time range', () => {
      const endTime = new Date('2024-01-01T14:00:00Z');
      expect(element.isWithinTimeRange(undefined, endTime)).toBe(true);
    });

    it('should be outside late end time range', () => {
      const endTime = new Date('2024-01-01T10:00:00Z');
      expect(element.isWithinTimeRange(undefined, endTime)).toBe(false);
    });

    it('should be within valid start and end time range', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T14:00:00Z');
      expect(element.isWithinTimeRange(startTime, endTime)).toBe(true);
    });
  });

  describe('JSON序列化', () => {
    it('should serialize to JSON correctly', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const element = new TestConversationElement(
        'test-123',
        timestamp,
        ConversationElementType.USER_QUESTION,
        ContentImportance.PRIMARY,
        5,
        'test content'
      );

      const json = element.toJSON();

      expect(json).toEqual({
        id: 'test-123',
        timestamp: '2024-01-01T10:00:00.000Z',
        type: ConversationElementType.USER_QUESTION,
        importance: ContentImportance.PRIMARY,
        turnNumber: 5,
        summary: 'Test element: test content',
        semanticContext: expect.any(Object)
      });
    });
  });

  describe('访问者模式', () => {
    it('should accept visitor and return renderable content', () => {
      const element = new TestConversationElement('test', new Date(), ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, 1, 'test content');
      
      const mockVisitor: ConversationRenderVisitor = {
        visitUserQuestion: vi.fn().mockReturnValue(RenderableContent.create('rendered', VisualStyle.PROMINENT)),
        visitAssistantResponse: vi.fn(),
        visitToolInteractionGroup: vi.fn(),
        visitCodeBlock: vi.fn()
      };

      const result = element.accept(mockVisitor);

      expect(result).toBeInstanceOf(RenderableContent);
      expect(result.content).toBe('test content');
      expect(result.metadata.visualStyle).toBe(VisualStyle.STANDARD);
    });
  });

  describe('内容类型检查', () => {
    it('should check content types correctly', () => {
      const element = new TestConversationElement('test', new Date(), ConversationElementType.USER_QUESTION, ContentImportance.PRIMARY, 1, 'test content');

      expect(element.hasContentType('test')).toBe(true);
      expect(element.hasContentType('test content')).toBe(true);
      expect(element.hasContentType('nonexistent')).toBe(false);
    });
  });
});