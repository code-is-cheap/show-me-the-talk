/**
 * 响应类型枚举
 * 根据内容和工具使用情况分类助手响应
 */
export type ResponseType = 'explanation' | 'code-solution' | 'guidance' | 'analysis' | 'mixed' | 'correction' | 'confirmation';

/**
 * Token使用统计
 */
export class TokenUsage {
    constructor(
        public readonly inputTokens: number,
        public readonly outputTokens: number,
        public readonly totalTokens: number = inputTokens + outputTokens
    ) {}

    /**
     * 计算成本效率（输出/输入比率）
     */
    getCostEfficiency(): number {
        return this.inputTokens > 0 ? this.outputTokens / this.inputTokens : 0;
    }

    /**
     * 检查是否为高成本回答
     */
    isHighCost(threshold: number = 5000): boolean {
        return this.totalTokens > threshold;
    }

    /**
     * 获取响应详细程度
     */
    getVerbosity(): 'concise' | 'moderate' | 'verbose' {
        if (this.outputTokens < 500) return 'concise';
        if (this.outputTokens < 2000) return 'moderate';
        return 'verbose';
    }

    /**
     * 转换为JSON表示
     */
    toJSON(): Record<string, number> {
        return {
            inputTokens: this.inputTokens,
            outputTokens: this.outputTokens,
            totalTokens: this.totalTokens
        };
    }
}

/**
 * 工具使用记录
 */
export class ToolUse {
    constructor(
        public readonly id: string,
        public readonly toolName: string,
        public readonly parameters: Record<string, any>,
        public readonly result?: any,
        public readonly isSuccessful: boolean = true,
        public readonly executionTime?: number, // 毫秒
        public readonly errorMessage?: string
    ) {}

    /**
     * 获取工具类型分类
     */
    getToolCategory(): 'file-operation' | 'search' | 'analysis' | 'system' | 'communication' | 'other' {
        const fileOps = ['Read', 'Write', 'Edit', 'LS', 'MultiEdit'];
        const searchOps = ['Grep', 'Glob', 'WebSearch'];
        const analysisOps = ['Bash', 'NotebookRead'];
        const systemOps = ['mcp__'];
        const commOps = ['WebFetch'];

        if (fileOps.some(op => this.toolName.includes(op))) return 'file-operation';
        if (searchOps.some(op => this.toolName.includes(op))) return 'search';
        if (analysisOps.some(op => this.toolName.includes(op))) return 'analysis';
        if (systemOps.some(op => this.toolName.includes(op))) return 'system';
        if (commOps.some(op => this.toolName.includes(op))) return 'communication';
        return 'other';
    }

    /**
     * 获取参数摘要
     */
    getParameterSummary(): string {
        const keys = Object.keys(this.parameters);
        if (keys.length === 0) return 'No parameters';
        
        const summary = keys.slice(0, 3).map(key => {
            const value = this.parameters[key];
            if (typeof value === 'string' && value.length > 30) {
                return `${key}: "${value.substring(0, 30)}..."`;
            }
            return `${key}: ${JSON.stringify(value)}`;
        }).join(', ');
        
        return keys.length > 3 ? `${summary} (+${keys.length - 3} more)` : summary;
    }

    /**
     * 检查是否为关键操作
     */
    isCriticalOperation(): boolean {
        const criticalOps = ['Write', 'Edit', 'MultiEdit', 'Bash'];
        return criticalOps.some(op => this.toolName.includes(op));
    }

    /**
     * 转换为JSON表示
     */
    toJSON(): Record<string, any> {
        return {
            id: this.id,
            toolName: this.toolName,
            parameters: this.parameters,
            result: this.result,
            isSuccessful: this.isSuccessful,
            executionTime: this.executionTime,
            errorMessage: this.errorMessage
        };
    }
}