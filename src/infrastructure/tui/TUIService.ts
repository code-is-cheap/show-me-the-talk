import { ConversationApplicationService } from '../../application/services/ConversationApplicationService.js';
import { ExportRepository } from '../../domain/repositories/ExportRepository.js';

/**
 * TUI控制器接口 - 清晰的抽象
 */
export interface ITUIController {
    start(): Promise<void>;
    stop(): void;
    isRunning(): boolean;
}

/**
 * TUI选项配置
 */
export interface TUIOptions {
    /** 是否启用调试模式 */
    debug?: boolean;
    /** 默认的Claude目录路径 */
    defaultClaudePath?: string;
    /** 终端类型 */
    terminalType?: 'standard' | 'warp';
}

/**
 * Terminal UI服务 - 纯粹的工厂和协调器
 * 职责：创建和配置TUI实例，不包含具体实现逻辑
 */
export class TUIService {
    constructor(
        private readonly conversationService: ConversationApplicationService,
        private readonly exportRepository: ExportRepository
    ) {}

    /**
     * 创建TUI控制器实例 - 工厂方法
     */
    createTUI(options?: TUIOptions): ITUIController {
        // Basic mock implementation for now
        return {
            start: async () => {
                console.log('TUI would start here...');
            },
            stop: () => {
                console.log('TUI would stop here...');
            },
            isRunning: () => false
        };
    }

    /**
     * 启动交互式模式 - 便利方法
     */
    async startInteractiveMode(options?: TUIOptions): Promise<void> {
        const tui = this.createTUI(options);
        await tui.start();
    }

    /**
     * 检查TUI环境是否准备就绪
     */
    isReady(): boolean {
        return process.stdout.isTTY === true;
    }

    /**
     * 获取终端信息
     */
    getTerminalInfo(): { width: number; height: number; colors: number } {
        return {
            width: process.stdout.columns || 80,
            height: process.stdout.rows || 24,
            colors: process.stdout.getColorDepth?.() || 8
        };
    }

    /**
     * 验证TUI环境
     */
    validateEnvironment(): { isValid: boolean; issues: string[] } {
        const issues: string[] = [];

        if (!process.stdout.isTTY) {
            issues.push('Not running in a terminal environment');
        }

        if (!process.stdout.columns || process.stdout.columns < 40) {
            issues.push('Terminal width too narrow (minimum 40 columns)');
        }

        if (!process.stdout.rows || process.stdout.rows < 10) {
            issues.push('Terminal height too short (minimum 10 rows)');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }
}