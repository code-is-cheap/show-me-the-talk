import { Conversation } from '../../../domain/models/Conversation.js';
import { ConversationFilter } from '../../../domain/services/ConversationFilter.js';

export function groupConversationsByProject(conversations: Conversation[]): Map<string, Conversation[]> {
    const grouped = new Map<string, Conversation[]>();
    
    for (const conversation of conversations) {
        const projectPath = conversation.getProjectContext().getOriginalPath();
        
        if (!grouped.has(projectPath)) {
            grouped.set(projectPath, []);
        }
        
        grouped.get(projectPath)!.push(conversation);
    }
    
    return grouped;
}

export function filterConversationsByCategory(conversations: Conversation[], category: string): Conversation[] {
    // Use ConversationFilter for categorization
    const filter = new ConversationFilter();
    return conversations.filter(c => filter.categorizeConversation(c) === category);
}

export function searchConversations(conversations: Conversation[], query: string): Conversation[] {
    const lowercaseQuery = query.toLowerCase();
    
    return conversations.filter(conversation => {
        // Search in conversation title
        if (conversation.title && conversation.title.toLowerCase().includes(lowercaseQuery)) {
            return true;
        }
        
        // Search in project context
        const projectPath = conversation.getProjectContext().getOriginalPath().toLowerCase();
        if (projectPath.includes(lowercaseQuery)) {
            return true;
        }
        
        // Search in messages
        return conversation.getMessages().some(message => 
            message.getContent().toLowerCase().includes(lowercaseQuery)
        );
    });
}

export function sortConversations(conversations: Conversation[], sortBy: 'date' | 'name' | 'messages'): Conversation[] {
    return [...conversations].sort((a, b) => {
        switch (sortBy) {
            case 'date':
                return b.getStartTime().getTime() - a.getStartTime().getTime();
            
            case 'name':
                const nameA = a.title || a.sessionId;
                const nameB = b.title || b.sessionId;
                return nameA.localeCompare(nameB);
            
            case 'messages':
                return b.getMessages().length - a.getMessages().length;
            
            default:
                return 0;
        }
    });
}

export function getConversationStats(conversations: Conversation[]): {
    totalConversations: number;
    totalMessages: number;
    totalProjects: number;
    categories: {
        debug: number;
        implement: number;
        learning: number;
        review: number;
        general: number;
    };
    averageMessagesPerConversation: number;
} {
    const categories = {
        debug: 0,
        implement: 0,
        learning: 0,
        review: 0,
        general: 0
    };
    
    const projectSet = new Set<string>();
    let totalMessages = 0;
    
    for (const conversation of conversations) {
        // Count messages
        totalMessages += conversation.getMessages().length;
        
        // Track unique projects
        projectSet.add(conversation.getProjectContext().getOriginalPath());
        
        // Count categories using ConversationFilter
        const filter = new ConversationFilter();
        const category = filter.categorizeConversation(conversation);
        if (category in categories) {
            categories[category as keyof typeof categories]++;
        } else {
            categories.general++;
        }
    }
    
    return {
        totalConversations: conversations.length,
        totalMessages,
        totalProjects: projectSet.size,
        categories,
        averageMessagesPerConversation: conversations.length > 0 ? totalMessages / conversations.length : 0
    };
}