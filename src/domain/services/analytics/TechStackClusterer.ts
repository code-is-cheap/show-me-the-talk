import { Conversation } from '../../models/Conversation.js';
import {
    SemanticCluster,
    ClusterCollection,
    ClusterType,
    ConversationReference,
    TechStackInfo
} from '../../models/analytics/index.js';
import { ConversationTextAnalyzer } from './ConversationTextAnalyzer.js';

/**
 * Technology detection result
 */
interface TechDetection {
    languages: Set<string>;
    frameworks: Set<string>;
    tools: Set<string>;
    platforms: Set<string>;
}

/**
 * Clusters conversations by technology stack
 */
export class TechStackClusterer {
    private textAnalyzer: ConversationTextAnalyzer;

    constructor(textAnalyzer?: ConversationTextAnalyzer) {
        this.textAnalyzer = textAnalyzer || new ConversationTextAnalyzer();
    }

    /**
     * Cluster conversations by technology stack
     */
    clusterByTechStack(conversations: Conversation[]): ClusterCollection {
        // Detect technologies for each conversation
        const conversationTech = new Map<string, TechDetection>();

        conversations.forEach(conv => {
            const text = conv.getSearchableContent();
            const tech = this.detectTechnologies(text);
            conversationTech.set(conv.sessionId, tech);
        });

        // Group by technology combinations
        const clusters = this.groupByTech(conversations, conversationTech);

        return new ClusterCollection(
            clusters,
            ClusterType.TECH_STACK,
            conversations.length
        );
    }

    /**
     * Detect technologies mentioned in text
     */
    private detectTechnologies(text: string): TechDetection {
        const lowerText = text.toLowerCase();

        return {
            languages: this.detectLanguages(lowerText),
            frameworks: this.detectFrameworks(lowerText),
            tools: this.detectTools(lowerText),
            platforms: this.detectPlatforms(lowerText)
        };
    }

    /**
     * Detect programming languages
     */
    private detectLanguages(text: string): Set<string> {
        const languages = new Set<string>();

        const languagePatterns: Record<string, RegExp> = {
            'JavaScript': /\b(javascript|js|ecmascript)\b/i,
            'TypeScript': /\btypescript\b|\.ts\b/i,
            'Python': /\bpython\b|\.py\b/i,
            'Java': /\bjava\b(?!script)/i,
            'Rust': /\brust\b|\.rs\b/i,
            'Go': /\b(golang|go)\b|\.go\b/i,
            'C++': /\b(c\+\+|cpp)\b|\.cpp\b/i,
            'C#': /\b(c#|csharp)\b|\.cs\b/i,
            'Ruby': /\bruby\b|\.rb\b/i,
            'PHP': /\bphp\b/i,
            'Swift': /\bswift\b/i,
            'Kotlin': /\bkotlin\b|\.kt\b/i,
            'Scala': /\bscala\b/i,
            'Haskell': /\bhaskell\b|\.hs\b/i,
            'Elixir': /\belixir\b|\.ex\b/i,
        };

        Object.entries(languagePatterns).forEach(([lang, pattern]) => {
            if (pattern.test(text)) {
                languages.add(lang);
            }
        });

        return languages;
    }

    /**
     * Detect frameworks and libraries
     */
    private detectFrameworks(text: string): Set<string> {
        const frameworks = new Set<string>();

        const frameworkPatterns: Record<string, RegExp> = {
            'React': /\breact\b/i,
            'Vue': /\bvue(\.js)?\b/i,
            'Angular': /\bangular\b/i,
            'Svelte': /\bsvelte\b/i,
            'Next.js': /\bnext(\.js|js)?\b/i,
            'Nuxt': /\bnuxt\b/i,
            'Express': /\bexpress(\.js)?\b/i,
            'Fastify': /\bfastify\b/i,
            'Koa': /\bkoa\b/i,
            'Django': /\bdjango\b/i,
            'Flask': /\bflask\b/i,
            'Spring': /\bspring\b/i,
            'Laravel': /\blaravel\b/i,
            'Rails': /\b(rails|ruby on rails)\b/i,
            'ASP.NET': /\basp\.net\b/i,
            'Gin': /\bgin\b/i,
            'Fiber': /\bfiber\b/i,
        };

        Object.entries(frameworkPatterns).forEach(([framework, pattern]) => {
            if (pattern.test(text)) {
                frameworks.add(framework);
            }
        });

        return frameworks;
    }

    /**
     * Detect development tools
     */
    private detectTools(text: string): Set<string> {
        const tools = new Set<string>();

        const toolPatterns: Record<string, RegExp> = {
            'Git': /\bgit\b/i,
            'Docker': /\bdocker\b/i,
            'Kubernetes': /\b(kubernetes|k8s)\b/i,
            'npm': /\bnpm\b/i,
            'yarn': /\byarn\b/i,
            'pnpm': /\bpnpm\b/i,
            'Webpack': /\bwebpack\b/i,
            'Vite': /\bvite\b/i,
            'Rollup': /\brollup\b/i,
            'Jest': /\bjest\b/i,
            'Vitest': /\bvitest\b/i,
            'Mocha': /\bmocha\b/i,
            'Cypress': /\bcypress\b/i,
            'Playwright': /\bplaywright\b/i,
            'ESLint': /\beslint\b/i,
            'Prettier': /\bprettier\b/i,
            'Babel': /\bbabel\b/i,
        };

        Object.entries(toolPatterns).forEach(([tool, pattern]) => {
            if (pattern.test(text)) {
                tools.add(tool);
            }
        });

        return tools;
    }

    /**
     * Detect platforms
     */
    private detectPlatforms(text: string): Set<string> {
        const platforms = new Set<string>();

        const platformPatterns: Record<string, RegExp> = {
            'Node.js': /\bnode(\.js|js)?\b/i,
            'Browser': /\b(browser|dom|window)\b/i,
            'AWS': /\baws\b|amazon web services/i,
            'Azure': /\bazure\b/i,
            'GCP': /\b(gcp|google cloud)\b/i,
            'Vercel': /\bvercel\b/i,
            'Netlify': /\bnetlify\b/i,
            'Heroku': /\bheroku\b/i,
        };

        Object.entries(platformPatterns).forEach(([platform, pattern]) => {
            if (pattern.test(text)) {
                platforms.add(platform);
            }
        });

        return platforms;
    }

    /**
     * Group conversations by detected technologies
     */
    private groupByTech(
        conversations: Conversation[],
        conversationTech: Map<string, TechDetection>
    ): SemanticCluster[] {
        const clusters: SemanticCluster[] = [];

        // Group by primary language
        const byLanguage = this.groupByCategory(
            conversations,
            conversationTech,
            'languages',
            'Language'
        );
        clusters.push(...byLanguage);

        // Group by framework
        const byFramework = this.groupByCategory(
            conversations,
            conversationTech,
            'frameworks',
            'Framework'
        );
        clusters.push(...byFramework);

        // Group by tool
        const byTool = this.groupByCategory(
            conversations,
            conversationTech,
            'tools',
            'Tool'
        );
        clusters.push(...byTool);

        return clusters;
    }

    /**
     * Group conversations by a technology category
     */
    private groupByCategory(
        conversations: Conversation[],
        conversationTech: Map<string, TechDetection>,
        category: keyof TechDetection,
        labelPrefix: string
    ): SemanticCluster[] {
        // Group conversations by tech
        const groups = new Map<string, Conversation[]>();

        conversations.forEach(conv => {
            const tech = conversationTech.get(conv.sessionId);
            if (!tech) return;

            const techs = tech[category];
            if (techs.size === 0) return;

            // Add to all relevant tech groups
            techs.forEach(techName => {
                if (!groups.has(techName)) {
                    groups.set(techName, []);
                }
                groups.get(techName)!.push(conv);
            });
        });

        // Create clusters
        const clusters: SemanticCluster[] = [];

        groups.forEach((convs, techName) => {
            if (convs.length < 2) return; // Skip small groups

            const references: ConversationReference[] = convs.map(conv => ({
                sessionId: conv.sessionId,
                projectName: conv.projectContext.name,
                timestamp: conv.getStartTime(),
                relevanceScore: 1.0
            }));

            // Collect all techs for this cluster
            const allTechs = this.collectTechStack(convs, conversationTech);

            const cluster = new SemanticCluster(
                `${techName}-cluster`,
                ClusterType.TECH_STACK,
                `${labelPrefix}: ${techName}`,
                [techName],
                references,
                {
                    techStack: allTechs,
                    primaryTech: techName,
                    category: labelPrefix
                }
            );

            clusters.push(cluster);
        });

        return clusters;
    }

    /**
     * Collect full tech stack from conversations
     */
    private collectTechStack(
        conversations: Conversation[],
        conversationTech: Map<string, TechDetection>
    ): TechStackInfo {
        const languages = new Set<string>();
        const frameworks = new Set<string>();
        const tools = new Set<string>();
        const platforms = new Set<string>();

        conversations.forEach(conv => {
            const tech = conversationTech.get(conv.sessionId);
            if (!tech) return;

            tech.languages.forEach(l => languages.add(l));
            tech.frameworks.forEach(f => frameworks.add(f));
            tech.tools.forEach(t => tools.add(t));
            tech.platforms.forEach(p => platforms.add(p));
        });

        return {
            languages: Array.from(languages),
            frameworks: Array.from(frameworks),
            tools: Array.from(tools),
            platforms: Array.from(platforms)
        };
    }

    /**
     * Get technology distribution
     */
    getTechDistribution(conversations: Conversation[]): Map<string, number> {
        const distribution = new Map<string, number>();

        conversations.forEach(conv => {
            const text = conv.getSearchableContent();
            const tech = this.detectTechnologies(text);

            // Count all technologies
            [...tech.languages, ...tech.frameworks, ...tech.tools, ...tech.platforms].forEach(t => {
                distribution.set(t, (distribution.get(t) || 0) + 1);
            });
        });

        return distribution;
    }

    /**
     * Get most used technology
     */
    getMostUsedTech(conversations: Conversation[], limit: number = 10): Array<{ tech: string; count: number }> {
        const distribution = this.getTechDistribution(conversations);

        return Array.from(distribution.entries())
            .map(([tech, count]) => ({ tech, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
}
