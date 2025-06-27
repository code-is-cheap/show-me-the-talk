import { ConversationElement } from './ConversationElement.js';
import { ConversationElementType, ContentImportance, ContentCategory } from './ConversationElementType.js';
import { ToolUse } from './ResponseTypes.js';
import { SemanticContext } from '../rendering/SemanticContext.js';
import { RenderableContent } from '../rendering/RenderableContent.js';
import { ConversationRenderVisitor } from '../rendering/ConversationRenderVisitor.js';

/**
 * 工具交互用途类型
 */
export type ToolInteractionPurpose = 
    | 'file-management' 
    | 'code-analysis' 
    | 'information-gathering' 
    | 'system-operation' 
    | 'debugging' 
    | 'content-creation' 
    | 'data-processing';

/**
 * 工具统计信息接口
 */
export interface ToolStatistics {
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    criticalCount: number;
    averageExecutionTime: number | null;
    toolBreakdown: Record<string, number>;
}

/**
 * 工具交互组领域实体
 * 表示一组相关的工具调用和结果
 */
export class ToolInteractionGroup extends ConversationElement {
    constructor(
        id: string,
        timestamp: Date,
        public readonly toolUses: ToolUse[],
        public readonly purpose: ToolInteractionPurpose,
        public readonly context?: string, // 交互上下文说明
        public readonly isSuccessful: boolean = true, // 整组交互是否成功
        public readonly totalDuration?: number, // 总执行时间（毫秒）
        turnNumber: number = 1
    ) {
        super(id, timestamp, ConversationElementType.TOOL_INTERACTION_GROUP, ContentImportance.SECONDARY, turnNumber);
    }

    /**
     * 访问者模式实现
     */
    accept(visitor: ConversationRenderVisitor): RenderableContent {
        // Convert to lightweight interface for visitor
        const visitorInterface = {
            id: this.id,
            description: this.getSummary(),
            isSuccessful: this.isSuccessful,
            interactions: this.toolUses,
            getSummary: () => this.getSummary()
        };
        return visitor.visitToolInteractionGroup(visitorInterface);
    }

    /**
     * 获取语义上下文
     */
    getSemanticContext(): SemanticContext {
        return new SemanticContext(
            false, // 不是用户发起
            this.hasCodeContent(),
            true, // 是工具结果
            this.turnNumber,
            ContentCategory.ACTION,
            this.toolUses.map(tu => tu.id),
            {
                purpose: this.purpose,
                toolCount: this.toolUses.length,
                isSuccessful: this.isSuccessful,
                primaryTool: this.getPrimaryTool(),
                statistics: this.getToolStatistics()
            }
        );
    }

    /**
     * 获取内容摘要
     */
    getSummary(): string {
        const primaryTool = this.getPrimaryTool();
        const toolCount = this.toolUses.length;
        const status = this.isSuccessful ? 'successful' : 'failed';
        const purposeText = this.getPurposeIndicator();
        
        if (toolCount === 1) {
            return `${primaryTool}: ${purposeText} (${status})`;
        } else {
            return `${toolCount} tools: ${purposeText} (${status})`;
        }
    }

    /**
     * 检查是否包含特定类型的内容
     */
    hasContentType(type: string): boolean {
        switch (type) {
            case 'tools':
                return true;
            case 'file-operations':
                return this.hasFileOperations();
            case 'search':
                return this.hasSearchOperations();
            case 'system':
                return this.hasSystemOperations();
            case 'code':
                return this.hasCodeContent();
            case 'critical':
                return this.hasCriticalOperations();
            default:
                return false;
        }
    }

    /**
     * 领域方法：获取主要工具
     */
    getPrimaryTool(): string | null {
        if (this.toolUses.length === 0) return null;
        
        // 按使用频率排序
        const toolCounts = this.toolUses.reduce((acc, tool) => {
            acc[tool.toolName] = (acc[tool.toolName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(toolCounts)
            .sort(([, a], [, b]) => b - a)[0][0];
    }

    /**
     * 领域方法：检查是否包含关键操作
     */
    hasCriticalOperations(): boolean {
        return this.toolUses.some(tool => tool.isCriticalOperation());
    }

    /**
     * 领域方法：检查是否包含文件操作
     */
    hasFileOperations(): boolean {
        return this.toolUses.some(tool => tool.getToolCategory() === 'file-operation');
    }

    /**
     * 领域方法：检查是否包含搜索操作
     */
    hasSearchOperations(): boolean {
        return this.toolUses.some(tool => tool.getToolCategory() === 'search');
    }

    /**
     * 领域方法：检查是否包含系统操作
     */
    hasSystemOperations(): boolean {
        return this.toolUses.some(tool => tool.getToolCategory() === 'system');
    }

    /**
     * 领域方法：检查是否包含代码内容
     */
    hasCodeContent(): boolean {
        return this.toolUses.some(tool => {
            const result = tool.result;
            if (typeof result === 'string') {
                return result.includes('```') || result.includes('function') || result.includes('class');
            }
            return false;
        });
    }

    /**
     * 领域方法：检查是否为慢操作
     */
    isSlow(): boolean {
        if (this.totalDuration && this.totalDuration > 5000) return true;
        
        const avgTime = this.calculateAverageExecutionTime();
        return avgTime !== null && avgTime > 2000;
    }

    /**
     * 领域方法：检查是否为复杂操作
     */
    isComplex(): boolean {
        return this.toolUses.length > 5 || 
               this.hasCriticalOperations() ||
               this.getUniqueToolTypes().length > 3;
    }

    /**
     * 获取相关文件列表
     */
    getRelatedFiles(): string[] {
        const files = new Set<string>();
        
        this.toolUses.forEach(tool => {
            const params = tool.parameters;
            
            // 常见的文件参数名
            ['file_path', 'path', 'filename', 'filepath'].forEach(paramName => {
                if (params[paramName] && typeof params[paramName] === 'string') {
                    files.add(params[paramName]);
                }
            });
            
            // 从结果中提取文件路径
            if (typeof tool.result === 'string') {
                const pathMatches = tool.result.match(/\/[^\s]+\.(ts|js|json|md|txt|py|java|cpp|c)/g);
                pathMatches?.forEach(path => files.add(path));
            }
        });
        
        return Array.from(files);
    }

    /**
     * 获取唯一工具类型
     */
    getUniqueToolTypes(): string[] {
        const types = new Set(this.toolUses.map(tool => tool.getToolCategory()));
        return Array.from(types);
    }

    /**
     * 获取工具统计信息
     */
    getToolStatistics(): ToolStatistics {
        return {
            totalCount: this.toolUses.length,
            successfulCount: this.toolUses.filter(t => t.isSuccessful).length,
            failedCount: this.toolUses.filter(t => !t.isSuccessful).length,
            criticalCount: this.toolUses.filter(t => t.isCriticalOperation()).length,
            averageExecutionTime: this.calculateAverageExecutionTime(),
            toolBreakdown: this.getToolBreakdown()
        };
    }

    /**
     * 计算平均执行时间
     */
    private calculateAverageExecutionTime(): number | null {
        const timings = this.toolUses
            .map(tool => tool.executionTime)
            .filter((time): time is number => time !== undefined);
        
        if (timings.length === 0) return null;
        
        return timings.reduce((sum, time) => sum + time, 0) / timings.length;
    }

    /**
     * 获取工具分解统计
     */
    private getToolBreakdown(): Record<string, number> {
        return this.toolUses.reduce((breakdown, tool) => {
            breakdown[tool.toolName] = (breakdown[tool.toolName] || 0) + 1;
            return breakdown;
        }, {} as Record<string, number>);
    }

    /**
     * 获取用途指示器
     */
    private getPurposeIndicator(): string {
        switch (this.purpose) {
            case 'file-management':
                return 'managing files';
            case 'code-analysis':
                return 'analyzing code';
            case 'information-gathering':
                return 'gathering information';
            case 'system-operation':
                return 'system operations';
            case 'debugging':
                return 'debugging';
            case 'content-creation':
                return 'creating content';
            case 'data-processing':
                return 'processing data';
            default:
                return 'tool operations';
        }
    }

    /**
     * 获取失败的工具操作
     */
    getFailedOperations(): ToolUse[] {
        return this.toolUses.filter(tool => !tool.isSuccessful);
    }

    /**
     * 获取关键操作
     */
    getCriticalOperations(): ToolUse[] {
        return this.toolUses.filter(tool => tool.isCriticalOperation());
    }

    /**
     * 估算影响范围
     */
    estimateImpactScope(): 'low' | 'medium' | 'high' {
        let score = 0;
        
        if (this.hasCriticalOperations()) score += 3;
        if (this.hasFileOperations()) score += 2;
        if (this.hasSystemOperations()) score += 2;
        if (this.toolUses.length > 5) score += 1;
        if (this.getRelatedFiles().length > 3) score += 1;
        
        if (score >= 5) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }

    /**
     * 获取操作摘要文本
     */
    getOperationSummary(): string {
        const stats = this.getToolStatistics();
        const impact = this.estimateImpactScope();
        
        let summary = `Executed ${stats.totalCount} tool operations`;
        
        if (stats.failedCount > 0) {
            summary += ` (${stats.failedCount} failed)`;
        }
        
        if (stats.criticalCount > 0) {
            summary += ` including ${stats.criticalCount} critical operations`;
        }
        
        summary += ` with ${impact} impact`;
        
        return summary;
    }

    /**
     * 检查是否可以重试失败的操作
     */
    canRetryFailedOperations(): boolean {
        const failedOps = this.getFailedOperations();
        
        // 如果没有失败操作，则不需要重试
        if (failedOps.length === 0) return false;
        
        // 检查失败原因是否可重试
        return failedOps.some(op => {
            const errorMsg = op.errorMessage?.toLowerCase() || '';
            
            // 网络或临时错误通常可重试
            const retryableErrors = ['timeout', 'network', 'temporary', 'rate limit', 'busy'];
            return retryableErrors.some(error => errorMsg.includes(error));
        });
    }

    /**
     * 获取预览内容（用于摘要显示）
     */
    getPreview(maxLength: number = 150): string {
        const summary = this.getOperationSummary();
        
        if (summary.length <= maxLength) {
            return summary;
        }
        
        return summary.substring(0, maxLength) + '...';
    }

    /**
     * 估算完成时间（分钟）
     */
    estimateCompletionTime(): number {
        if (this.totalDuration) {
            return Math.ceil(this.totalDuration / 60000); // 转换为分钟
        }
        
        const avgTime = this.calculateAverageExecutionTime();
        if (avgTime) {
            return Math.ceil((avgTime * this.toolUses.length) / 60000);
        }
        
        // 基于工具数量的估算
        return Math.max(1, Math.ceil(this.toolUses.length * 0.5));
    }
}