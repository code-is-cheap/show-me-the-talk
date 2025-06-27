/**
 * 统一环境验证器 - 消除重复的环境检查逻辑
 * 遵循单例模式，提供缓存机制，确保一致性
 */

export interface EnvironmentInfo {
    isTTY: boolean;
    canBypassTTY: boolean;
    terminalSize: {
        width: number;
        height: number;
        meetsMinimumRequirements: boolean;
    };
    colorSupport: {
        level: number;
        hasColors: boolean;
        depth: number;
    };
    terminalType: {
        isWarp: boolean;
        type: string;
        program: string;
    };
    environment: {
        nodeEnv: string;
        bypassTTY: boolean;
        colorterm: string;
        term: string;
    };
    platform: {
        os: NodeJS.Platform;
        nodeVersion: string;
    };
}

export interface ValidationResult {
    isValid: boolean;
    issues: string[];
    warnings: string[];
    info: EnvironmentInfo;
}

export class EnvironmentValidator {
    private static instance: EnvironmentValidator;
    private cachedInfo: EnvironmentInfo | null = null;

    static getInstance(): EnvironmentValidator {
        if (!EnvironmentValidator.instance) {
            EnvironmentValidator.instance = new EnvironmentValidator();
        }
        return EnvironmentValidator.instance;
    }

    /**
     * 获取完整的环境信息（使用缓存）
     */
    getEnvironmentInfo(): EnvironmentInfo {
        if (!this.cachedInfo) {
            this.cachedInfo = this.detectEnvironment();
        }
        return this.cachedInfo;
    }

    /**
     * 验证TUI环境
     */
    validateTUIEnvironment(): ValidationResult {
        const info = this.getEnvironmentInfo();
        const issues: string[] = [];
        const warnings: string[] = [];

        // TTY检查
        if (!info.isTTY && !info.canBypassTTY) {
            issues.push('Not running in a TTY environment');
            issues.push('Set SMTT_BYPASS_TTY=true or NODE_ENV=development to bypass');
        }

        // 终端尺寸检查
        if (!info.terminalSize.meetsMinimumRequirements) {
            if (info.terminalSize.width < 80) {
                issues.push(`Terminal width is too narrow (${info.terminalSize.width} < 80 columns required)`);
            }
            if (info.terminalSize.height < 20) {
                issues.push(`Terminal height is too short (${info.terminalSize.height} < 20 rows required)`);
            }
        }

        // 颜色支持警告
        if (!info.colorSupport.hasColors) {
            warnings.push('Terminal does not support colors - using plain text mode');
        }

        // Warp终端特殊处理
        if (info.terminalType.isWarp) {
            warnings.push('Warp terminal detected - using compatible rendering mode');
        }

        // Node.js版本检查
        const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
        if (nodeVersion < 18) {
            issues.push(`Node.js version ${process.version} is not supported (minimum: v18.0.0)`);
        }

        return {
            isValid: issues.length === 0,
            issues,
            warnings,
            info
        };
    }

    /**
     * 简化的TTY检查方法
     */
    isTTYAvailable(): boolean {
        const info = this.getEnvironmentInfo();
        return info.isTTY || info.canBypassTTY;
    }

    /**
     * 获取终端尺寸（带默认值）
     */
    getTerminalSize(): { width: number; height: number } {
        const info = this.getEnvironmentInfo();
        return {
            width: info.terminalSize.width,
            height: info.terminalSize.height
        };
    }

    /**
     * 检查是否为Warp终端
     */
    isWarpTerminal(): boolean {
        return this.getEnvironmentInfo().terminalType.isWarp;
    }

    /**
     * 获取颜色支持级别
     */
    getColorSupport(): { hasColors: boolean; depth: number } {
        const info = this.getEnvironmentInfo();
        return {
            hasColors: info.colorSupport.hasColors,
            depth: info.colorSupport.depth
        };
    }

    /**
     * 检测完整环境信息
     */
    private detectEnvironment(): EnvironmentInfo {
        return {
            isTTY: this.detectTTY(),
            canBypassTTY: this.canBypassTTY(),
            terminalSize: this.detectTerminalSize(),
            colorSupport: this.detectColorSupport(),
            terminalType: this.detectTerminalType(),
            environment: this.getEnvironmentVariables(),
            platform: this.getPlatformInfo()
        };
    }

    private detectTTY(): boolean {
        return Boolean(process.stdout.isTTY && process.stdin.isTTY);
    }

    private canBypassTTY(): boolean {
        return process.env.SMTT_BYPASS_TTY === 'true' ||
            process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'test';
    }

    private detectTerminalSize(): EnvironmentInfo['terminalSize'] {
        const width = process.stdout.columns || 80;
        const height = process.stdout.rows || 24;

        return {
            width,
            height,
            meetsMinimumRequirements: width >= 80 && height >= 20
        };
    }

    private detectColorSupport(): EnvironmentInfo['colorSupport'] {
        let level = 0;
        let depth = 0;

        // 检测颜色支持级别
        if (process.env.COLORTERM === 'truecolor') {
            level = 3;
            depth = 24;
        }
        else if (process.env.TERM?.includes('256')) {
            level = 2;
            depth = 8;
        }
        else if (process.env.TERM?.includes('color')) {
            level = 1;
            depth = 4;
        }
        else if (process.stdout.hasColors && process.stdout.hasColors()) {
            level = 1;
            depth = process.stdout.getColorDepth ? process.stdout.getColorDepth() : 4;
        }
        else if (process.stdout.getColorDepth) {
            depth = process.stdout.getColorDepth();
            level = depth > 1 ? 1 : 0;
        }

        return {
            level,
            hasColors: level > 0,
            depth: Math.max(depth, level > 0 ? 4 : 0)
        };
    }

    private detectTerminalType(): EnvironmentInfo['terminalType'] {
        const program = process.env.TERM_PROGRAM || 'unknown';
        const isWarp = program === 'WarpTerminal' ||
            process.env.WARP_IS_LOCAL_SHELL_SESSION === '1';

        return {
            isWarp,
            type: isWarp ? 'warp' : 'standard',
            program
        };
    }

    private getEnvironmentVariables(): EnvironmentInfo['environment'] {
        return {
            nodeEnv: process.env.NODE_ENV || 'production',
            bypassTTY: process.env.SMTT_BYPASS_TTY === 'true',
            colorterm: process.env.COLORTERM || '',
            term: process.env.TERM || ''
        };
    }

    private getPlatformInfo(): EnvironmentInfo['platform'] {
        return {
            os: process.platform,
            nodeVersion: process.version
        };
    }

    /**
     * 刷新缓存的环境信息（用于环境变化时）
     */
    refreshEnvironmentInfo(): void {
        this.cachedInfo = null;
    }

    /**
     * 监听终端尺寸变化
     */
    onTerminalResize(callback: (size: { width: number; height: number }) => void): void {
        process.stdout.on('resize', () => {
            this.refreshEnvironmentInfo();
            const size = this.getTerminalSize();
            callback(size);
        });
    }

    /**
     * 获取环境诊断信息
     */
    getDiagnosticInfo(): string {
        const info = this.getEnvironmentInfo();
        const validation = this.validateTUIEnvironment();

        const diagnostics = [
            `Environment Diagnostic Information:`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `TTY: ${info.isTTY ? '✅' : '❌'} (Bypass: ${info.canBypassTTY ? '✅' : '❌'})`,
            `Terminal: ${info.terminalSize.width}x${info.terminalSize.height} (${info.terminalSize.meetsMinimumRequirements ? '✅' : '❌'})`,
            `Colors: Level ${info.colorSupport.level}, Depth ${info.colorSupport.depth} (${info.colorSupport.hasColors ? '✅' : '❌'})`,
            `Type: ${info.terminalType.program} (${info.terminalType.type})`,
            `Platform: ${info.platform.os} ${info.platform.nodeVersion}`,
            `Environment: ${info.environment.nodeEnv}`,
            ``,
            `Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`,
        ];

        if (validation.issues.length > 0) {
            diagnostics.push(`Issues: ${validation.issues.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
            diagnostics.push(`Warnings: ${validation.warnings.join(', ')}`);
        }

        return diagnostics.join('\n');
    }
}