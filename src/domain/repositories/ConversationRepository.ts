import { Conversation } from '../models/Conversation.js';
import { ProjectContext } from '../models/ProjectContext.js';

export interface ConversationRepository {
    findAll(): Promise<Conversation[]>;
    findBySessionId(sessionId: string): Promise<Conversation | null>;
    findByProjectContext(projectContext: ProjectContext): Promise<Conversation[]>;
    getAllProjects(): Promise<ProjectContext[]>;
}

export interface ConversationQuery {
    sessionId?: string;
    projectPath?: string;
    dateFrom?: Date;
    dateTo?: Date;
    messageCountMin?: number;
    messageCountMax?: number;
}

export interface ConversationRepositoryWithQuery extends ConversationRepository {
    findByQuery(query: ConversationQuery): Promise<Conversation[]>;
}