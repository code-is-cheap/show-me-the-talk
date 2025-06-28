import { describe, it, expect, vi } from 'vitest';
import { ToolInteractionGroup } from '../../../../src/domain/models/enhanced/ToolInteractionGroup';
import { ToolUse } from '../../../../src/domain/models/enhanced/ResponseTypes';
import { ConversationElementType, ContentImportance, ContentCategory } from '../../../../src/domain/models/enhanced/ConversationElementType';
import { ConversationRenderVisitor } from '../../../../src/domain/models/rendering/ConversationRenderVisitor';
import { RenderableContent, VisualStyle } from '../../../../src/domain/models/rendering/RenderableContent';

describe('ToolInteractionGroup', () => {
  const mockVisitor: ConversationRenderVisitor = {
    visitUserQuestion: vi.fn(),
    visitAssistantResponse: vi.fn(),
    visitToolInteractionGroup: vi.fn().mockReturnValue(RenderableContent.create('rendered tool group', VisualStyle.STANDARD)),
    visitCodeBlock: vi.fn()
  };

  const readTool = new ToolUse(
    'tool1',
    'Read',
    { file_path: '/src/test.js' },
    'const test = () => {}',
    true,
    100
  );

  const writeTool = new ToolUse(
    'tool2',
    'Write',
    { file_path: '/src/output.js', content: 'function output() {}' },
    'File written successfully',
    true,
    250
  );

  const searchTool = new ToolUse(
    'tool3',
    'Grep',
    { pattern: 'function', path: '/src' },
    'Found 5 matches',
    true,
    75
  );

  const failedTool = new ToolUse(
    'tool4',
    'Edit',
    { file_path: '/src/broken.js' },
    undefined,
    false,
    50,
    'File not found'
  );

  describe('构造函数和基础属性', () => {
    it('should initialize with required properties', () => {
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const toolGroup = new ToolInteractionGroup(
        'tg1',
        timestamp,
        [readTool, writeTool],
        'file-management',
        'Reading and writing configuration files',
        true,
        500,
        1
      );

      expect(toolGroup.id).toBe('tg1');
      expect(toolGroup.timestamp).toBe(timestamp);
      expect(toolGroup.toolUses).toEqual([readTool, writeTool]);
      expect(toolGroup.purpose).toBe('file-management');
      expect(toolGroup.context).toBe('Reading and writing configuration files');
      expect(toolGroup.isSuccessful).toBe(true);
      expect(toolGroup.totalDuration).toBe(500);
      expect(toolGroup.turnNumber).toBe(1);
      expect(toolGroup.type).toBe(ConversationElementType.TOOL_INTERACTION_GROUP);
      expect(toolGroup.importance).toBe(ContentImportance.SECONDARY);
    });

    it('should use default values for optional parameters', () => {
      const toolGroup = new ToolInteractionGroup(
        'tg1',
        new Date(),
        [readTool],
        'information-gathering'
      );

      expect(toolGroup.context).toBeUndefined();
      expect(toolGroup.isSuccessful).toBe(true);
      expect(toolGroup.totalDuration).toBeUndefined();
      expect(toolGroup.turnNumber).toBe(0);
    });

    it('should handle empty tool array', () => {
      const toolGroup = new ToolInteractionGroup(
        'tg1',
        new Date(),
        [],
        'system-operation'
      );

      expect(toolGroup.toolUses).toEqual([]);
      expect(toolGroup.getPrimaryTool()).toBeNull();
    });
  });

  describe('主要工具识别', () => {
    it('should identify primary tool when only one tool', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'file-management');
      expect(toolGroup.getPrimaryTool()).toBe('Read');
    });

    it('should identify most frequent tool as primary', () => {
      const readTool2 = new ToolUse('tool5', 'Read', {}, 'content2');
      const toolGroup = new ToolInteractionGroup(
        'test', 
        new Date(), 
        [readTool, writeTool, readTool2], 
        'file-management'
      );
      expect(toolGroup.getPrimaryTool()).toBe('Read');
    });

    it('should return null for empty tool array', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [], 'system-operation');
      expect(toolGroup.getPrimaryTool()).toBeNull();
    });
  });

  describe('内容类型检查', () => {
    it('should always identify as tools content', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'file-management');
      expect(toolGroup.hasContentType('tools')).toBe(true);
    });

    it('should detect critical operations', () => {
      const criticalGroup = new ToolInteractionGroup('test', new Date(), [writeTool], 'file-management');
      const nonCriticalGroup = new ToolInteractionGroup('test', new Date(), [searchTool], 'information-gathering');

      expect(criticalGroup.hasContentType('critical')).toBe(true);
      expect(nonCriticalGroup.hasContentType('critical')).toBe(false);
    });

    it('should detect successful vs failed operations', () => {
      const successfulGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'file-management', undefined, true);
      const failedGroup = new ToolInteractionGroup('test', new Date(), [failedTool], 'file-management', undefined, false);

      expect(successfulGroup.hasContentType('successful')).toBe(true);
      expect(successfulGroup.hasContentType('failed')).toBe(false);
      expect(failedGroup.hasContentType('successful')).toBe(false);
      expect(failedGroup.hasContentType('failed')).toBe(true);
    });

    it('should detect file operations', () => {
      const fileGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool], 'file-management');
      const searchGroup = new ToolInteractionGroup('test', new Date(), [searchTool], 'information-gathering');

      expect(fileGroup.hasContentType('file-operations')).toBe(true);
      expect(searchGroup.hasContentType('file-operations')).toBe(false);
    });

    it('should detect search operations', () => {
      const searchGroup = new ToolInteractionGroup('test', new Date(), [searchTool], 'information-gathering');
      const fileGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'file-management');

      expect(searchGroup.hasContentType('search-operations')).toBe(true);
      expect(fileGroup.hasContentType('search-operations')).toBe(false);
    });

    it('should detect code content in results', () => {
      const codeGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'code-analysis');
      const noCodeTool = new ToolUse('tool', 'Read', {}, 'Just plain text content');
      const noCodeGroup = new ToolInteractionGroup('test', new Date(), [noCodeTool], 'information-gathering');

      expect(codeGroup.hasContentType('code')).toBe(true);
      expect(noCodeGroup.hasContentType('code')).toBe(false);
    });

    it('should detect slow operations', () => {
      const slowTool = new ToolUse('slow', 'Bash', {}, 'result', true, 3000);
      const slowGroup = new ToolInteractionGroup('test', new Date(), [slowTool], 'system-operation');
      const fastGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'file-management');

      expect(slowGroup.hasContentType('slow')).toBe(true);
      expect(fastGroup.hasContentType('slow')).toBe(false);
    });

    it('should detect complex operations', () => {
      const manyTools = Array(7).fill(0).map((_, i) => new ToolUse(`tool${i}`, 'Read', {}));
      const complexGroup = new ToolInteractionGroup('test', new Date(), manyTools, 'data-processing');
      const simpleGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'file-management');

      expect(complexGroup.hasContentType('complex')).toBe(true);
      expect(simpleGroup.hasContentType('complex')).toBe(false);
    });

    it('should match purpose type', () => {
      const debugGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'debugging');
      expect(debugGroup.hasContentType('debugging')).toBe(true);
      expect(debugGroup.hasContentType('file-management')).toBe(false);
    });
  });

  describe('摘要生成', () => {
    it('should generate summary with tool count and primary tool', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool], 'file-management');
      const summary = toolGroup.getSummary();

      expect(summary).toContain('2个工具操作');
      expect(summary).toContain('📁'); // file-management icon
      expect(summary).toContain('✅'); // success icon
    });

    it('should include primary tool in summary', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool], 'file-management');
      const summary = toolGroup.getSummary();

      expect(summary).toMatch(/主要: (Read|Write)/);
    });

    it('should include duration in summary', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'file-management', undefined, true, 1500);
      const summary = toolGroup.getSummary();

      expect(summary).toContain('1500ms');
    });

    it('should show failed status', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [failedTool], 'debugging', undefined, false);
      const summary = toolGroup.getSummary();

      expect(summary).toContain('❌'); // failed icon
    });

    it('should include appropriate icons for different purposes', () => {
      const fileGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'file-management');
      const codeGroup = new ToolInteractionGroup('test', new Date(), [searchTool], 'code-analysis');
      const systemGroup = new ToolInteractionGroup('test', new Date(), [writeTool], 'system-operation');

      expect(fileGroup.getSummary()).toContain('📁');
      expect(codeGroup.getSummary()).toContain('🔍');
      expect(systemGroup.getSummary()).toContain('⚙️');
    });
  });

  describe('语义上下文', () => {
    it('should create correct semantic context', () => {
      const toolGroup = new ToolInteractionGroup(
        'test',
        new Date(),
        [readTool, writeTool],
        'file-management',
        'Managing project files',
        true,
        500,
        2
      );

      const context = toolGroup.getSemanticContext();

      expect(context.isUserInitiated).toBe(false);
      expect(context.hasCodeContent).toBe(true);
      expect(context.isToolResult).toBe(true);
      expect(context.conversationTurn).toBe(2);
      expect(context.contentCategory).toBe(ContentCategory.ACTION);
      expect(context.relatedElements).toContain('/src/test.js');
      expect(context.relatedElements).toContain('/src/output.js');
      expect(context.metadata.purpose).toBe('file-management');
      expect(context.metadata.toolCount).toBe(2);
      expect(context.metadata.isSuccessful).toBe(true);
      expect(context.metadata.hasCriticalOperations).toBe(true);
      expect(context.metadata.primaryTool).toBe('Read');
    });

    it('should handle groups without related files', () => {
      const noFilesTool = new ToolUse('tool', 'Bash', { command: 'ls' }, 'listing');
      const toolGroup = new ToolInteractionGroup('test', new Date(), [noFilesTool], 'system-operation');
      const context = toolGroup.getSemanticContext();

      expect(context.relatedElements).toEqual([]);
    });
  });

  describe('工具统计', () => {
    it('should calculate tool statistics correctly', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool, failedTool], 'file-management');
      const stats = toolGroup.getToolStatistics();

      expect(stats.totalCount).toBe(3);
      expect(stats.successfulCount).toBe(2);
      expect(stats.failedCount).toBe(1);
      expect(stats.criticalCount).toBe(2); // writeTool and failedTool (edit) are critical
      expect(stats.averageExecutionTime).toBe(133); // (100 + 250 + 50) / 3
      expect(stats.toolBreakdown['file-operation']).toBe(3);
    });

    it('should handle missing execution times', () => {
      const noTimeTool = new ToolUse('tool', 'Read', {}, 'content');
      const toolGroup = new ToolInteractionGroup('test', new Date(), [noTimeTool], 'file-management');
      const stats = toolGroup.getToolStatistics();

      expect(stats.averageExecutionTime).toBeNull();
    });

    it('should categorize tools correctly', () => {
      const bashTool = new ToolUse('tool', 'Bash', {}, 'output');
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, searchTool, bashTool], 'mixed');
      const stats = toolGroup.getToolStatistics();

      expect(stats.toolBreakdown['file-operation']).toBe(1);
      expect(stats.toolBreakdown['search']).toBe(1);
      expect(stats.toolBreakdown['analysis']).toBe(1);
    });
  });

  describe('相关文件提取', () => {
    it('should extract files from tool parameters', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool], 'file-management');
      const files = toolGroup.getRelatedFiles();

      expect(files).toContain('/src/test.js');
      expect(files).toContain('/src/output.js');
    });

    it('should extract files from tool results', () => {
      const resultWithFiles = new ToolUse('tool', 'Grep', {}, 'Found matches in /src/app.js and /src/utils.ts');
      const toolGroup = new ToolInteractionGroup('test', new Date(), [resultWithFiles], 'code-analysis');
      const files = toolGroup.getRelatedFiles();

      expect(files).toContain('/src/app.js');
      expect(files).toContain('/src/utils.ts');
    });

    it('should handle notebook paths', () => {
      const notebookTool = new ToolUse('tool', 'NotebookRead', { notebook_path: '/notebook.ipynb' }, 'content');
      const toolGroup = new ToolInteractionGroup('test', new Date(), [notebookTool], 'data-processing');
      const files = toolGroup.getRelatedFiles();

      expect(files).toContain('/notebook.ipynb');
    });

    it('should deduplicate file paths', () => {
      const duplicateTool = new ToolUse('tool', 'Edit', { file_path: '/src/test.js' }, 'edited');
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, duplicateTool], 'file-management');
      const files = toolGroup.getRelatedFiles();

      expect(files.filter(f => f === '/src/test.js')).toHaveLength(1);
    });
  });

  describe('操作分析', () => {
    it('should identify unique tool types', () => {
      const bashTool = new ToolUse('tool', 'Bash', {}, 'output');
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, searchTool, bashTool], 'mixed');
      const types = toolGroup.getUniqueToolTypes();

      expect(types).toContain('file-operation');
      expect(types).toContain('search');
      expect(types).toContain('analysis');
      expect(types).toHaveLength(3);
    });

    it('should get failed operations', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, failedTool], 'debugging');
      const failed = toolGroup.getFailedOperations();

      expect(failed).toHaveLength(1);
      expect(failed[0]).toBe(failedTool);
    });

    it('should get critical operations', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool], 'file-management');
      const critical = toolGroup.getCriticalOperations();

      expect(critical).toHaveLength(1);
      expect(critical[0]).toBe(writeTool);
    });

    it('should estimate impact scope', () => {
      const lowImpactGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'information-gathering');
      const mediumImpactGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool], 'file-management');
      const manyTools = Array(12).fill(0).map((_, i) => new ToolUse(`tool${i}`, 'Read', {}));
      const highImpactGroup = new ToolInteractionGroup('test', new Date(), manyTools, 'data-processing');

      expect(lowImpactGroup.estimateImpactScope()).toBe('low');
      expect(mediumImpactGroup.estimateImpactScope()).toBe('medium');
      expect(highImpactGroup.estimateImpactScope()).toBe('high');
    });

    it('should check if failed operations can be retried', () => {
      const safeFailedTool = new ToolUse('tool', 'Read', {}, undefined, false, 100, 'Network error');
      const retryableGroup = new ToolInteractionGroup('test', new Date(), [readTool, safeFailedTool], 'information-gathering');
      const nonRetryableGroup = new ToolInteractionGroup('test', new Date(), [failedTool], 'file-management');

      expect(retryableGroup.canRetryFailedOperations()).toBe(true);
      expect(nonRetryableGroup.canRetryFailedOperations()).toBe(false); // edit is critical
    });
  });

  describe('时间估算', () => {
    it('should estimate completion time from total duration', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'file-management', undefined, true, 120000);
      expect(toolGroup.estimateCompletionTime()).toBe(2); // 120000ms = 2 minutes
    });

    it('should estimate completion time from tool count and complexity', () => {
      const simpleGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'information-gathering');
      const complexGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool], 'file-management');
      const manyTools = Array(10).fill(0).map((_, i) => new ToolUse(`tool${i}`, 'Read', {}));
      const hugeGroup = new ToolInteractionGroup('test', new Date(), manyTools, 'data-processing');

      expect(simpleGroup.estimateCompletionTime()).toBe(1); // minimum 1 minute
      expect(complexGroup.estimateCompletionTime()).toBeGreaterThan(simpleGroup.estimateCompletionTime());
      expect(hugeGroup.estimateCompletionTime()).toBeGreaterThan(complexGroup.estimateCompletionTime());
    });
  });

  describe('实用方法', () => {
    it('should generate operation summary', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool], 'file-management', undefined, true);
      const summary = toolGroup.getOperationSummary();

      expect(summary).toContain('file management');
      expect(summary).toContain('2 tools');
      expect(summary).toContain('successful');
    });

    it('should generate preview with length limit', () => {
      const longContextGroup = new ToolInteractionGroup(
        'test', 
        new Date(), 
        [readTool], 
        'content-creation',
        undefined,
        true
      );
      const preview = longContextGroup.getPreview(20);

      expect(preview.length).toBeLessThanOrEqual(23); // 20 + "..."
    });

    it('should return full summary if within limit', () => {
      const shortGroup = new ToolInteractionGroup('test', new Date(), [readTool], 'debugging');
      const summary = shortGroup.getOperationSummary();
      const preview = shortGroup.getPreview(100);

      expect(preview).toBe(summary);
      expect(preview).not.toContain('...');
    });
  });

  describe('访问者模式', () => {
    it('should accept visitor and return renderable content', () => {
      const toolGroup = new ToolInteractionGroup('test', new Date(), [readTool, writeTool], 'file-management');
      const result = toolGroup.accept(mockVisitor);

      expect(mockVisitor.visitToolInteractionGroup).toHaveBeenCalledWith(toolGroup);
      expect(result).toBeInstanceOf(RenderableContent);
      expect(result.content).toBe('rendered tool group');
    });
  });
});