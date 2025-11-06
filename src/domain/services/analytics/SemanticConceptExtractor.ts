import nlp from 'compromise';
import { Conversation } from '../../models/Conversation.js';
import { ConceptEntry } from '../../models/analytics/index.js';
import { ConversationTextAnalyzer } from './ConversationTextAnalyzer.js';

/**
 * Concept extraction configuration
 */
export interface ConceptExtractionConfig {
    minOccurrences: number;
    maxConcepts: number;
    includeCodeConcepts: boolean;
    includeToolConcepts: boolean;
}

/**
 * Extracts semantic concepts from conversations using NLP
 */
export class SemanticConceptExtractor {
    private textAnalyzer: ConversationTextAnalyzer;

    constructor(textAnalyzer?: ConversationTextAnalyzer) {
        this.textAnalyzer = textAnalyzer || new ConversationTextAnalyzer();
    }

    /**
     * Extract concepts from conversations
     */
    extractConcepts(
        conversations: Conversation[],
        config: Partial<ConceptExtractionConfig> = {}
    ): ConceptEntry[] {
        const fullConfig = this.getDefaultConfig(config);

        // Track concepts across conversations
        const conceptMap = new Map<string, {
            relatedTerms: Set<string>;
            occurrences: number;
            conversationIds: Set<string>;
        }>();

        conversations.forEach(conversation => {
            const concepts = this.extractFromConversation(conversation, fullConfig);

            concepts.forEach(concept => {
                if (!conceptMap.has(concept.concept)) {
                    conceptMap.set(concept.concept, {
                        relatedTerms: new Set(),
                        occurrences: 0,
                        conversationIds: new Set()
                    });
                }

                const data = conceptMap.get(concept.concept)!;
                data.occurrences += concept.occurrences;
                concept.relatedTerms.forEach(term => data.relatedTerms.add(term));
                concept.conversationIds.forEach(id => data.conversationIds.add(id));
            });
        });

        // Convert to ConceptEntry array
        const entries: ConceptEntry[] = [];
        conceptMap.forEach((data, concept) => {
            if (data.occurrences >= fullConfig.minOccurrences) {
                entries.push({
                    concept,
                    relatedTerms: Array.from(data.relatedTerms),
                    occurrences: data.occurrences,
                    conversationIds: Array.from(data.conversationIds)
                });
            }
        });

        // Sort by occurrences and limit
        entries.sort((a, b) => b.occurrences - a.occurrences);
        return entries.slice(0, fullConfig.maxConcepts);
    }

    /**
     * Extract concepts from a single conversation
     */
    private extractFromConversation(
        conversation: Conversation,
        config: ConceptExtractionConfig
    ): ConceptEntry[] {
        const concepts: ConceptEntry[] = [];
        const text = conversation.getSearchableContent();

        // Extract noun phrases as concepts
        const nounPhrases = this.extractNounPhrases(text);
        concepts.push(...nounPhrases.map(phrase => ({
            concept: phrase,
            relatedTerms: [],
            occurrences: 1,
            conversationIds: [conversation.sessionId]
        })));

        // Extract technical concepts
        if (config.includeCodeConcepts) {
            const codeConcepts = this.extractCodeConcepts(text);
            concepts.push(...codeConcepts.map(concept => ({
                concept,
                relatedTerms: [],
                occurrences: 1,
                conversationIds: [conversation.sessionId]
            })));
        }

        // Extract tool/workflow concepts
        if (config.includeToolConcepts) {
            const toolConcepts = this.extractToolConcepts(text);
            concepts.push(...toolConcepts.map(concept => ({
                concept,
                relatedTerms: [],
                occurrences: 1,
                conversationIds: [conversation.sessionId]
            })));
        }

        return concepts;
    }

    /**
     * Extract noun phrases using NLP
     */
    private extractNounPhrases(text: string): string[] {
        const doc = nlp(text);
        const phrases = doc.nouns().out('array') as string[];

        // Filter and clean phrases
        return phrases
            .filter(phrase => phrase.split(' ').length >= 2) // Multi-word phrases only
            .filter(phrase => phrase.length > 3)              // Meaningful length
            .map(phrase => phrase.toLowerCase())
            .filter((phrase, index, self) => self.indexOf(phrase) === index); // Unique
    }

    /**
     * Extract code-related concepts
     */
    private extractCodeConcepts(text: string): string[] {
        const concepts = new Set<string>();

        // Programming patterns
        const patterns = {
            'error handling': /error[- ]?handl(ing|er)/gi,
            'data structure': /data[- ]?struct/gi,
            'algorithm': /algorithm|algo\b/gi,
            'API design': /api[- ]?design/gi,
            'database schema': /database[- ]?schema|db[- ]?schema/gi,
            'authentication': /auth(entication)?|oauth|jwt/gi,
            'authorization': /authorization|access[- ]?control/gi,
            'state management': /state[- ]?manag/gi,
            'dependency injection': /dependency[- ]?inject/gi,
            'test driven development': /tdd|test[- ]?driven/gi,
            'continuous integration': /ci\/cd|continuous[- ]?integrat/gi,
            'code review': /code[- ]?review/gi,
            'performance optimization': /perform.*optimi|optimi.*perform/gi,
            'memory leak': /memory[- ]?leak/gi,
            'race condition': /race[- ]?condition/gi,
            'async programming': /async|asynchronous[- ]?programm/gi,
        };

        Object.entries(patterns).forEach(([concept, pattern]) => {
            if (pattern.test(text)) {
                concepts.add(concept);
            }
        });

        return Array.from(concepts);
    }

    /**
     * Extract tool and workflow concepts
     */
    private extractToolConcepts(text: string): string[] {
        const concepts = new Set<string>();

        // Tool-related patterns
        const patterns = {
            'version control': /git|version[- ]?control|vcs/gi,
            'containerization': /docker|container/gi,
            'package management': /npm|yarn|pnpm|pip|cargo/gi,
            'build system': /webpack|vite|rollup|build[- ]?system/gi,
            'testing framework': /jest|vitest|mocha|pytest|testing[- ]?framework/gi,
            'linting': /eslint|prettier|lint/gi,
            'deployment': /deploy|ci\/cd|pipeline/gi,
            'monitoring': /monitor|observ|telemetry/gi,
        };

        Object.entries(patterns).forEach(([concept, pattern]) => {
            if (pattern.test(text)) {
                concepts.add(concept);
            }
        });

        return Array.from(concepts);
    }

    /**
     * Find related terms for a concept
     */
    findRelatedTerms(concept: string, text: string, limit: number = 5): string[] {
        const doc = nlp(text);

        // Find sentences containing the concept
        const sentences = doc.sentences().out('array') as string[];
        const relevantSentences = sentences.filter(s =>
            s.toLowerCase().includes(concept.toLowerCase())
        );

        // Extract nouns and verbs from those sentences
        const relatedTerms = new Set<string>();
        relevantSentences.forEach(sentence => {
            const sentenceDoc = nlp(sentence);
            const nouns = sentenceDoc.nouns().out('array') as string[];
            const verbs = sentenceDoc.verbs().out('array') as string[];

            [...nouns, ...verbs].forEach(term => {
                const normalized = term.toLowerCase();
                if (normalized !== concept.toLowerCase() && normalized.length > 3) {
                    relatedTerms.add(normalized);
                }
            });
        });

        return Array.from(relatedTerms).slice(0, limit);
    }

    /**
     * Categorize concepts by type
     */
    categorizeConcepts(concepts: ConceptEntry[]): Map<string, ConceptEntry[]> {
        const categories = new Map<string, ConceptEntry[]>();

        const categoryPatterns = {
            'Architecture': /design|pattern|architecture|structure|component/i,
            'Development': /develop|implement|build|create|code/i,
            'Testing': /test|quality|coverage|assertion/i,
            'Performance': /performance|optimi|speed|memory|efficient/i,
            'Security': /security|auth|encrypt|vulnerability|safe/i,
            'DevOps': /deploy|ci|cd|pipeline|docker|kubernetes/i,
            'Database': /database|query|schema|migration|orm/i,
            'Frontend': /ui|ux|component|react|vue|angular/i,
            'Backend': /api|server|backend|endpoint|middleware/i,
        };

        concepts.forEach(concept => {
            let assigned = false;

            for (const [category, pattern] of Object.entries(categoryPatterns)) {
                if (pattern.test(concept.concept) || concept.relatedTerms.some(t => pattern.test(t))) {
                    if (!categories.has(category)) {
                        categories.set(category, []);
                    }
                    categories.get(category)!.push(concept);
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                if (!categories.has('General')) {
                    categories.set('General', []);
                }
                categories.get('General')!.push(concept);
            }
        });

        return categories;
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(partial: Partial<ConceptExtractionConfig>): ConceptExtractionConfig {
        return {
            minOccurrences: partial.minOccurrences ?? 2,
            maxConcepts: partial.maxConcepts ?? 50,
            includeCodeConcepts: partial.includeCodeConcepts ?? true,
            includeToolConcepts: partial.includeToolConcepts ?? true
        };
    }

    /**
     * Extract key topics from concepts
     */
    extractKeyTopics(concepts: ConceptEntry[], limit: number = 10): string[] {
        // Get most frequent concepts
        const sorted = [...concepts].sort((a, b) => b.occurrences - a.occurrences);

        return sorted.slice(0, limit).map(c => c.concept);
    }
}
