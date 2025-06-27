/**
 * 视觉样式枚举
 * 定义不同类型内容的视觉呈现样式
 */
export enum VisualStyle {
    PROMINENT = 'prominent', // 突出显示（用户问题）
    STANDARD = 'standard',   // 标准显示（助手回答）
    SUBTLE = 'subtle',       // 低调显示（工具交互）
    CODE = 'code',           // 代码样式
    METADATA = 'metadata',   // 元数据样式
    WARNING = 'warning',     // 警告样式
    SUCCESS = 'success',     // 成功样式
    ERROR = 'error'          // 错误样式
}

/**
 * 渲染元数据
 * 包含渲染过程中需要的格式化信息
 */
export class RenderMetadata {
    constructor(
        public readonly headingLevel: number,        // 标题层级
        public readonly isCollapsible: boolean,      // 是否可折叠
        public readonly syntaxHighlighting: string | null, // 语法高亮
        public readonly visualStyle: VisualStyle,    // 视觉样式
        public readonly hasCallout: boolean = false, // 是否有标注框
        public readonly customClasses: string[] = [], // 自定义CSS类
        public readonly attributes: Record<string, string> = {} // 自定义属性
    ) {}

    /**
     * 创建简单的渲染元数据
     */
    static simple(style: VisualStyle, headingLevel: number = 2): RenderMetadata {
        return new RenderMetadata(headingLevel, false, null, style);
    }

    /**
     * 创建可折叠的渲染元数据
     */
    static collapsible(style: VisualStyle, headingLevel: number = 3): RenderMetadata {
        return new RenderMetadata(headingLevel, true, null, style);
    }

    /**
     * 创建代码块的渲染元数据
     */
    static forCode(language: string): RenderMetadata {
        return new RenderMetadata(3, false, language, VisualStyle.CODE);
    }
}

/**
 * 可渲染内容
 * 包装渲染后的内容和相关元数据
 */
export class RenderableContent {
    constructor(
        public readonly content: string,
        public readonly metadata: RenderMetadata
    ) {}

    /**
     * 创建带样式的内容
     */
    static create(content: string, style: VisualStyle, options?: Partial<RenderMetadata>): RenderableContent {
        const metadata = new RenderMetadata(
            options?.headingLevel ?? 2,
            options?.isCollapsible ?? false,
            options?.syntaxHighlighting ?? null,
            style,
            options?.hasCallout ?? false,
            options?.customClasses ?? [],
            options?.attributes ?? {}
        );
        return new RenderableContent(content, metadata);
    }

    /**
     * 检查是否为空内容
     */
    isEmpty(): boolean {
        return !this.content || this.content.trim().length === 0;
    }

    /**
     * 获取内容预览（截取前N个字符）
     */
    getPreview(maxLength: number = 100): string {
        if (this.content.length <= maxLength) {
            return this.content;
        }
        return this.content.substring(0, maxLength) + '...';
    }
}