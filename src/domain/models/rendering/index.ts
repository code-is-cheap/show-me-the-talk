/**
 * Rendering Models Index
 * 导出渲染相关的领域对象
 */

// Core rendering infrastructure
export { SemanticContext } from './SemanticContext.js';
export { RenderableContent, RenderMetadata, VisualStyle } from './RenderableContent.js';
export { ConversationRenderVisitor } from './ConversationRenderVisitor.js';

// Concrete rendering implementations
export { MarkdownRenderVisitor, MarkdownRenderOptions } from './MarkdownRenderVisitor.js';
export { HtmlRenderVisitor, HtmlRenderOptions } from './HtmlRenderVisitor.js';

// Re-export types for convenience
export type { 
    UserQuestion, 
    AssistantResponse, 
    ToolInteractionGroup, 
    CodeBlock 
} from './ConversationRenderVisitor.js';