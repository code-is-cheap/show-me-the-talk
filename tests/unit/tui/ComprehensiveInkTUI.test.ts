import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComprehensiveInkTUI, TUIConfig } from '@/presentation/tui/ComprehensiveInkTUI';
import { ConversationApplicationService } from '@/application/services/ConversationApplicationService';

// Mock dependencies
vi.mock('@/application/services/ConversationApplicationService');
vi.mock('ink', () => ({
  render: vi.fn(),
  useApp: vi.fn(() => ({ exit: vi.fn() })),
  useInput: vi.fn(),
  useStdin: vi.fn(() => ({ isRawModeSupported: true, setRawMode: vi.fn() })),
}));

describe('ComprehensiveInkTUI', () => {
  let tui: ComprehensiveInkTUI;
  let mockConversationService: ConversationApplicationService;

  beforeEach(() => {
    mockConversationService = new ConversationApplicationService(
      {} as any,
      {} as any,
      {} as any
    );
    
    const mockConfig: TUIConfig = {
      claudeDir: './test/claude',
      debug: false
    };

    tui = new ComprehensiveInkTUI(mockConversationService, mockConfig);
  });

  describe('truncateTitle', () => {
    it('should truncate titles longer than the specified width', () => {
      const longTitle = 'A'.repeat(70);
      const result = (tui as any).truncateTitle(longTitle, 60);
      
      expect(result).toHaveLength(60);
      expect(result).toEndWith('...');
      expect(result).toBe('A'.repeat(57) + '...');
    });

    it('should not truncate short titles', () => {
      const shortTitle = 'Short title';
      const result = (tui as any).truncateTitle(shortTitle, 60);
      
      expect(result).toBe(shortTitle);
      expect(result).toHaveLength(shortTitle.length);
    });

    it('should handle edge case of title exactly at limit', () => {
      const exactTitle = 'A'.repeat(60);
      const result = (tui as any).truncateTitle(exactTitle, 60);
      
      expect(result).toBe(exactTitle);
      expect(result).toHaveLength(60);
    });

    it('should handle empty titles', () => {
      const result = (tui as any).truncateTitle('', 60);
      expect(result).toBe('');
    });

    it('should handle very small width limits', () => {
      const title = 'Long title';
      const result = (tui as any).truncateTitle(title, 5);
      
      expect(result).toHaveLength(5);
      expect(result).toBe('Lo...');
    });

    it('should handle width equal to ellipsis length', () => {
      const title = 'Title';
      const result = (tui as any).truncateTitle(title, 3);
      
      expect(result).toHaveLength(3);
      expect(result).toBe('...');
    });

    it('should handle the original problematic title from bug report', () => {
      // This represents the actual bug case that was fixed
      const problematicTitle = 'very-long-project-directory-name-that-exceeds-limits - 18 conversations';
      const result = (tui as any).truncateTitle(problematicTitle, 60);
      
      expect(result).toHaveLength(60);
      expect(result).toEndWith('...');
      expect(result).toBe('very-long-project-directory-name-that-exceeds-limits - 18...');
    });

    it('should handle long file paths', () => {
      const longPath = '/Very/Long/Path/To/Some/Deep/Directory/Structure/conversation.jsonl';
      const result = (tui as any).truncateTitle(longPath, 60);
      
      expect(result).toHaveLength(60);
      expect(result).toEndWith('...');
    });

    it('should handle responsive truncation for different terminal widths', () => {
      const title = 'Long conversation title that needs different truncation for different screen sizes';
      
      const narrow = (tui as any).truncateTitle(title, 30);
      const medium = (tui as any).truncateTitle(title, 50);
      const wide = (tui as any).truncateTitle(title, 80);
      
      expect(narrow.length).toBeLessThanOrEqual(30);
      expect(medium.length).toBeLessThanOrEqual(50);
      
      if (title.length <= 80) {
        expect(wide).toBe(title);
      } else {
        expect(wide.length).toBeLessThanOrEqual(80);
      }
    });

    it('should handle titles with emoji and unicode characters', () => {
      const titleWithEmoji = '🚀 Project Launch Discussion 🎯 - Implementation Planning';
      const result = (tui as any).truncateTitle(titleWithEmoji, 40);
      
      expect(result.length).toBeLessThanOrEqual(40);
      if (titleWithEmoji.length > 40) {
        expect(result).toEndWith('...');
      }
    });

    it('should handle titles with special path characters', () => {
      const pathTitle = '/Users/dev/Projects/my-app (branch: feature/new-ui) - 23 msgs';
      const result = (tui as any).truncateTitle(pathTitle, 50);
      
      expect(result.length).toBeLessThanOrEqual(50);
      if (pathTitle.length > 50) {
        expect(result).toEndWith('...');
      }
    });

    it('should handle performance with many truncations efficiently', () => {
      const titles = Array.from({ length: 100 }, (_, i) => 
        `Long conversation title number ${i} that requires truncation`
      );
      
      const startTime = Date.now();
      const results = titles.map(title => (tui as any).truncateTitle(title, 60));
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
      expect(results).toHaveLength(100);
      expect(results.every(result => result.length <= 60)).toBe(true);
    });
  });

  describe('wrapText', () => {
    it('should wrap text that exceeds width', () => {
      const text = 'This is a very long line that should be wrapped';
      const result = (tui as any).wrapText(text, 20);
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(1);
      expect(result.every((line: string) => line.length <= 20)).toBe(true);
    });

    it('should not wrap text that fits within width', () => {
      const text = 'Short text';
      const result = (tui as any).wrapText(text, 20);
      
      expect(result).toEqual([text]);
    });

    it('should handle multiple paragraphs', () => {
      const text = 'Paragraph 1\nParagraph 2';
      const result = (tui as any).wrapText(text, 20);
      
      expect(result).toContain('Paragraph 1');
      expect(result).toContain('Paragraph 2');
    });

    it('should handle empty text', () => {
      const result = (tui as any).wrapText('', 20);
      expect(result).toEqual(['']);
    });
  });

  describe('constructor and configuration', () => {
    it('should accept valid configuration', () => {
      const validConfig: TUIConfig = {
        claudeDir: './valid/claude',
        debug: true
      };

      expect(() => {
        new ComprehensiveInkTUI(mockConversationService, validConfig);
      }).not.toThrow();
    });

    it('should use default configuration when not provided', () => {
      expect(() => {
        new ComprehensiveInkTUI(mockConversationService);
      }).not.toThrow();
    });

    it('should store conversation service correctly', () => {
      expect((tui as any).conversationService).toBe(mockConversationService);
    });

    it('should store options correctly', () => {
      const config: TUIConfig = {
        claudeDir: './test/claude',
        debug: true
      };
      
      const tuiWithConfig = new ComprehensiveInkTUI(mockConversationService, config);
      expect((tuiWithConfig as any).options).toEqual(config);
    });
  });

  describe('TTY detection', () => {
    it('should have start method', () => {
      expect(typeof tui.start).toBe('function');
    });
  });
});