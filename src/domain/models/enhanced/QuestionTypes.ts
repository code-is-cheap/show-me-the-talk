/**
 * 问题复杂度枚举
 * 用于评估问题的复杂程度
 */
export enum QuestionComplexity {
    SIMPLE = 'simple',     // 简单问题
    MODERATE = 'moderate', // 中等复杂度
    COMPLEX = 'complex'    // 复杂问题
}

/**
 * 问题意图枚举
 * 用于分类问题的目的和类型
 */
export enum QuestionIntent {
    GENERAL = 'general',           // 一般询问
    IMPLEMENTATION = 'implementation', // 实现需求
    DEBUGGING = 'debugging',       // 调试求助
    LEARNING = 'learning',         // 学习了解
    OPTIMIZATION = 'optimization'  // 优化改进
}

/**
 * 问题类型
 * 基于问题内容的语义分类
 */
export type QuestionType = 'how-to' | 'what-is' | 'why' | 'debug' | 'implement' | 'explain' | 'compare' | 'review';