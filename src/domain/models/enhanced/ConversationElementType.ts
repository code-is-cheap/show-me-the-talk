/**
 * 对话元素类型枚举
 * 定义对话中不同类型的内容元素
 */
export enum ConversationElementType {
    USER_QUESTION = 'user_question',           // 用户问题
    ASSISTANT_RESPONSE = 'assistant_response', // 助手回答
    TOOL_INTERACTION = 'tool_interaction',     // 工具交互
    TOOL_INTERACTION_GROUP = 'tool_interaction_group', // 工具交互组
    CODE_BLOCK = 'code_block',                 // 代码块
    SYSTEM_MESSAGE = 'system_message',         // 系统消息
    ERROR_MESSAGE = 'error_message',           // 错误消息
    METADATA = 'metadata'                      // 元数据
}

/**
 * 内容重要性分级
 * 用于确定渲染时的视觉层次
 */
export enum ContentImportance {
    PRIMARY = 'primary',     // 主要内容：用户问题、主要回答
    SECONDARY = 'secondary', // 次要内容：工具交互、代码块
    TERTIARY = 'tertiary'    // 三级内容：元数据、辅助信息
}

/**
 * 内容分类枚举
 * 按语义功能对内容进行分类
 */
export enum ContentCategory {
    QUESTION = 'question', // 问题
    ANSWER = 'answer',     // 回答
    ACTION = 'action',     // 操作
    RESULT = 'result',     // 结果
    CODE = 'code',         // 代码
    METADATA = 'metadata', // 元数据
    SYSTEM = 'system'      // 系统
}