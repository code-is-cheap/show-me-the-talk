import { ConversationApplicationService } from '../../application/services/ConversationApplicationService.js';
import { JsonlConversationRepository } from '../persistence/JsonlConversationRepository.js';
import { FileExportService } from '../filesystem/FileExportService.js';
import { TUIService } from '../tui/TUIService.js';

export class Container {
    private static instance: Container;
    private services = new Map<string, any>();

    private constructor() {}

    static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }

    registerServices(claudeDir: string): void {
        // Register repositories
        const conversationRepository = new JsonlConversationRepository(claudeDir);
        this.services.set('ConversationRepository', conversationRepository);

        // Register infrastructure services
        const exportRepository = new FileExportService();
        this.services.set('ExportRepository', exportRepository);

        // Register application services
        const conversationAppService = new ConversationApplicationService(
            conversationRepository,
            exportRepository
        );
        this.services.set('ConversationApplicationService', conversationAppService);

        // Register TUI services
        const tuiService = new TUIService(conversationAppService, exportRepository);
        this.services.set('TUIService', tuiService);
    }

    get<T>(serviceName: string): T {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Service ${serviceName} not found`);
        }
        return service;
    }

    // Factory method for creating pre-configured container
    static createConfiguredContainer(claudeDir: string = './claude'): Container {
        const container = Container.getInstance();
        container.registerServices(claudeDir);
        return container;
    }
}