import { Message } from '../../../domain/models/Message.js';
import { MessageBlockType, TimelineDataBuilder, TimelineLayoutCalculator } from '../../../domain/models/timeline/index.js';

/**
 * 时间轴主题颜色配置
 */
export interface TimelineTheme {
    user: string;
    assistant: string;
    tool: string;
    current: string;
    keyPoint: string;
    border: string;
    text: string;
    reset: string;
}

/**
 * 时间轴渲染配置
 */
export interface TimelineRenderConfig {
    maxWidth: number;
    showBorder: boolean;
    showPositionIndicator: boolean;
    compactMode: boolean;
    enableScrollIndicators: boolean;
    theme: TimelineTheme;
}

/**
 * 默认时间轴主题
 */
const DEFAULT_THEME: TimelineTheme = {
    user: '\x1b[34m',      // 蓝色
    assistant: '\x1b[32m', // 绿色
    tool: '\x1b[33m',      // 黄色
    current: '\x1b[43m',   // 黄色背景
    keyPoint: '\x1b[1m',   // 加粗
    border: '\x1b[90m',    // 灰色
    text: '\x1b[37m',      // 白色
    reset: '\x1b[0m'       // 重置
};

/**
 * 可视化时间轴渲染器
 * 负责将时间轴数据渲染为ASCII艺术格式
 */
export class VisualTimelineRenderer {
    private readonly config: TimelineRenderConfig;
    private readonly theme: TimelineTheme;

    constructor(config: Partial<TimelineRenderConfig> = {}) {
        this.config = {
            maxWidth: 80,
            showBorder: true,
            showPositionIndicator: true,
            compactMode: false,
            enableScrollIndicators: true,
            theme: DEFAULT_THEME,
            ...config
        };
        this.theme = this.config.theme;
    }

    /**
     * 渲染时间轴
     * 主要入口方法
     */
    renderTimeline(messages: readonly Message[], currentMessageIndex: number): string[] {
        if (!messages || messages.length === 0) {
            return this.renderEmptyTimeline();
        }

        // 构建时间轴数据
        const timelineData = TimelineDataBuilder.build(messages, currentMessageIndex);

        // 计算布局
        const layoutConfig = {
            maxWidth: this.config.maxWidth - (this.config.showBorder ? 4 : 0), // 为边框留空间
            showSegments: false, // Phase 1 不显示分段
            compactMode: this.config.compactMode,
            highlightCurrent: true
        };

        const layout = TimelineLayoutCalculator.calculate(
            timelineData.messageBlocks,
            currentMessageIndex,
            layoutConfig
        );

        return this.renderTimelineLayout(layout, currentMessageIndex);
    }

    /**
     * 渲染空时间轴
     */
    private renderEmptyTimeline(): string[] {
        const width = this.config.maxWidth;
        const emptyMessage = 'No messages to display';
        const padding = Math.floor((width - emptyMessage.length - 4) / 2);

        if (this.config.showBorder) {
            return [
                this.theme.border + '┌' + '─'.repeat(width - 2) + '┐' + this.theme.reset,
                this.theme.border + '│' + ' '.repeat(padding) + emptyMessage + ' '.repeat(width - 2 - padding - emptyMessage.length) + '│' + this.theme.reset,
                this.theme.border + '└' + '─'.repeat(width - 2) + '┘' + this.theme.reset
            ];
        } else {
            return [' '.repeat(padding) + emptyMessage];
        }
    }

    /**
     * 渲染时间轴布局
     */
    private renderTimelineLayout(layout: any, currentIndex: number): string[] {
        const lines: string[] = [];
        const contentWidth = this.config.maxWidth - (this.config.showBorder ? 4 : 0);

        // 上边框
        if (this.config.showBorder) {
            lines.push(this.theme.border + '┌' + '─'.repeat(this.config.maxWidth - 2) + '┐' + this.theme.reset);
        }

        // 消息块行
        const timelineBar = this.renderMessageBlocks(layout, currentIndex, contentWidth);
        if (this.config.showBorder) {
            lines.push(this.theme.border + '│ ' + timelineBar.padEnd(contentWidth) + ' │' + this.theme.reset);
        } else {
            lines.push(timelineBar);
        }

        // 位置指示器行
        if (this.config.showPositionIndicator) {
            const positionIndicator = this.renderPositionIndicator(layout, contentWidth);
            if (this.config.showBorder) {
                lines.push(this.theme.border + '│ ' + positionIndicator.padEnd(contentWidth) + ' │' + this.theme.reset);
            } else {
                lines.push(positionIndicator);
            }
        }

        // 滚动指示器行
        if (this.config.enableScrollIndicators && layout.needsScrollIndicator) {
            const scrollIndicator = this.renderScrollIndicator(layout, contentWidth);
            if (this.config.showBorder) {
                lines.push(this.theme.border + '│ ' + scrollIndicator.padEnd(contentWidth) + ' │' + this.theme.reset);
            } else {
                lines.push(scrollIndicator);
            }
        }

        // 下边框
        if (this.config.showBorder) {
            lines.push(this.theme.border + '└' + '─'.repeat(this.config.maxWidth - 2) + '┘' + this.theme.reset);
        }

        return lines;
    }

    /**
     * 渲染消息块
     */
    private renderMessageBlocks(layout: any, currentIndex: number, maxWidth: number): string {
        let result = '';
        let currentWidth = 0;

        for (const block of layout.visibleBlocks) {
            if (currentWidth + block.width > maxWidth) {
                break; // 超出可显示宽度
            }

            const blockString = this.renderSingleBlock(block, block.messageIndex === currentIndex);
            result += blockString;
            currentWidth += block.width;
        }

        return result;
    }

    /**
     * 渲染单个消息块
     */
    private renderSingleBlock(block: any, isCurrent: boolean): string {
        const blockChar = this.getBlockCharacter(block.type);
        const color = this.getBlockColor(block.type);

        let blockString = blockChar.repeat(block.width);

        // 应用颜色
        blockString = color + blockString + this.theme.reset;

        // 当前位置高亮
        if (isCurrent) {
            blockString = this.theme.current + blockString + this.theme.reset;
        }

        // 关键点标记
        if (block.isKeyPoint) {
            blockString = this.theme.keyPoint + blockString + this.theme.reset;
        }

        return blockString;
    }

    /**
     * 获取消息块字符
     */
    private getBlockCharacter(type: MessageBlockType): string {
        switch (type) {
            case MessageBlockType.USER:
                return '█';
            case MessageBlockType.ASSISTANT:
                return '█';
            case MessageBlockType.TOOL_USE:
                return '▲';
            default:
                return '█';
        }
    }

    /**
     * 获取消息块颜色
     */
    private getBlockColor(type: MessageBlockType): string {
        switch (type) {
            case MessageBlockType.USER:
                return this.theme.user;
            case MessageBlockType.ASSISTANT:
                return this.theme.assistant;
            case MessageBlockType.TOOL_USE:
                return this.theme.tool;
            default:
                return this.theme.text;
        }
    }

    /**
     * 渲染位置指示器
     */
    private renderPositionIndicator(layout: any, maxWidth: number): string {
        const position = layout.currentPositionInView;
        if (position < 0 || position >= maxWidth) {
            return ''; // 当前位置不在可见范围内
        }

        const indicator = '▲';
        const leftPadding = ' '.repeat(position);
        const rightPadding = ' '.repeat(Math.max(0, maxWidth - position - indicator.length));

        return leftPadding + this.theme.current + indicator + this.theme.reset + rightPadding;
    }

    /**
     * 渲染滚动指示器
     */
    private renderScrollIndicator(layout: any, maxWidth: number): string {
        const { scrollDirection } = layout;

        let indicator = '';
        switch (scrollDirection) {
            case 'left':
                indicator = '← More messages';
                break;
            case 'right':
                indicator = 'More messages →';
                break;
            case 'both':
                indicator = '← More messages →';
                break;
            default:
                return '';
        }

        const padding = Math.max(0, Math.floor((maxWidth - indicator.length) / 2));
        return ' '.repeat(padding) + this.theme.text + indicator + this.theme.reset;
    }

    /**
     * 更新渲染配置
     */
    updateConfig(newConfig: Partial<TimelineRenderConfig>): void {
        Object.assign(this.config, newConfig);
    }

    /**
     * 设置主题
     */
    setTheme(theme: Partial<TimelineTheme>): void {
        Object.assign(this.config.theme, theme);
    }

    /**
     * 渲染消息统计信息
     */
    renderStats(messages: readonly Message[], currentIndex: number): string {
        const total = messages.length;
        const current = currentIndex + 1;
        const userCount = messages.filter(m => m.getType() === 'user').length;
        const assistantCount = messages.filter(m => m.getType() === 'assistant').length;

        return `Message ${current}/${total} (${userCount} user, ${assistantCount} assistant)`;
    }

    /**
     * 渲染简化版时间轴（用于状态栏等）
     */
    renderCompact(messages: readonly Message[], currentIndex: number, maxWidth: number): string {
        const compactRenderer = new VisualTimelineRenderer({
            maxWidth,
            showBorder: false,
            showPositionIndicator: false,
            compactMode: true,
            enableScrollIndicators: false,
            theme: this.theme
        });

        const lines = compactRenderer.renderTimeline(messages, currentIndex);
        return lines[0] || '';
    }
}