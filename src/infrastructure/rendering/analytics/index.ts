/**
 * Analytics rendering infrastructure
 *
 * This module provides HTML rendering capabilities for analytics reports,
 * including word clouds, interactive dashboards, and various chart visualizations.
 *
 * @module infrastructure/rendering/analytics
 */

export type {
    WordCloudRenderOptions
} from './WordCloudHtmlRenderer.js';

export {
    WordCloudHtmlRenderer
} from './WordCloudHtmlRenderer.js';

export type {
    DashboardRenderOptions,
    DashboardTheme
} from './AnalyticsDashboardTemplate.js';

export {
    AnalyticsDashboardTemplate
} from './AnalyticsDashboardTemplate.js';
