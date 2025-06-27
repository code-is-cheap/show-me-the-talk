import { ConversationElement } from './ConversationElement.js';
import { ConversationElementType, ContentImportance, ContentCategory } from './ConversationElementType.js';
import { SemanticContext } from '../rendering/SemanticContext.js';
import { ToolUse } from './ResponseTypes.js';

/**
 * 工具交互组领域实体
 * 表示一组相关的工具调用和结果
 */
export class ToolInteractionGroup extends ConversationElement {
    public readonly toolUses: ToolUse[];
    public readonly purpose: string;
    public readonly context?: string;
    public readonly isSuccessful: boolean;
    public readonly totalDuration?: number;

    constructor(
        id: string,
        timestamp: Date,
        toolUses: ToolUse[],
        purpose: string,
        context?: string, // 交互上下文说明
        isSuccessful: boolean = true, // 整组交互是否成功
        totalDuration?: number, // 总执行时间（毫秒）
        turnNumber: number = 0
    ) {
        super(id, timestamp, ConversationElementType.TOOL_INTERACTION_GROUP, ContentImportance.SECONDARY, turnNumber);
        this.toolUses = toolUses;
        this.purpose = purpose;
        this.context = context;
        this.isSuccessful = isSuccessful;
        this.totalDuration = totalDuration;
    }

    /**
     * 访问者模式实现
     */
    accept<T>(visitor: { visitToolInteractionGroup(group: ToolInteractionGroup): T }): T {
        return visitor.visitToolInteractionGroup(this);
    }

    /**
     * 获取语义上下文
     */
    getSemanticContext(): SemanticContext {
        return new SemanticContext(
            false, // 非用户发起
            this.hasCodeContent(), // 是否包含代码
            true, // 工具结果
            this.turnNumber, // 对话轮次
            ContentCategory.ACTION, // 操作类型
            this.getRelatedFiles(), // 关联文件
            {
                purpose: this.purpose,
                toolCount: this.toolUses.length,
                isSuccessful: this.isSuccessful,
                hasCriticalOperations: this.hasCriticalOperations(),
                totalDuration: this.totalDuration,
                primaryTool: this.getPrimaryTool()
            }
        );
    }

    /**
     * 获取内容摘要
     */
    getSummary(): string {
        const toolCount = this.toolUses.length;
        const primaryTool = this.getPrimaryTool();
        const purposeIndicator = this.getPurposeIndicator();
        const statusIndicator = this.isSuccessful ? '✅' : '❌';

        let summary = `${toolCount}个工具操作`;
        if (primaryTool) summary += ` (主要: ${primaryTool})`;
        if (this.totalDuration) summary += ` - ${this.totalDuration}ms`;

        return `${purposeIndicator}${statusIndicator} ${summary}`;
    }

    /**
     * 检查是否包含特定类型的内容
     */
    hasContentType(type: string): boolean {
        switch (type) {
            case 'tools':
                return true;
            case 'critical':
                return this.hasCriticalOperations();
            case 'successful':
                return this.isSuccessful;
            case 'failed':
                return !this.isSuccessful;
            case 'file-operations':
                return this.hasFileOperations();
            case 'search-operations':
                return this.hasSearchOperations();
            case 'system-operations':
                return this.hasSystemOperations();
            case 'code':
                return this.hasCodeContent();
            case 'slow':
                return this.isSlow();
            case 'complex':
                return this.isComplex();
            default:
                return this.purpose === type;
        }
    }

    /**
     * 领域方法：获取主要工具
     */
    getPrimaryTool(): string | null {
        if (this.toolUses.length === 0) return null;
        
        // 如果只有一个工具，直接返回
        if (this.toolUses.length === 1) return this.toolUses[0].toolName;
        
        // 统计工具使用频率
        const toolCounts = new Map<string, number>();
        for (const toolUse of this.toolUses) {
            const count = toolCounts.get(toolUse.toolName) || 0;
            toolCounts.set(toolUse.toolName, count + 1);
        }
        
        // 返回使用最多的工具
        let maxCount = 0;
        let primaryTool: string | null = null;
        for (const [tool, count] of toolCounts) {
            if (count > maxCount) {
                maxCount = count;
                primaryTool = tool;
            }
        }
        
        return primaryTool;
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
                return /```|`/.test(result) ||
                    result.includes('function') ||
                    result.includes('class ') ||
                    result.includes('import ') ||
                    result.includes('export ') ||
                    /=>\s*\{/.test(result) || // Arrow functions
                    result.includes('const ') ||
                    result.includes('let ') ||
                    result.includes('var ');
            }
            return false;
        });
    }

    /**
     * 领域方法：检查是否为慢操作
     */
    isSlow(): boolean {
        const slowThreshold = 2000; // 2秒
        return this.totalDuration ? this.totalDuration > slowThreshold : 
            this.toolUses.some(tool => tool.executionTime && tool.executionTime > slowThreshold);
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
        
        for (const toolUse of this.toolUses) {
            const params = toolUse.parameters;
            // 检查常见的文件参数
            if (params.file_path) files.add(params.file_path);
            if (params.notebook_path) files.add(params.notebook_path);
            if (params.path) files.add(params.path);
            
            // 从结果中提取文件路径
            if (typeof toolUse.result === 'string') {
                const fileMatches = toolUse.result.match(/\/[^\s]+\.(js|ts|py|md|json|yaml|yml|toml|ini)/g);
                if (fileMatches) {
                    fileMatches.forEach(file => files.add(file));
                }
            }
        }
        
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
    getToolStatistics(): {
        totalCount: number;
        successfulCount: number;
        failedCount: number;
        criticalCount: number;
        averageExecutionTime: number | null;
        toolBreakdown: Record<string, number>;
    } {
        const statistics = {
            totalCount: this.toolUses.length,
            successfulCount: this.toolUses.filter(tool => tool.isSuccessful).length,
            failedCount: this.toolUses.filter(tool => !tool.isSuccessful).length,
            criticalCount: this.toolUses.filter(tool => tool.isCriticalOperation()).length,
            averageExecutionTime: this.calculateAverageExecutionTime(),
            toolBreakdown: this.getToolBreakdown()
        };
        
        return statistics;
    }

    /**
     * 计算平均执行时间
     */
    calculateAverageExecutionTime(): number | null {
        const timings = this.toolUses
            .map(tool => tool.executionTime)
            .filter((time): time is number => time !== undefined && time > 0); // Filter out invalid times

        if (timings.length === 0) return null;
        
        return Math.round(timings.reduce((sum, time) => sum + time, 0) / timings.length);
    }

    /**
     * 获取工具分解统计
     */
    getToolBreakdown(): Record<string, number> {
        const breakdown: Record<string, number> = {};
        
        for (const toolUse of this.toolUses) {
            const category = toolUse.getToolCategory();
            breakdown[category] = (breakdown[category] || 0) + 1;
        }
        
        return breakdown;
    }

    /**
     * 获取用途指示器
     */
    getPurposeIndicator(): string {
        const indicators: Record<string, string> = {
            'file-management': '📁',
            'code-analysis': '🔍',
            'information-gathering': '📊',
            'system-operation': '⚙️',
            'debugging': '🐛',
            'content-creation': '✨',
            'data-processing': '📈'
        };
        
        return indicators[this.purpose] || '🔧';
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
        const criticalOps = this.getCriticalOperations().length;
        const fileCount = this.getRelatedFiles().length;
        const toolCount = this.toolUses.length;

        if (criticalOps > 2 || fileCount > 10 || toolCount > 10) return 'high';
        if (criticalOps > 0 || fileCount > 3 || toolCount > 5) return 'medium';
        return 'low';
    }

    /**
     * 获取操作摘要文本
     */
    getOperationSummary(): string {
        const purpose = this.purpose.replace('-', ' ');
        const toolCount = this.toolUses.length;
        const status = this.isSuccessful ? 'successful' : 'failed';
        
        return `${purpose} operation with ${toolCount} tools (${status})`;
    }

    /**
     * 检查是否可以重试失败的操作
     */
    canRetryFailedOperations(): boolean {
        const failedOps = this.getFailedOperations();
        return failedOps.length > 0 && failedOps.every(op => !op.isCriticalOperation());
    }

    /**
     * 获取预览内容（用于摘要显示）
     */
    getPreview(maxLength: number = 100): string {
        const summary = this.getOperationSummary();
        if (summary.length <= maxLength) return summary;
        
        return summary.substring(0, maxLength) + '...';
    }

    /**
     * 估算完成时间（分钟）
     */
    estimateCompletionTime(): number {
        if (this.totalDuration) {
            return Math.ceil(this.totalDuration / 60000); // 转换为分钟
        }
        
        // 基于工具数量和类型估算
        const baseTime = this.toolUses.length * 0.5; // 每个工具0.5分钟
        const criticalMultiplier = this.hasCriticalOperations() ? 2 : 1;
        const complexityMultiplier = this.isComplex() ? 1.5 : 1;
        
        return Math.max(1, Math.ceil(baseTime * criticalMultiplier * complexityMultiplier));
    }
}