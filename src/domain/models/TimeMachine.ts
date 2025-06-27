/**
 * Time Machine 功能的核心领域模型
 * 提供对话历史的时间轴导航和快照回放功能
 */

export interface TimelineSnapshot {
    /** 快照ID */
    id: string;
    /** 快照时间戳 */
    timestamp: Date;
    /** 快照标题 */
    title: string;
    /** 快照描述 */
    description?: string;
    /** 快照类型 */
    type: SnapshotType;
    /** 消息索引（在对话中的位置） */
    messageIndex: number;
    /** 是否为关键节点 */
    isKeyPoint: boolean;
    /** 相关文件变更 */
    fileChanges?: FileChange[];
    /** 元数据 */
    metadata?: Record<string, any>;
}

export enum SnapshotType {
    /** 用户提问 */
    USER_QUESTION = 'user-question',
    /** AI 回答 */
    ASSISTANT_RESPONSE = 'assistant-response',
    /** 代码生成 */
    CODE_GENERATION = 'code-generation',
    /** 工具使用 */
    TOOL_USAGE = 'tool-usage',
    /** 错误修复 */
    ERROR_FIX = 'error-fix',
    /** 重要决策点 */
    DECISION_POINT = 'decision-point',
    /** 阶段完成 */
    PHASE_COMPLETION = 'phase-completion'
}

export interface FileChange {
    /** 文件路径 */
    filePath: string;
    /** 变更类型 */
    changeType: 'created' | 'modified' | 'deleted' | 'renamed';
    /** 变更描述 */
    description: string;
    /** 行数变化 */
    linesChanged?: number;
}

export interface TimelineNavigation {
    /** 当前快照索引 */
    currentIndex: number;
    /** 总快照数 */
    totalSnapshots: number;
    /** 当前快照 */
    currentSnapshot: TimelineSnapshot;
    /** 是否可以前进 */
    canGoForward: boolean;
    /** 是否可以后退 */
    canGoBackward: boolean;
    /** 播放状态 */
    isPlaying: boolean;
    /** 播放速度 */
    playbackSpeed: number;
}

export interface TimeMachineState {
    /** 对话ID */
    conversationId: string;
    /** 时间轴快照列表 */
    timeline: TimelineSnapshot[];
    /** 导航状态 */
    navigation: TimelineNavigation;
    /** 过滤条件 */
    filters: TimelineFilters;
    /** 视图配置 */
    viewConfig: TimeMachineViewConfig;
}

export interface TimelineFilters {
    /** 快照类型过滤 */
    snapshotTypes: SnapshotType[];
    /** 只显示关键节点 */
    keyPointsOnly: boolean;
    /** 时间范围过滤 */
    timeRange?: {
        start: Date;
        end: Date;
    };
    /** 文件路径过滤 */
    filePathFilter?: string;
}

export interface TimeMachineViewConfig {
    /** 显示模式 */
    displayMode: 'timeline' | 'list' | 'grid';
    /** 是否显示预览 */
    showPreview: boolean;
    /** 是否显示文件变更 */
    showFileChanges: boolean;
    /** 是否显示元数据 */
    showMetadata: boolean;
    /** 自动播放间隔（毫秒） */
    autoPlayInterval: number;
}

/**
 * Time Machine 核心服务
 * 负责生成时间轴、管理快照和控制回放
 */
export class TimeMachine {
    private state: TimeMachineState;

    constructor(conversationId: string) {
        this.state = {
            conversationId,
            timeline: [],
            navigation: {
                currentIndex: 0,
                totalSnapshots: 0,
                currentSnapshot: this.createEmptySnapshot(),
                canGoForward: false,
                canGoBackward: false,
                isPlaying: false,
                playbackSpeed: 1.0
            },
            filters: {
                snapshotTypes: Object.values(SnapshotType),
                keyPointsOnly: false
            },
            viewConfig: {
                displayMode: 'timeline',
                showPreview: true,
                showFileChanges: true,
                showMetadata: false,
                autoPlayInterval: 2000
            }
        };
    }

    /**
     * 从对话消息生成时间轴快照
     */
    generateTimeline(messages: any[]): TimelineSnapshot[] {
        const snapshots: TimelineSnapshot[] = [];

        messages.forEach((message, index) => {
            const snapshot = this.createSnapshotFromMessage(message, index);
            if (snapshot) {
                snapshots.push(snapshot);
            }
        });

        // 识别关键节点
        this.identifyKeyPoints(snapshots);

        this.state.timeline = snapshots;
        this.state.navigation.totalSnapshots = snapshots.length;

        if (snapshots.length > 0) {
            this.state.navigation.currentSnapshot = snapshots[0];
            this.updateNavigationState();
        }

        return snapshots;
    }

    /**
     * 导航到指定快照
     */
    navigateToSnapshot(index: number): TimelineSnapshot | null {
        if (index < 0 || index >= this.state.timeline.length) {
            return null;
        }

        this.state.navigation.currentIndex = index;
        this.state.navigation.currentSnapshot = this.state.timeline[index];
        this.updateNavigationState();

        return this.state.navigation.currentSnapshot;
    }

    /**
     * 导航到下一个快照
     */
    navigateNext(): TimelineSnapshot | null {
        if (!this.state.navigation.canGoForward) {
            return null;
        }
        return this.navigateToSnapshot(this.state.navigation.currentIndex + 1);
    }

    /**
     * 导航到上一个快照
     */
    navigatePrevious(): TimelineSnapshot | null {
        if (!this.state.navigation.canGoBackward) {
            return null;
        }
        return this.navigateToSnapshot(this.state.navigation.currentIndex - 1);
    }

    /**
     * 跳转到关键节点
     */
    navigateToKeyPoint(direction: 'next' | 'previous'): TimelineSnapshot | null {
        const currentIndex = this.state.navigation.currentIndex;
        const keyPoints = this.state.timeline.filter(s => s.isKeyPoint);

        if (keyPoints.length === 0) return null;

        let targetSnapshot: TimelineSnapshot | null = null;

        if (direction === 'next') {
            targetSnapshot = keyPoints.find(s => s.messageIndex > currentIndex) || null;
        } else {
            const previousKeyPoints = keyPoints.filter(s => s.messageIndex < currentIndex);
            targetSnapshot = previousKeyPoints[previousKeyPoints.length - 1] || null;
        }

        if (targetSnapshot) {
            const targetIndex = this.state.timeline.findIndex(s => s.id === targetSnapshot!.id);
            return this.navigateToSnapshot(targetIndex);
        }

        return null;
    }

    /**
     * 开始自动播放
     */
    startAutoPlay(): void {
        if (this.state.navigation.isPlaying) return;

        this.state.navigation.isPlaying = true;
        this.scheduleNextAutoPlay();
    }

    /**
     * 停止自动播放
     */
    stopAutoPlay(): void {
        this.state.navigation.isPlaying = false;
    }

    /**
     * 设置播放速度
     */
    setPlaybackSpeed(speed: number): void {
        this.state.navigation.playbackSpeed = Math.max(0.1, Math.min(5.0, speed));
    }

    /**
     * 应用过滤条件
     */
    applyFilters(filters: Partial<TimelineFilters>): TimelineSnapshot[] {
        this.state.filters = { ...this.state.filters, ...filters };
        return this.getFilteredTimeline();
    }

    /**
     * 获取过滤后的时间轴
     */
    getFilteredTimeline(): TimelineSnapshot[] {
        let filtered = this.state.timeline;

        // 类型过滤
        if (this.state.filters.snapshotTypes.length < Object.values(SnapshotType).length) {
            filtered = filtered.filter(s => this.state.filters.snapshotTypes.includes(s.type));
        }

        // 关键节点过滤
        if (this.state.filters.keyPointsOnly) {
            filtered = filtered.filter(s => s.isKeyPoint);
        }

        // 时间范围过滤
        if (this.state.filters.timeRange) {
            const { start, end } = this.state.filters.timeRange;
            filtered = filtered.filter(s => s.timestamp >= start && s.timestamp <= end);
        }

        // 文件路径过滤
        if (this.state.filters.filePathFilter) {
            const pathFilter = this.state.filters.filePathFilter.toLowerCase();
            filtered = filtered.filter(s =>
                s.fileChanges?.some(fc => fc.filePath.toLowerCase().includes(pathFilter))
            );
        }

        return filtered;
    }

    /**
     * 获取当前状态
     */
    getState(): TimeMachineState {
        return { ...this.state };
    }

    /**
     * 更新视图配置
     */
    updateViewConfig(config: Partial<TimeMachineViewConfig>): void {
        this.state.viewConfig = { ...this.state.viewConfig, ...config };
    }

    /**
     * 导出时间轴数据
     */
    exportTimeline(): TimelineExportData {
        return {
            conversationId: this.state.conversationId,
            timeline: this.state.timeline,
            exportDate: new Date(),
            totalSnapshots: this.state.timeline.length,
            keyPointsCount: this.state.timeline.filter(s => s.isKeyPoint).length,
            filters: this.state.filters,
            viewConfig: this.state.viewConfig
        };
    }

    /**
     * 从消息创建快照
     */
    private createSnapshotFromMessage(message: any, index: number): TimelineSnapshot | null {
        const id = `snapshot-${index}-${Date.now()}`;
        const timestamp = new Date(message.timestamp);

        let type: SnapshotType;
        let title: string;
        let description: string | undefined;

        if (message.type === 'user') {
            type = SnapshotType.USER_QUESTION;
            title = this.extractQuestionTitle(message.content);
            description = this.truncateText(message.content, 100);
        } else {
            // Assistant message
            if (this.hasCodeGeneration(message)) {
                type = SnapshotType.CODE_GENERATION;
                title = 'Code Generation';
            } else if (this.hasToolUsage(message)) {
                type = SnapshotType.TOOL_USAGE;
                title = 'Tool Usage';
            } else if (this.hasErrorFix(message)) {
                type = SnapshotType.ERROR_FIX;
                title = 'Error Fix';
            } else {
                type = SnapshotType.ASSISTANT_RESPONSE;
                title = 'Assistant Response';
            }
            
            description = this.truncateText(message.content, 100);
        }

        const fileChanges = this.extractFileChanges(message);

        return {
            id,
            timestamp,
            title,
            description,
            type,
            messageIndex: index,
            isKeyPoint: false, // 将在后续步骤中识别
            fileChanges,
            metadata: message.metadata
        };
    }

    /**
     * 识别关键节点
     */
    private identifyKeyPoints(snapshots: TimelineSnapshot[]): void {
        snapshots.forEach((snapshot, index) => {
            // 关键节点识别规则
            snapshot.isKeyPoint =
                snapshot.type === SnapshotType.CODE_GENERATION ||
                snapshot.type === SnapshotType.ERROR_FIX ||
                snapshot.type === SnapshotType.DECISION_POINT ||
                (snapshot.fileChanges && snapshot.fileChanges.length > 0) ||
                this.isSignificantResponse(snapshot, snapshots, index);
        });
    }

    /**
     * 判断是否为重要回答
     */
    private isSignificantResponse(snapshot: TimelineSnapshot, allSnapshots: TimelineSnapshot[], index: number): boolean {
        // 如果回答很长，可能是重要的
        if (snapshot.description && snapshot.description.length > 200) {
            return true;
        }

        // 如果是第一个或最后一个快照
        if (index === 0 || index === allSnapshots.length - 1) {
            return true;
        }

        // 如果与前一个快照时间间隔较长
        if (index > 0) {
            const timeDiff = snapshot.timestamp.getTime() - allSnapshots[index - 1].timestamp.getTime();
            if (timeDiff > 300000) { // 5分钟
                return true;
            }
        }

        return false;
    }

    /**
     * 更新导航状态
     */
    private updateNavigationState(): void {
        const current = this.state.navigation.currentIndex;
        const total = this.state.navigation.totalSnapshots;

        this.state.navigation.canGoBackward = current > 0;
        this.state.navigation.canGoForward = current < total - 1;
    }

    /**
     * 安排下一次自动播放
     */
    private scheduleNextAutoPlay(): void {
        if (!this.state.navigation.isPlaying) return;

        const interval = this.state.viewConfig.autoPlayInterval / this.state.navigation.playbackSpeed;

        setTimeout(() => {
            if (this.state.navigation.isPlaying) {
                const next = this.navigateNext();
                if (next) {
                    this.scheduleNextAutoPlay();
                } else {
                    this.stopAutoPlay(); // 到达末尾，停止播放
                }
            }
        }, interval);
    }

    /**
     * 创建空快照
     */
    private createEmptySnapshot(): TimelineSnapshot {
        return {
            id: 'empty',
            timestamp: new Date(),
            title: 'No snapshots',
            type: SnapshotType.USER_QUESTION,
            messageIndex: 0,
            isKeyPoint: false
        };
    }

    /**
     * 提取问题标题
     */
    private extractQuestionTitle(content: string): string {
        // 提取第一句话作为标题
        const firstSentence = content.split(/[.!?]/)[0];
        return this.truncateText(firstSentence, 50);
    }

    /**
     * 截断文本
     */
    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * 检查是否包含代码生成
     */
    private hasCodeGeneration(message: any): boolean {
        return message.content && (
            message.content.includes('```') ||
            message.content.includes('function ') ||
            message.content.includes('class ') ||
            message.content.includes('import ')
        );
    }

    /**
     * 检查是否包含工具使用
     */
    private hasToolUsage(message: any): boolean {
        return message.metadata?.toolUses && message.metadata.toolUses.length > 0;
    }

    /**
     * 检查是否包含错误修复
     */
    private hasErrorFix(message: any): boolean {
        const content = message.content?.toLowerCase() || '';
        return content.includes('error') ||
               content.includes('fix') ||
               content.includes('bug') ||
               content.includes('issue');
    }

    /**
     * 提取文件变更信息
     */
    private extractFileChanges(message: any): FileChange[] | undefined {
        const changes: FileChange[] = [];

        // 从工具使用中提取文件变更
        if (message.metadata?.toolUses) {
            message.metadata.toolUses.forEach((tool: any) => {
                // 适配新的ToolUseDto结构：{id, name, input}
                const toolName = tool.name;
                const toolInput = tool.input || tool.parameters || {};

                if (toolName === 'edit_file' || toolName === 'create_file' || toolName === 'Edit' || toolName === 'Write') {
                    changes.push({
                        filePath: toolInput.file_path || toolInput.target_file || toolInput.path || 'unknown',
                        changeType: (toolName === 'create_file' || toolName === 'Write') ? 'created' : 'modified',
                        description: `${toolName}: ${toolInput.instructions || toolInput.content || 'File operation'}`
                    });
                } else if (toolName === 'delete_file' || toolName === 'Delete') {
                    changes.push({
                        filePath: toolInput.file_path || toolInput.target_file || 'unknown',
                        changeType: 'deleted',
                        description: 'File deleted'
                    });
                } else if (toolName === 'Read' || toolName === 'read_file') {
                    // 读取文件也算作一种文件操作
                    changes.push({
                        filePath: toolInput.file_path || toolInput.path || 'unknown',
                        changeType: 'modified',
                        description: `${toolName}: File accessed`
                    });
                }
            });
        }

        return changes.length > 0 ? changes : undefined;
    }
}

/**
 * 时间轴导出数据
 */
export interface TimelineExportData {
    conversationId: string;
    timeline: TimelineSnapshot[];
    exportDate: Date;
    totalSnapshots: number;
    keyPointsCount: number;
    filters: TimelineFilters;
    viewConfig: TimeMachineViewConfig;
}