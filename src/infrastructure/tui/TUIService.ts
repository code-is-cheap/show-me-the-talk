import { ConversationApplicationService } from '../../application/services/ConversationApplicationService.js';
import { ExportRepository } from '../../domain/repositories/ExportRepository.js';
import { EnvironmentValidator } from '../environment/EnvironmentValidator.js';

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
    createTUI(options: TUIOptions = {}): ITUIController {
        // 动态导入，避免循环依赖
        const createInkTUI = async () => {
            const { ComprehensiveInkTUI } = await import('../../presentation/tui/ComprehensiveInkTUI.js');
            const inkTUI = new ComprehensiveInkTUI(this.conversationService, {
                claudeDir: options.defaultClaudePath || '',
                debug: options.debug || false
            });

            // Wrap in ITUIController interface
            return {
                async start(): Promise<void> {
                    await inkTUI.start();
                },
                stop(): void {
                    // ComprehensiveInkTUI doesn't have stop method, but process will exit naturally
                },
                isRunning(): boolean {
                    return false; // Ink TUI manages its own lifecycle
                }
            };
        };

        // 返回懒加载的TUI控制器
        let tuiInstance: ITUIController | null = null;
        return {
            async start(): Promise<void> {
                if (!tuiInstance) {
                    tuiInstance = await createInkTUI();
                }
                await tuiInstance.start();
            },
            stop(): void {
                if (tuiInstance) {
                    tuiInstance.stop();
                }
            },
            isRunning(): boolean {
                return tuiInstance ? tuiInstance.isRunning() : false;
            }
        };
    }

    /**
     * 启动交互式模式 - 便利方法
     */
    async startInteractiveMode(options: TUIOptions = {}): Promise<void> {
        const tui = this.createTUI(options);
        await tui.start();
    }

    /**
     * 检查TUI环境是否准备就绪
     */
    isReady(): boolean {
        const validator = EnvironmentValidator.getInstance();
        // 使用统一的环境验证
        if (!validator.isTTYAvailable()) {
            return false;
        }

        // 检查必要的依赖服务
        if (!this.conversationService || !this.exportRepository) {
            return false;
        }

        return true;
    }

    /**
     * 获取终端信息
     */
    getTerminalInfo(): { width: number; height: number; colors: number } {
        const validator = EnvironmentValidator.getInstance();
        const terminalSize = validator.getTerminalSize();
        const colorSupport = validator.getColorSupport();

        return {
            width: terminalSize.width,
            height: terminalSize.height,
            colors: colorSupport.depth
        };
    }

    /**
     * 验证TUI环境
     */
    validateEnvironment(): { isValid: boolean; issues: string[] } {
        const validator = EnvironmentValidator.getInstance();
        const envValidation = validator.validateTUIEnvironment();

        // 添加服务可用性检查到环境验证
        const issues = [...envValidation.issues];

        if (!this.conversationService) {
            issues.push('ConversationApplicationService not available');
        }

        if (!this.exportRepository) {
            issues.push('FileExportService not available');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }
}