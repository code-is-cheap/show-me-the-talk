import { MessageBlock } from './MessageBlock.js';

/**
 * 时间轴布局配置
 */
export interface TimelineLayoutConfig {
    maxWidth: number;
    showSegments: boolean;
    compactMode: boolean;
    highlightCurrent: boolean;
}

/**
 * 时间轴渲染布局
 */
export interface TimelineLayout {
    visibleBlocks: MessageBlock[];
    startIndex: number;
    endIndex: number;
    currentPositionInView: number;
    needsScrollIndicator: boolean;
    scrollDirection: 'left' | 'right' | 'both' | 'none';
}

/**
 * 时间轴布局计算器
 */
export class TimelineLayoutCalculator {
    /**
     * 计算时间轴布局
     */
    static calculate(
        blocks: MessageBlock[], 
        currentIndex: number, 
        config: TimelineLayoutConfig
    ): TimelineLayout {
        // 计算每个块的累积位置
        const blockPositions = this.calculateBlockPositions(blocks);
        
        // 如果总宽度小于等于最大宽度，显示所有块
        const totalWidth = blockPositions[blockPositions.length - 1] || 0;
        if (totalWidth <= config.maxWidth) {
            return {
                visibleBlocks: blocks,
                startIndex: 0,
                endIndex: blocks.length - 1,
                currentPositionInView: blockPositions[currentIndex] || 0,
                needsScrollIndicator: false,
                scrollDirection: 'none'
            };
        }
        
        // 需要滚动时，计算滚动布局
        return this.calculateScrollLayout(blocks, blockPositions, currentIndex, config);
    }

    /**
     * 计算每个块的累积位置
     */
    private static calculateBlockPositions(blocks: MessageBlock[]): number[] {
        const positions: number[] = [];
        let currentPosition = 0;
        
        for (const block of blocks) {
            positions.push(currentPosition + block.width / 2); // 块的中心位置
            currentPosition += block.width;
        }
        
        return positions;
    }

    /**
     * 计算滚动布局
     */
    private static calculateScrollLayout(
        blocks: MessageBlock[],
        blockPositions: number[],
        currentIndex: number,
        config: TimelineLayoutConfig
    ): TimelineLayout {
        const currentPosition = blockPositions[currentIndex] || 0;
        const maxWidth = config.maxWidth;
        
        // 计算视口的中心位置
        const viewportCenter = maxWidth / 2;
        
        // 确定视口的开始和结束位置
        const viewportStart = Math.max(0, currentPosition - viewportCenter);
        const viewportEnd = viewportStart + maxWidth;
        
        // 找到在视口内的块
        let startIndex = 0;
        let endIndex = blocks.length - 1;
        
        for (let i = 0; i < blocks.length; i++) {
            const blockStart = blockPositions[i] - blocks[i].width / 2;
            const blockEnd = blockPositions[i] + blocks[i].width / 2;
            
            if (blockEnd >= viewportStart && startIndex === 0) {
                startIndex = i;
            }
            if (blockStart <= viewportEnd) {
                endIndex = i;
            }
        }
        
        const visibleBlocks = blocks.slice(startIndex, endIndex + 1);
        const currentPositionInView = currentPosition - viewportStart;
        
        // 确定滚动方向指示器
        let scrollDirection: 'left' | 'right' | 'both' | 'none' = 'none';
        if (startIndex > 0 && endIndex < blocks.length - 1) {
            scrollDirection = 'both';
        } else if (startIndex > 0) {
            scrollDirection = 'left';
        } else if (endIndex < blocks.length - 1) {
            scrollDirection = 'right';
        }
        
        return {
            visibleBlocks,
            startIndex,
            endIndex,
            currentPositionInView,
            needsScrollIndicator: true,
            scrollDirection
        };
    }

    /**
     * 计算适应指定宽度的布局
     */
    static calculateFitToWidth(
        blocks: MessageBlock[], 
        currentIndex: number, 
        targetWidth: number
    ): TimelineLayout {
        const config: TimelineLayoutConfig = {
            maxWidth: targetWidth,
            showSegments: false,
            compactMode: true,
            highlightCurrent: true
        };
        
        return this.calculate(blocks, currentIndex, config);
    }
}

/**
 * 时间轴滚动管理器
 */
export class TimelineScrollManager {
    /**
     * 计算滚动到指定消息索引的布局
     */
    static scrollToMessage(
        blocks: MessageBlock[], 
        targetIndex: number, 
        maxWidth: number
    ): TimelineLayout {
        const config: TimelineLayoutConfig = {
            maxWidth,
            showSegments: false,
            compactMode: false,
            highlightCurrent: true
        };
        
        return TimelineLayoutCalculator.calculate(blocks, targetIndex, config);
    }

    /**
     * 计算向左滚动的布局
     */
    static scrollLeft(
        currentLayout: TimelineLayout, 
        blocks: MessageBlock[], 
        maxWidth: number, 
        scrollAmount: number = 3
    ): TimelineLayout {
        const newStartIndex = Math.max(0, currentLayout.startIndex - scrollAmount);
        const targetIndex = Math.max(newStartIndex, currentLayout.startIndex);
        
        return this.scrollToMessage(blocks, targetIndex, maxWidth);
    }

    /**
     * 计算向右滚动的布局
     */
    static scrollRight(
        currentLayout: TimelineLayout, 
        blocks: MessageBlock[], 
        maxWidth: number, 
        scrollAmount: number = 3
    ): TimelineLayout {
        const newEndIndex = Math.min(blocks.length - 1, currentLayout.endIndex + scrollAmount);
        const targetIndex = Math.min(newEndIndex, currentLayout.endIndex);
        
        return this.scrollToMessage(blocks, targetIndex, maxWidth);
    }
}