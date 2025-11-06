import { WordCloudData, WordCloudMode, WordEntry, PhraseEntry, ConceptEntry } from '../../../domain/models/analytics/WordCloudData.js';

/**
 * Configuration options for word cloud rendering
 */
export interface WordCloudRenderOptions {
    /** Width of the word cloud canvas */
    width?: number;
    /** Height of the word cloud canvas */
    height?: number;
    /** Enable interactivity (hover, click) */
    interactive?: boolean;
    /** Color scheme for words */
    colorScheme?: 'default' | 'tech' | 'gradient' | 'category';
    /** Font family to use */
    fontFamily?: string;
    /** Rotation angle range */
    rotationAngles?: [number, number];
    /** Enable zoom functionality */
    enableZoom?: boolean;
    /** CDN for d3-cloud library */
    d3CloudCdn?: string;
}

/**
 * HTML renderer for word cloud visualizations using d3-cloud
 * Generates standalone HTML with embedded CSS/JS for word frequency, phrases, and concepts
 */
export class WordCloudHtmlRenderer {
    private readonly options: Required<WordCloudRenderOptions>;

    constructor(options: WordCloudRenderOptions = {}) {
        this.options = {
            width: options.width ?? 800,
            height: options.height ?? 600,
            interactive: options.interactive ?? true,
            colorScheme: options.colorScheme ?? 'default',
            fontFamily: options.fontFamily ?? 'Impact, Arial, sans-serif',
            rotationAngles: options.rotationAngles ?? [-45, 45],
            enableZoom: options.enableZoom ?? true,
            d3CloudCdn: options.d3CloudCdn ?? 'https://cdn.jsdelivr.net/npm/d3-cloud@1.2.7/build/d3.layout.cloud.min.js'
        };
    }

    /**
     * Render complete word cloud HTML with mode switching
     */
    render(wordCloudData: WordCloudData): string {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Word Cloud Analysis</title>
    ${this.generateStyles()}
</head>
<body>
    <div class="word-cloud-container">
        ${this.generateHeader(wordCloudData)}
        ${this.generateModeControls()}
        <div class="cloud-canvas-wrapper">
            <svg id="word-cloud-svg" width="${this.options.width}" height="${this.options.height}"></svg>
            ${this.generateTooltip()}
        </div>
        ${this.generateStats(wordCloudData)}
        ${this.generateLegend(wordCloudData)}
    </div>
    ${this.generateScripts(wordCloudData)}
</body>
</html>`;
        return html;
    }

    /**
     * Generate embedded CSS styles
     */
    private generateStyles(): string {
        return `<style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }

        .word-cloud-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .mode-controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }

        .mode-button {
            padding: 12px 24px;
            border: 2px solid #667eea;
            background: white;
            color: #667eea;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .mode-button:hover {
            background: #667eea;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .mode-button.active {
            background: #667eea;
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .cloud-canvas-wrapper {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 40px 20px;
            background: white;
            min-height: ${this.options.height + 80}px;
        }

        #word-cloud-svg {
            cursor: ${this.options.enableZoom ? 'grab' : 'default'};
        }

        #word-cloud-svg:active {
            cursor: ${this.options.enableZoom ? 'grabbing' : 'default'};
        }

        .word-cloud-text {
            font-family: ${this.options.fontFamily};
            cursor: ${this.options.interactive ? 'pointer' : 'default'};
            transition: all 0.3s ease;
        }

        .word-cloud-text:hover {
            ${this.options.interactive ? 'opacity: 0.7; transform: scale(1.1);' : ''}
        }

        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 1000;
            max-width: 300px;
        }

        .tooltip.visible {
            opacity: 1;
        }

        .tooltip-title {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 16px;
        }

        .tooltip-info {
            font-size: 12px;
            opacity: 0.9;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
        }

        .stat-label {
            font-size: 0.9rem;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #667eea;
        }

        .legend {
            padding: 30px;
            background: white;
        }

        .legend h3 {
            margin-bottom: 15px;
            color: #495057;
        }

        .legend-items {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            border-radius: 4px;
            background: #f8f9fa;
        }

        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }

        .legend-label {
            font-size: 0.9rem;
            color: #495057;
        }

        .zoom-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            opacity: 0.7;
            transition: opacity 0.3s;
        }

        .zoom-controls:hover {
            opacity: 1;
        }

        .zoom-button {
            width: 36px;
            height: 36px;
            border: 2px solid #667eea;
            background: white;
            color: #667eea;
            font-size: 1.2rem;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }

        .zoom-button:hover {
            background: #667eea;
            color: white;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8rem;
            }

            .mode-controls {
                flex-wrap: wrap;
            }

            .mode-button {
                flex: 1 1 calc(50% - 5px);
                min-width: 120px;
            }

            #word-cloud-svg {
                width: 100%;
                height: auto;
            }

            .stats {
                grid-template-columns: 1fr;
            }
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .mode-controls,
            .zoom-controls {
                display: none;
            }
        }
    </style>`;
    }

    /**
     * Generate header section
     */
    private generateHeader(data: WordCloudData): string {
        return `<header class="header">
        <h1>Word Cloud Analysis</h1>
        <div class="subtitle">
            Interactive visualization of ${data.totalTokens.toLocaleString()} tokens
            (${data.uniqueTokens.toLocaleString()} unique)
        </div>
    </header>`;
    }

    /**
     * Generate mode switching controls
     */
    private generateModeControls(): string {
        return `<div class="mode-controls">
        <button class="mode-button active" data-mode="word" onclick="switchMode('word')">
            Words
        </button>
        <button class="mode-button" data-mode="phrase" onclick="switchMode('phrase')">
            Phrases
        </button>
        <button class="mode-button" data-mode="concept" onclick="switchMode('concept')">
            Concepts
        </button>
    </div>`;
    }

    /**
     * Generate tooltip element
     */
    private generateTooltip(): string {
        return `<div id="tooltip" class="tooltip">
        <div class="tooltip-title"></div>
        <div class="tooltip-info"></div>
    </div>`;
    }

    /**
     * Generate statistics section
     */
    private generateStats(data: WordCloudData): string {
        const richness = (data.getVocabularyRichness() * 100).toFixed(1);
        return `<div class="stats">
        <div class="stat-card">
            <div class="stat-label">Total Tokens</div>
            <div class="stat-value">${data.totalTokens.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Unique Tokens</div>
            <div class="stat-value">${data.uniqueTokens.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Vocabulary Richness</div>
            <div class="stat-value">${richness}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Phrases</div>
            <div class="stat-value">${data.phrases.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Concepts</div>
            <div class="stat-value">${data.concepts.length}</div>
        </div>
    </div>`;
    }

    /**
     * Generate legend section
     */
    private generateLegend(data: WordCloudData): string {
        if (this.options.colorScheme !== 'category') {
            return '';
        }

        const categories = new Set<string>();
        data.words.forEach(word => {
            if (word.category) categories.add(word.category);
        });

        if (categories.size === 0) return '';

        const legendItems = Array.from(categories).map((category, idx) => {
            const color = this.getCategoryColor(category);
            return `<div class="legend-item">
            <div class="legend-color" style="background: ${color}"></div>
            <div class="legend-label">${category}</div>
        </div>`;
        }).join('');

        return `<div class="legend">
        <h3>Categories</h3>
        <div class="legend-items">
            ${legendItems}
        </div>
    </div>`;
    }

    /**
     * Generate embedded JavaScript
     */
    private generateScripts(data: WordCloudData): string {
        const dataJson = JSON.stringify({
            words: data.words.slice(0, 100),
            phrases: data.phrases.slice(0, 100),
            concepts: data.concepts.slice(0, 100),
            mode: data.mode
        });

        return `<script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="${this.options.d3CloudCdn}"></script>
    <script>
        // Configuration
        const config = ${JSON.stringify(this.options)};

        // Data
        const cloudData = ${dataJson};

        let currentMode = '${data.mode}';
        let currentZoom = 1;
        let svg, g;

        // Color schemes
        const colorSchemes = {
            default: d3.scaleOrdinal(d3.schemeCategory10),
            tech: d3.scaleOrdinal(['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b']),
            gradient: d3.scaleSequential(d3.interpolateViridis),
            category: ${this.generateCategoryColorMap(data)}
        };

        // Initialize
        function init() {
            svg = d3.select('#word-cloud-svg');
            g = svg.append('g')
                .attr('transform', \`translate(\${config.width / 2}, \${config.height / 2})\`);

            ${this.options.enableZoom ? this.generateZoomCode() : ''}

            renderCloud();
        }

        // Switch mode
        function switchMode(mode) {
            currentMode = mode;

            // Update button states
            document.querySelectorAll('.mode-button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.mode === mode) {
                    btn.classList.add('active');
                }
            });

            renderCloud();
        }

        // Get data for current mode
        function getCurrentData() {
            const maxItems = 80;
            switch (currentMode) {
                case 'word':
                    return cloudData.words.slice(0, maxItems).map(w => ({
                        text: w.text,
                        size: Math.max(12, Math.min(80, w.weight * 1000)),
                        value: w.value,
                        weight: w.weight,
                        category: w.category,
                        type: 'word'
                    }));
                case 'phrase':
                    return cloudData.phrases.slice(0, maxItems).map(p => ({
                        text: p.text,
                        size: Math.max(12, Math.min(80, p.frequency * 10)),
                        frequency: p.frequency,
                        contexts: p.contexts,
                        type: 'phrase'
                    }));
                case 'concept':
                    return cloudData.concepts.slice(0, maxItems).map(c => ({
                        text: c.concept,
                        size: Math.max(12, Math.min(80, c.occurrences * 15)),
                        occurrences: c.occurrences,
                        relatedTerms: c.relatedTerms,
                        type: 'concept'
                    }));
            }
        }

        // Render word cloud
        function renderCloud() {
            const data = getCurrentData();

            const layout = d3.layout.cloud()
                .size([config.width, config.height])
                .words(data)
                .padding(5)
                .rotate(() => {
                    const [min, max] = config.rotationAngles;
                    return Math.random() * (max - min) + min;
                })
                .fontSize(d => d.size)
                .fontFamily(config.fontFamily)
                .on('end', draw);

            layout.start();
        }

        // Draw words
        function draw(words) {
            g.selectAll('text').remove();

            const tooltip = d3.select('#tooltip');
            const colorScale = colorSchemes[config.colorScheme];

            const texts = g.selectAll('text')
                .data(words)
                .enter()
                .append('text')
                .attr('class', 'word-cloud-text')
                .style('font-size', d => d.size + 'px')
                .style('font-family', config.fontFamily)
                .style('fill', (d, i) => {
                    if (config.colorScheme === 'category' && d.category) {
                        return getCategoryColor(d.category);
                    } else if (config.colorScheme === 'gradient') {
                        return colorScale(i / words.length);
                    }
                    return colorScale(i);
                })
                .attr('text-anchor', 'middle')
                .attr('transform', d => \`translate(\${d.x}, \${d.y}) rotate(\${d.rotate})\`)
                .text(d => d.text);

            if (config.interactive) {
                texts
                    .on('mouseover', function(event, d) {
                        d3.select(this).style('opacity', 0.7);
                        showTooltip(event, d);
                    })
                    .on('mouseout', function() {
                        d3.select(this).style('opacity', 1);
                        hideTooltip();
                    })
                    .on('click', function(event, d) {
                        handleWordClick(d);
                    });
            }
        }

        // Show tooltip
        function showTooltip(event, data) {
            const tooltip = document.getElementById('tooltip');
            const title = tooltip.querySelector('.tooltip-title');
            const info = tooltip.querySelector('.tooltip-info');

            title.textContent = data.text;

            let infoText = '';
            switch (data.type) {
                case 'word':
                    infoText = \`Frequency: \${data.value} | Weight: \${data.weight.toFixed(4)}\`;
                    if (data.category) infoText += \` | Category: \${data.category}\`;
                    break;
                case 'phrase':
                    infoText = \`Frequency: \${data.frequency}\`;
                    if (data.contexts && data.contexts.length > 0) {
                        infoText += \`\\nExample: \${data.contexts[0].substring(0, 50)}...\`;
                    }
                    break;
                case 'concept':
                    infoText = \`Occurrences: \${data.occurrences}\`;
                    if (data.relatedTerms && data.relatedTerms.length > 0) {
                        infoText += \`\\nRelated: \${data.relatedTerms.slice(0, 3).join(', ')}\`;
                    }
                    break;
            }

            info.textContent = infoText;

            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY + 10) + 'px';
            tooltip.classList.add('visible');
        }

        // Hide tooltip
        function hideTooltip() {
            document.getElementById('tooltip').classList.remove('visible');
        }

        // Handle word click
        function handleWordClick(data) {
            console.log('Clicked:', data);
            // Can be extended to filter or navigate
        }

        // Get category color
        function getCategoryColor(category) {
            const colors = {
                'language': '#667eea',
                'framework': '#764ba2',
                'tool': '#f093fb',
                'concept': '#4facfe',
                'method': '#43e97b'
            };
            return colors[category] || '#6c757d';
        }

        ${this.options.enableZoom ? this.generateZoomFunctions() : ''}

        // Initialize on load
        window.addEventListener('DOMContentLoaded', init);
    </script>`;
    }

    /**
     * Generate zoom interaction code
     */
    private generateZoomCode(): string {
        return `const zoom = d3.zoom()
                .scaleExtent([0.5, 3])
                .on('zoom', (event) => {
                    currentZoom = event.transform.k;
                    g.attr('transform', \`translate(\${config.width / 2}, \${config.height / 2}) scale(\${event.transform.k})\`);
                });

            svg.call(zoom);

            // Add zoom controls
            const controls = d3.select('.cloud-canvas-wrapper')
                .append('div')
                .attr('class', 'zoom-controls');

            controls.append('button')
                .attr('class', 'zoom-button')
                .html('+')
                .on('click', () => zoomIn());

            controls.append('button')
                .attr('class', 'zoom-button')
                .html('−')
                .on('click', () => zoomOut());

            controls.append('button')
                .attr('class', 'zoom-button')
                .html('⟲')
                .on('click', () => resetZoom());`;
    }

    /**
     * Generate zoom control functions
     */
    private generateZoomFunctions(): string {
        return `
        function zoomIn() {
            currentZoom = Math.min(3, currentZoom * 1.2);
            svg.transition().duration(300).call(zoom.scaleTo, currentZoom);
        }

        function zoomOut() {
            currentZoom = Math.max(0.5, currentZoom / 1.2);
            svg.transition().duration(300).call(zoom.scaleTo, currentZoom);
        }

        function resetZoom() {
            currentZoom = 1;
            svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
        }`;
    }

    /**
     * Generate category color map for JavaScript
     */
    private generateCategoryColorMap(data: WordCloudData): string {
        const categories = new Set<string>();
        data.words.forEach(word => {
            if (word.category) categories.add(word.category);
        });

        const colorMap: Record<string, string> = {};
        Array.from(categories).forEach(category => {
            colorMap[category] = this.getCategoryColor(category);
        });

        return JSON.stringify(colorMap);
    }

    /**
     * Get color for a category
     */
    private getCategoryColor(category: string): string {
        const colors: Record<string, string> = {
            'language': '#667eea',
            'framework': '#764ba2',
            'tool': '#f093fb',
            'concept': '#4facfe',
            'method': '#43e97b',
            'library': '#fa709a',
            'platform': '#30cfd0'
        };
        return colors[category] || '#6c757d';
    }
}
