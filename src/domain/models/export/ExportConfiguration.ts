/**
 * Configuration options for export rendering
 */

export interface ExportConfiguration {
    includeTimestamps: boolean;
    includeMetadata: boolean;
    includeComplexityInfo: boolean;
    showToolDetails: boolean;
    groupByCategory: boolean;
    markdown: MarkdownExportOptions;
    html: HtmlExportOptions;
    performance: PerformanceOptions;
}

export interface MarkdownExportOptions {
    useEnhancedRendering: boolean;
    includeTableOfContents: boolean;
    showVisualSeparators: boolean;
    codeBlockSyntaxHighlighting: boolean;
    collapseToolInteractions: boolean;
    showQuestionNumbers: boolean;
    includeConversationStats: boolean;
}

export interface HtmlExportOptions {
    theme: 'light' | 'dark' | 'auto';
    includeSearchBox: boolean;
    enableCodeCopy: boolean;
    showToolInteractionDetails: boolean;
    collapsibleSections: boolean;
    responsiveDesign: boolean;
    customCss?: string;
    includeJavaScript: boolean;
}

export interface PerformanceOptions {
    streamingMode: boolean;
    chunkSize: number;
    maxMemoryUsage: number;
    enableGzip: boolean;
    lazyLoadContent: boolean;
}

/**
 * Default export configuration
 */
export const DEFAULT_EXPORT_CONFIG: ExportConfiguration = {
    includeTimestamps: false,
    includeMetadata: true,
    includeComplexityInfo: false,
    showToolDetails: true,
    groupByCategory: false,
    markdown: {
        useEnhancedRendering: true,
        includeTableOfContents: true,
        showVisualSeparators: true,
        codeBlockSyntaxHighlighting: true,
        collapseToolInteractions: false,
        showQuestionNumbers: true,
        includeConversationStats: true
    },
    html: {
        theme: 'auto',
        includeSearchBox: true,
        enableCodeCopy: true,
        showToolInteractionDetails: true,
        collapsibleSections: true,
        responsiveDesign: true,
        includeJavaScript: true
    },
    performance: {
        streamingMode: false,
        chunkSize: 1000,
        maxMemoryUsage: 512, // MB
        enableGzip: true,
        lazyLoadContent: false
    }
};

/**
 * Export configuration builder for fluent API
 */
export class ExportConfigurationBuilder {
    private config: ExportConfiguration;

    constructor(baseConfig: ExportConfiguration = DEFAULT_EXPORT_CONFIG) {
        this.config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone
    }

    withTimestamps(include: boolean = true): this {
        this.config.includeTimestamps = include;
        return this;
    }

    withMetadata(include: boolean = true): this {
        this.config.includeMetadata = include;
        return this;
    }

    withComplexityInfo(include: boolean = true): this {
        this.config.includeComplexityInfo = include;
        return this;
    }

    withToolDetails(show: boolean = true): this {
        this.config.showToolDetails = show;
        return this;
    }

    groupedByCategory(group: boolean = true): this {
        this.config.groupByCategory = group;
        return this;
    }

    withEnhancedMarkdown(enhanced: boolean = true): this {
        this.config.markdown.useEnhancedRendering = enhanced;
        return this;
    }

    withTableOfContents(include: boolean = true): this {
        this.config.markdown.includeTableOfContents = include;
        return this;
    }

    withVisualSeparators(show: boolean = true): this {
        this.config.markdown.showVisualSeparators = show;
        return this;
    }

    withSyntaxHighlighting(enable: boolean = true): this {
        this.config.markdown.codeBlockSyntaxHighlighting = enable;
        return this;
    }

    withCollapsedTools(collapse: boolean = true): this {
        this.config.markdown.collapseToolInteractions = collapse;
        return this;
    }

    withQuestionNumbers(show: boolean = true): this {
        this.config.markdown.showQuestionNumbers = show;
        return this;
    }

    withConversationStats(include: boolean = true): this {
        this.config.markdown.includeConversationStats = include;
        return this;
    }

    withTheme(theme: 'light' | 'dark' | 'auto'): this {
        this.config.html.theme = theme;
        return this;
    }

    withSearchBox(include: boolean = true): this {
        this.config.html.includeSearchBox = include;
        return this;
    }

    withCodeCopy(enable: boolean = true): this {
        this.config.html.enableCodeCopy = enable;
        return this;
    }

    withToolInteractionDetails(show: boolean = true): this {
        this.config.html.showToolInteractionDetails = show;
        return this;
    }

    withCollapsibleSections(enable: boolean = true): this {
        this.config.html.collapsibleSections = enable;
        return this;
    }

    withResponsiveDesign(enable: boolean = true): this {
        this.config.html.responsiveDesign = enable;
        return this;
    }

    withCustomCss(css: string): this {
        this.config.html.customCss = css;
        return this;
    }

    withJavaScript(include: boolean = true): this {
        this.config.html.includeJavaScript = include;
        return this;
    }

    withStreamingMode(enable: boolean = true): this {
        this.config.performance.streamingMode = enable;
        return this;
    }

    withChunkSize(size: number): this {
        this.config.performance.chunkSize = Math.max(100, size);
        return this;
    }

    withMaxMemory(mb: number): this {
        this.config.performance.maxMemoryUsage = Math.max(64, mb);
        return this;
    }

    withGzip(enable: boolean = true): this {
        this.config.performance.enableGzip = enable;
        return this;
    }

    withLazyLoading(enable: boolean = true): this {
        this.config.performance.lazyLoadContent = enable;
        return this;
    }

    minimal(): this {
        this.config.includeTimestamps = false;
        this.config.includeMetadata = false;
        this.config.includeComplexityInfo = false;
        this.config.showToolDetails = false;
        this.config.markdown.includeTableOfContents = false;
        this.config.markdown.showVisualSeparators = false;
        this.config.markdown.collapseToolInteractions = true;
        this.config.markdown.includeConversationStats = false;
        this.config.html.includeSearchBox = false;
        this.config.html.collapsibleSections = false;
        this.config.html.includeJavaScript = false;
        return this;
    }

    comprehensive(): this {
        this.config.includeTimestamps = true;
        this.config.includeMetadata = true;
        this.config.includeComplexityInfo = true;
        this.config.showToolDetails = true;
        this.config.groupByCategory = true;
        this.config.markdown.useEnhancedRendering = true;
        this.config.markdown.includeTableOfContents = true;
        this.config.markdown.showVisualSeparators = true;
        this.config.markdown.includeConversationStats = true;
        this.config.html.includeSearchBox = true;
        this.config.html.enableCodeCopy = true;
        this.config.html.showToolInteractionDetails = true;
        this.config.html.collapsibleSections = true;
        this.config.html.responsiveDesign = true;
        this.config.html.includeJavaScript = true;
        return this;
    }

    performanceOptimized(): this {
        this.config.performance.streamingMode = true;
        this.config.performance.chunkSize = 500;
        this.config.performance.enableGzip = true;
        this.config.performance.lazyLoadContent = true;
        this.config.markdown.collapseToolInteractions = true;
        this.config.html.collapsibleSections = true;
        return this;
    }

    build(): ExportConfiguration {
        return JSON.parse(JSON.stringify(this.config)); // Return deep clone
    }
}

/**
 * Export configuration presets
 */
export const EXPORT_PRESETS: {
    DEFAULT: ExportConfiguration;
    MINIMAL: ExportConfiguration;
    COMPREHENSIVE: ExportConfiguration;
    PERFORMANCE: ExportConfiguration;
    DEVELOPER: ExportConfiguration;
    PRESENTATION: ExportConfiguration;
} = {
    DEFAULT: DEFAULT_EXPORT_CONFIG,
    
    MINIMAL: new ExportConfigurationBuilder()
        .minimal()
        .build(),
    
    COMPREHENSIVE: new ExportConfigurationBuilder()
        .comprehensive()
        .build(),
    
    PERFORMANCE: new ExportConfigurationBuilder()
        .performanceOptimized()
        .build(),
    
    DEVELOPER: new ExportConfigurationBuilder()
        .withTimestamps(true)
        .withMetadata(true)
        .withComplexityInfo(true)
        .withToolDetails(true)
        .withSyntaxHighlighting(true)
        .withCodeCopy(true)
        .withCollapsibleSections(true)
        .build(),
    
    PRESENTATION: new ExportConfigurationBuilder()
        .withTimestamps(false)
        .withMetadata(false)
        .withComplexityInfo(false)
        .withVisualSeparators(true)
        .withTableOfContents(true)
        .withTheme('light')
        .withResponsiveDesign(true)
        .withCollapsedTools(true)
        .build()
};