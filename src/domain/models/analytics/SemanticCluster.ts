/**
 * Types of semantic clustering strategies
 */
export enum ClusterType {
    TECH_STACK = 'tech_stack',       // Grouped by technology (React, TypeScript, etc.)
    TASK_TYPE = 'task_type',         // Grouped by task nature (debugging, refactoring, etc.)
    TOPIC = 'topic',                 // Grouped by discussion topics
    TIMELINE = 'timeline',           // Grouped by time periods
}

/**
 * A conversation reference within a cluster
 */
export interface ConversationReference {
    readonly sessionId: string;
    readonly projectName: string;
    readonly timestamp: Date;
    readonly relevanceScore: number;  // How relevant to this cluster (0-1)
}

/**
 * Technology stack information
 */
export interface TechStackInfo {
    readonly languages: string[];      // Programming languages
    readonly frameworks: string[];     // Frameworks and libraries
    readonly tools: string[];          // Development tools
    readonly platforms: string[];      // Platforms (Node.js, Browser, etc.)
}

/**
 * A semantic cluster grouping related conversations
 */
export class SemanticCluster {
    constructor(
        public readonly id: string,
        public readonly type: ClusterType,
        public readonly label: string,
        public readonly keywords: string[],
        public readonly conversations: ConversationReference[],
        public readonly metadata: Record<string, any> = {},
        public readonly createdAt: Date = new Date()
    ) {}

    /**
     * Get cluster size (number of conversations)
     */
    getSize(): number {
        return this.conversations.length;
    }

    /**
     * Get top keywords (sorted by frequency)
     */
    getTopKeywords(limit: number = 10): string[] {
        return this.keywords.slice(0, limit);
    }

    /**
     * Get date range of conversations in cluster
     */
    getDateRange(): { start: Date; end: Date } | null {
        if (this.conversations.length === 0) return null;

        const timestamps = this.conversations.map(c => c.timestamp);
        return {
            start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
            end: new Date(Math.max(...timestamps.map(t => t.getTime())))
        };
    }

    /**
     * Get average relevance score
     */
    getAverageRelevance(): number {
        if (this.conversations.length === 0) return 0;
        const sum = this.conversations.reduce((acc, c) => acc + c.relevanceScore, 0);
        return sum / this.conversations.length;
    }

    /**
     * Get tech stack info (for TECH_STACK clusters)
     */
    getTechStack(): TechStackInfo | null {
        if (this.type !== ClusterType.TECH_STACK) return null;
        return this.metadata.techStack as TechStackInfo || null;
    }
}

/**
 * Collection of clusters from analysis
 */
export class ClusterCollection {
    constructor(
        public readonly clusters: SemanticCluster[],
        public readonly type: ClusterType,
        public readonly totalConversations: number,
        public readonly generatedAt: Date = new Date()
    ) {}

    /**
     * Get cluster by ID
     */
    getClusterById(id: string): SemanticCluster | undefined {
        return this.clusters.find(c => c.id === id);
    }

    /**
     * Get largest clusters
     */
    getLargestClusters(limit: number = 5): SemanticCluster[] {
        return [...this.clusters]
            .sort((a, b) => b.getSize() - a.getSize())
            .slice(0, limit);
    }

    /**
     * Get cluster distribution (sizes)
     */
    getDistribution(): Map<string, number> {
        const distribution = new Map<string, number>();
        this.clusters.forEach(cluster => {
            distribution.set(cluster.label, cluster.getSize());
        });
        return distribution;
    }

    /**
     * Calculate clustering coverage (conversations in clusters / total)
     */
    getCoverage(): number {
        const totalInClusters = this.clusters.reduce((sum, c) => sum + c.getSize(), 0);
        return this.totalConversations > 0 ? totalInClusters / this.totalConversations : 0;
    }
}
