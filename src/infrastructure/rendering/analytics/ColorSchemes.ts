/**
 * 世界级数据可视化配色方案
 * 基于 D3.js、Tableau、IBM 等行业标准
 *
 * 设计原则：
 * 1. UI 层使用极简灰度（Vercel 风格）
 * 2. 数据层使用专业配色（Tableau10 等）
 * 3. 确保色盲友好和高对比度
 * 4. 颜色有功能性目的（区分类别、表示数值）
 */

/**
 * Chart.js 颜色配置
 */
export interface ChartJsColorConfig {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
}

/**
 * 数据可视化配色方案
 */
export class DataVizColorSchemes {

    /**
     * D3 Tableau10 - 分类数据首选
     *
     * 特点：
     * - 色盲友好（经过 Tableau 专业优化）
     * - 高对比度，清晰可辨
     * - 适用于最多 10 个分类
     */
    static readonly TABLEAU10 = [
        '#4E79A7',  // Blue - 蓝色
        '#F28E2B',  // Orange - 橙色
        '#E15759',  // Red - 红色
        '#76B7B2',  // Teal - 青色
        '#59A14F',  // Green - 绿色
        '#EDC948',  // Yellow - 黄色
        '#B07AA1',  // Purple - 紫色
        '#FF9DA7',  // Pink - 粉色
        '#9C755F',  // Brown - 棕色
        '#BAB0AC',  // Gray - 灰色
    ] as const;

    /**
     * Vercel 极简风格 - UI 元素使用
     *
     * 特点：
     * - 灰度为主，单色强调
     * - 适用于布局、边框、文本
     * - 不适用于多分类数据可视化
     */
    static readonly VERCEL = {
        /** 主强调色 */
        primary: '#0070f3',
        primaryHover: '#0061d5',
        primaryLight: '#3291ff',

        /** 灰度层次 */
        grayscale: [
            '#171717',  // gray-900
            '#404040',  // gray-700
            '#737373',  // gray-500
            '#a3a3a3',  // gray-400
            '#d4d4d4',  // gray-300
            '#e5e5e5',  // gray-200
            '#f5f5f5',  // gray-100
        ],

        /** 语义颜色 */
        semantic: {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
        }
    } as const;

    /**
     * IBM 色盲安全色板
     *
     * 特点：
     * - 完全色盲友好
     * - 高对比度
     * - 仅5色（适用于少量分类）
     */
    static readonly IBM_COLORBLIND = [
        '#648fff',  // Blue - 蓝色
        '#785ef0',  // Purple - 紫色
        '#dc267f',  // Magenta - 品红
        '#fe6100',  // Orange - 橙色
        '#ffb000',  // Yellow - 黄色
    ] as const;

    /**
     * 序列色板 - 用于表示连续数值
     */
    static readonly SEQUENTIAL = {
        /** 蓝色序列 - 适合单一指标 */
        blues: [
            '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1',
            '#6baed6', '#4292c6', '#2171b5', '#084594'
        ],

        /** Viridis - 感知均匀，色盲友好 */
        viridis: [
            '#440154', '#482878', '#3e4989', '#31688e',
            '#26828e', '#1f9e89', '#35b779', '#6ece58'
        ],

        /** Cividis - 专为色盲优化 */
        cividis: [
            '#00204c', '#31446b', '#666870', '#958f78',
            '#c8b882', '#ffe29a', '#fff1c6', '#fffdfa'
        ],
    } as const;

    /**
     * 获取指定数量的分类颜色
     *
     * @param count 需要的颜色数量
     * @param scheme 配色方案
     * @returns 颜色数组
     */
    static getCategoricalColors(
        count: number,
        scheme: 'tableau10' | 'ibm' = 'tableau10'
    ): string[] {
        const palette = scheme === 'tableau10' ? this.TABLEAU10 : this.IBM_COLORBLIND;

        if (count <= palette.length) {
            return Array.from(palette.slice(0, count));
        }

        // 如果需要更多颜色，循环使用
        return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
    }

    /**
     * 转换为 Chart.js 格式的颜色配置
     *
     * @param colors 颜色数组
     * @param opacity 不透明度 (0-1)
     * @returns Chart.js 颜色配置数组
     */
    static toChartJsColors(colors: readonly string[] | string[], opacity = 0.8): ChartJsColorConfig[] {
        return colors.map(color => ({
            backgroundColor: this.addOpacity(color, opacity),
            borderColor: color,
            borderWidth: 1,
        }));
    }

    /**
     * 给颜色添加透明度
     *
     * @param hex HEX 颜色值 (如 #4E79A7)
     * @param opacity 不透明度 (0-1)
     * @returns 带透明度的 HEX 颜色 (如 #4E79A7CC)
     */
    static addOpacity(hex: string, opacity: number): string {
        const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
            .toString(16)
            .padStart(2, '0')
            .toUpperCase();
        return `${hex}${alpha}`;
    }

    /**
     * 获取序列渐变色
     *
     * @param value 当前值
     * @param min 最小值
     * @param max 最大值
     * @param scheme 配色方案
     * @returns 对应的颜色
     */
    static getSequentialColor(
        value: number,
        min: number,
        max: number,
        scheme: 'blues' | 'viridis' | 'cividis' = 'blues'
    ): string {
        const palette = this.SEQUENTIAL[scheme];
        const normalized = (value - min) / (max - min);
        const index = Math.floor(normalized * (palette.length - 1));
        return palette[Math.max(0, Math.min(palette.length - 1, index))];
    }

    /**
     * 计算两个颜色的对比度（WCAG 2.1）
     *
     * @param color1 第一个颜色（HEX）
     * @param color2 第二个颜色（HEX）
     * @returns 对比度比值
     */
    static getContrastRatio(color1: string, color2: string): number {
        const l1 = this.getRelativeLuminance(color1);
        const l2 = this.getRelativeLuminance(color2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * 获取颜色的相对亮度
     *
     * @param hex HEX 颜色值
     * @returns 相对亮度 (0-1)
     */
    private static getRelativeLuminance(hex: string): number {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return 0;

        const [r, g, b] = rgb.map(channel => {
            const c = channel / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * HEX 转 RGB
     *
     * @param hex HEX 颜色值
     * @returns RGB 数组 [r, g, b]
     */
    private static hexToRgb(hex: string): [number, number, number] | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ]
            : null;
    }

    /**
     * 检查对比度是否符合 WCAG 标准
     *
     * @param foreground 前景色
     * @param background 背景色
     * @returns 可访问性检查结果
     */
    static checkAccessibility(foreground: string, background: string): {
        ratio: number;
        passAA: boolean;      // AA 级（4.5:1 for normal text）
        passAAA: boolean;     // AAA 级（7:1 for normal text）
        passAALarge: boolean; // AA 级大文本（3:1）
    } {
        const ratio = this.getContrastRatio(foreground, background);
        return {
            ratio,
            passAA: ratio >= 4.5,
            passAAA: ratio >= 7,
            passAALarge: ratio >= 3,
        };
    }
}
