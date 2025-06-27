import { RenderableContent } from './RenderableContent.js';

// Lightweight interfaces for visitor pattern
export interface UserQuestion {
    readonly id: string;
    readonly content: string;
    readonly isFollowUp: boolean;
    getQuestionType(): string;
    getSummary(): string;
}

export interface AssistantResponse {
    readonly id: string;
    readonly textContent: string;
    readonly model?: string;
    getResponseType(): string;
    getSummary(): string;
}

export interface ToolInteractionGroup {
    readonly id: string;
    readonly description: string;
    readonly isSuccessful: boolean;
    readonly interactions: any[];
    getSummary(): string;
}

export interface CodeBlock {
    readonly id: string;
    readonly language: string;
    readonly content: string;
    readonly filename?: string;
    getSummary(): string;
}

/**
 * 对话渲染访问者接口
 * 定义了访问不同类型对话元素的方法
 */
export interface ConversationRenderVisitor {
    /**
     * 访问用户问题
     */
    visitUserQuestion(question: UserQuestion): RenderableContent;

    /**
     * 访问助手回答
     */
    visitAssistantResponse(response: AssistantResponse): RenderableContent;

    /**
     * 访问工具交互组
     */
    visitToolInteractionGroup(group: ToolInteractionGroup): RenderableContent;

    /**
     * 访问代码块
     */
    visitCodeBlock(codeBlock: CodeBlock): RenderableContent;
}