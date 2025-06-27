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

        // 检查TTY可用性
        if (!info.isTTY && !info.canBypassTTY) {
            issues.push('TTY not available and bypass not enabled');
        }

        // 检查终端尺寸
        if (!info.terminalSize.meetsMinimumRequirements) {
            warnings.push(`Terminal size ${info.terminalSize.width}x${info.terminalSize.height} is below recommended minimum`);
        }

        // 检查颜色支持
        if (!info.colorSupport.hasColors) {
            warnings.push('Limited or no color support detected');
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
        const info = this.getEnvironmentInfo();
        return info.terminalType.isWarp;
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
        return process.stdout.isTTY === true && process.stdin.isTTY === true;
    }

    private canBypassTTY(): boolean {
        return process.env.FORCE_COLOR === 'true' ||
               process.env.NODE_ENV === 'development' ||
               process.env.BYPASS_TTY === 'true';
    }

    private detectTerminalSize(): EnvironmentInfo['terminalSize'] {
        const width = process.stdout.columns || 80;
        const height = process.stdout.rows || 24;

        return {
            width,
            height,
            meetsMinimumRequirements: width >= 80 && height >= 24
        };
    }

    private detectColorSupport(): EnvironmentInfo['colorSupport'] {
        const colorterm = process.env.COLORTERM || '';
        const term = process.env.TERM || '';
        
        let level = 0;
        let hasColors = false;
        let depth = 0;

        if (process.env.FORCE_COLOR === 'true' || colorterm.includes('truecolor')) {
            level = 3;
            hasColors = true;
            depth = 24;
        } else if (colorterm.includes('256') || term.includes('256')) {
            level = 2;
            hasColors = true;
            depth = 8;
        } else if (process.stdout.isTTY) {
            level = 1;
            hasColors = true;
            depth = 4;
        }

        return { level, hasColors, depth };
    }

    private detectTerminalType(): EnvironmentInfo['terminalType'] {
        const termProgram = process.env.TERM_PROGRAM || '';
        const warpSessionId = process.env.WARP_SESSION_ID;
        
        const isWarp = termProgram.toLowerCase().includes('warp') || !!warpSessionId;
        
        return {
            isWarp,
            type: termProgram || 'unknown',
            program: termProgram
        };
    }

    private getEnvironmentVariables(): EnvironmentInfo['environment'] {
        return {
            nodeEnv: process.env.NODE_ENV || 'production',
            bypassTTY: process.env.BYPASS_TTY === 'true',
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

        return `Environment Diagnostic:
Platform: ${info.platform.os} (Node ${info.platform.nodeVersion})
TTY: ${info.isTTY ? 'Available' : 'Not available'} ${info.canBypassTTY ? '(bypass enabled)' : ''}
Terminal: ${info.terminalSize.width}x${info.terminalSize.height} ${info.terminalType.isWarp ? '(Warp)' : `(${info.terminalType.program})`}
Colors: ${info.colorSupport.hasColors ? `${info.colorSupport.depth}-bit` : 'None'}
Environment: ${info.environment.nodeEnv}

Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}
${validation.issues.length > 0 ? 'Issues: ' + validation.issues.join(', ') : ''}
${validation.warnings.length > 0 ? 'Warnings: ' + validation.warnings.join(', ') : ''}`;
    }
}