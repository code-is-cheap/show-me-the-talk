import { ConversationApplicationService } from '../../application/services/ConversationApplicationService.js';
import { ExportFormat as AppExportFormat } from '../../application/dto/ExportDto.js';
import { VisualTimelineRenderer } from './components/VisualTimelineRenderer.js';
import { searchConversations } from './utils/conversationUtils.js';

export interface TUIConfig {
    claudeDir: string;
    debug: boolean;
}

export class ComprehensiveInkTUI {
    private conversationService: ConversationApplicationService;
    private options: TUIConfig;

    constructor(conversationService: ConversationApplicationService, options: TUIConfig = { claudeDir: '', debug: false }) {
        this.conversationService = conversationService;
        this.options = options;
    }

    async start(): Promise<void> {
        try {
            // Check environment first
            if (!process.stdin.isTTY) {
                console.error('Error: This TUI requires a TTY environment');
                console.error('Please run this in a proper terminal, not through pipes or redirects');
                process.exit(1);
            }

            console.log('🚀 Starting Comprehensive Ink TUI...');
            console.log(`Terminal: ${process.stdout.columns}x${process.stdout.rows}`);
            console.log('');

            // ESM imports - 直接解构
            const React = await import('react');
            const { render, Box, Text, useInput, useApp } = await import('ink');

            // Main Ink App Component
            const InkTUIApp = () => {
                const { exit } = useApp();

                // Initialize state with proper defaults
                const [state, setState] = React.useState({
                    currentScreen: 'loading',
                    selectedProjectIndex: 0,
                    selectedConversationIndex: 0,
                    selectedMessageIndex: 0,
                    selectedExportFormat: 'html',
                    projects: [],
                    conversations: [],
                    filteredConversations: [],
                    currentMessageIndex: 0,
                    scrollOffset: 0,
                    messagesPerPage: 10,
                    userMessagesOnly: false,
                    searchQuery: '',
                    searchResults: [],
                    filterCategory: 'all',
                    sortBy: 'date',
                    isSearchActive: false,
                    loading: true,
                    showHelp: false,
                    includeMetadata: true,
                    importMode: false,
                    importId: '',
                    currentPage: 0,
                    itemsPerPage: 20,
                    totalItems: 0
                });

                // Load initial data on mount
                React.useEffect(() => {
                    this.loadInitialData(setState);
                }, []);

                // Status message auto-clear
                React.useEffect(() => {
                    if ((state as any).statusMessage) {
                        const timer = setTimeout(() => {
                            setState((prev: any) => ({ ...prev, statusMessage: undefined }));
                        }, 3000);
                        return () => clearTimeout(timer);
                    }
                }, [(state as any).statusMessage]);

                // Handle keyboard input
                useInput((input: string, key: any) => {
                    this.handleInput(input, key, state, setState, exit);
                });

                // Render current screen
                return this.renderScreen(state, setState, React, { Box, Text });
            };

            // Render with Ink
            const { waitUntilExit } = render(React.createElement(InkTUIApp));

            // Wait for exit
            await waitUntilExit();
            console.log('\n👋 Comprehensive Ink TUI completed');
        } catch (error) {
            console.error('Failed to start Comprehensive Ink TUI:', error);
            throw error;
        }
    }

    private async loadInitialData(setState: any): Promise<void> {
        try {
            // Access repository to get domain objects
            const conversationRepo = (this.conversationService as any)['conversationRepository'];

            // Load all conversations as domain objects
            const allConversations = await conversationRepo.findAll();

            // Get all projects
            const allProjects = await conversationRepo.getAllProjects();

            // Filter out empty projects and conversations
            const validProjects = allProjects.filter((project: any) => {
                const projectConversations = allConversations.filter((conv: any) => 
                    conv.projectContext?.getOriginalPath() === project.getOriginalPath()
                );
                return projectConversations.length > 0;
            });

            setState((prev: any) => ({
                ...prev,
                projects: validProjects,
                conversations: allConversations,
                filteredConversations: allConversations,
                totalItems: validProjects.length,
                loading: false,
                selectedProjectIndex: 0,
                selectedConversationIndex: 0,
                currentScreen: validProjects.length > 0 ? 'project-list' : 'error',
                error: validProjects.length === 0 ? 'No conversations found' : undefined,
                statusMessage: validProjects.length > 0 
                    ? `Loaded ${allConversations.length} conversations from ${validProjects.length} projects` 
                    : undefined
            }));
        } catch (error) {
            setState((prev: any) => ({
                ...prev,
                loading: false,
                currentScreen: 'error',
                error: `Failed to load conversations: ${error instanceof Error ? error.message : 'Unknown error'}`
            }));
        }
    }

    private handleInput(input: string, key: any, state: any, setState: any, exit: () => void): void {
        // Handle Ctrl+C globally
        if (key.ctrl && input === 'c') {
            exit();
            return;
        }

        // Handle screen-specific input
        switch (state.currentScreen) {
            case 'project-list':
                this.handleProjectListInput(input, key, state, setState);
                break;
            case 'conversation-list':
                this.handleConversationListInput(input, key, state, setState);
                break;
            case 'message-detail':
                this.handleMessageDetailInput(input, key, state, setState);
                break;
            case 'search':
                this.handleSearchInput(input, key, state, setState);
                break;
            case 'export-options':
                this.handleExportInput(input, key, state, setState);
                break;
            case 'import':
                this.handleImportInput(input, key, state, setState);
                break;
            case 'help':
                this.handleHelpInput(input, key, state, setState);
                break;
            case 'error':
                this.handleErrorInput(input, key, state, setState);
                break;
        }
    }

    private handleProjectListInput(input: string, key: any, state: any, setState: any): void {
        if (key.upArrow || input === 'k') {
            setState((prev: any) => ({
                ...prev,
                selectedProjectIndex: Math.max(0, prev.selectedProjectIndex - 1)
            }));
        } else if (key.downArrow || input === 'j') {
            setState((prev: any) => ({
                ...prev,
                selectedProjectIndex: Math.min(prev.projects.length - 1, prev.selectedProjectIndex + 1)
            }));
        } else if (key.return || input === '\r') {
            this.selectProject(state, setState);
        } else if (input === 'q') {
            process.exit(0);
        } else if (input === 'h' || input === '?') {
            setState((prev: any) => ({ ...prev, currentScreen: 'help' }));
        }
    }

    private selectProject(state: any, setState: any): void {
        const selectedProject = state.projects[state.selectedProjectIndex];
        if (!selectedProject) return;

        const projectConversations = state.conversations.filter((conv: any) => 
            conv.projectContext?.getOriginalPath() === selectedProject.getOriginalPath()
        );

        setState((prev: any) => ({
            ...prev,
            currentProject: selectedProject,
            filteredConversations: projectConversations,
            selectedConversationIndex: 0,
            currentScreen: 'conversation-list',
            statusMessage: `Selected project: ${selectedProject.getOriginalPath().split('/').pop()}`
        }));
    }

    private handleConversationListInput(input: string, key: any, state: any, setState: any): void {
        if (key.upArrow || input === 'k') {
            setState((prev: any) => ({
                ...prev,
                selectedConversationIndex: Math.max(0, prev.selectedConversationIndex - 1)
            }));
        } else if (key.downArrow || input === 'j') {
            setState((prev: any) => ({
                ...prev,
                selectedConversationIndex: Math.min(prev.filteredConversations.length - 1, prev.selectedConversationIndex + 1)
            }));
        } else if (key.return || input === '\r') {
            this.selectConversation(state, setState);
        } else if (input === 's' || input === '/') {
            setState((prev: any) => ({
                ...prev,
                currentScreen: 'search',
                isSearchActive: true,
                searchQuery: ''
            }));
        } else if (input === 'e') {
            setState((prev: any) => ({ ...prev, currentScreen: 'export-options' }));
        } else if (input === 'i') {
            setState((prev: any) => ({
                ...prev,
                currentScreen: 'import',
                importMode: true,
                importId: ''
            }));
        } else if (key.escape || input === '\u001b') {
            setState((prev: any) => ({ ...prev, currentScreen: 'project-list' }));
        } else if (input === 'q') {
            process.exit(0);
        } else if (input === 'h' || input === '?') {
            setState((prev: any) => ({ ...prev, currentScreen: 'help' }));
        }
    }

    private selectConversation(state: any, setState: any): void {
        const selectedConversation = state.filteredConversations[state.selectedConversationIndex];
        if (!selectedConversation) return;

        setState((prev: any) => ({
            ...prev,
            currentConversation: selectedConversation,
            currentMessageIndex: 0,
            scrollOffset: 0,
            userMessagesOnly: false,
            currentScreen: 'message-detail',
            statusMessage: `Viewing conversation: ${selectedConversation.title || 'Untitled'}`
        }));
    }

    private handleMessageDetailInput(input: string, key: any, state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        if (key.leftArrow || input === 'h') {
            this.navigateToPreviousMessage(state, setState);
        } else if (key.rightArrow || input === 'l') {
            this.navigateToNextMessage(state, setState);
        } else if (input === 'j') {
            this.navigateToNextMessage(state, setState);
        } else if (input === 'k') {
            this.navigateToPreviousMessage(state, setState);
        } else if (input === 'u') {
            // Navigate to next user message
            this.navigateToNextUserMessage(state, setState);
        } else if (input === 'U') {
            // Navigate to previous user message
            this.navigateToPreviousUserMessage(state, setState);
        } else if (input === 'i') {
            setState((prev: any) => ({
                ...prev,
                currentScreen: 'import',
                importMode: true,
                importId: ''
            }));
        } else if (key.upArrow) {
            setState((prev: any) => ({
                ...prev,
                scrollOffset: Math.max(0, prev.scrollOffset - 1)
            }));
        } else if (key.downArrow) {
            setState((prev: any) => ({
                ...prev,
                scrollOffset: prev.scrollOffset + 1
            }));
        } else if (key.escape || input === '\u001b') {
            setState((prev: any) => ({ ...prev, currentScreen: 'conversation-list' }));
        } else if (input === 'q') {
            process.exit(0);
        } else if (input === 'h' || input === '?') {
            setState((prev: any) => ({ ...prev, currentScreen: 'help' }));
        }
    }

    private navigateToNextMessage(state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        const nextIndex = Math.min(conversation.messages.length - 1, state.currentMessageIndex + 1);
        setState((prev: any) => ({
            ...prev,
            currentMessageIndex: nextIndex,
            scrollOffset: 0
        }));
    }

    private navigateToPreviousMessage(state: any, setState: any): void {
        const prevIndex = Math.max(0, state.currentMessageIndex - 1);
        setState((prev: any) => ({
            ...prev,
            currentMessageIndex: prevIndex,
            scrollOffset: 0
        }));
    }

    private navigateToNextUserMessage(state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        const messages = conversation.messages;
        const currentIndex = state.currentMessageIndex;

        // Find next user message
        for (let i = currentIndex + 1; i < messages.length; i++) {
            const message = messages[i];
            const messageType = this.getMessageType(message);
            if (messageType === 'user') {
                setState((prev: any) => ({
                    ...prev,
                    currentMessageIndex: i,
                    scrollOffset: 0,
                    statusMessage: `Jumped to next user message (${i + 1}/${messages.length})`
                }));
                return;
            }
        }

        setState((prev: any) => ({
            ...prev,
            statusMessage: 'No more user messages found'
        }));
    }

    private navigateToPreviousUserMessage(state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        const messages = conversation.messages;
        const currentIndex = state.currentMessageIndex;

        // Find previous user message
        for (let i = currentIndex - 1; i >= 0; i--) {
            const message = messages[i];
            const messageType = this.getMessageType(message);
            if (messageType === 'user') {
                setState((prev: any) => ({
                    ...prev,
                    currentMessageIndex: i,
                    scrollOffset: 0,
                    statusMessage: `Jumped to previous user message (${i + 1}/${messages.length})`
                }));
                return;
            }
        }

        setState((prev: any) => ({
            ...prev,
            statusMessage: 'No previous user messages found'
        }));
    }

    private handleSearchInput(input: string, key: any, state: any, setState: any): void {
        if (key.escape || input === '\u001b') {
            setState((prev: any) => ({
                ...prev,
                currentScreen: 'conversation-list',
                isSearchActive: false,
                searchQuery: ''
            }));
        } else if (key.return || input === '\r') {
            this.performSearch(state, setState);
        } else if (key.backspace || key.delete) {
            setState((prev: any) => ({
                ...prev,
                searchQuery: prev.searchQuery.slice(0, -1)
            }));
        } else if (input && input.length === 1 && input.charCodeAt(0) >= 32) {
            setState((prev: any) => ({
                ...prev,
                searchQuery: prev.searchQuery + input
            }));
        }
    }

    private performSearch(state: any, setState: any): void {
        if (!state.searchQuery.trim()) {
            setState((prev: any) => ({
                ...prev,
                currentScreen: 'conversation-list',
                isSearchActive: false
            }));
            return;
        }

        const searchResults = searchConversations(state.conversations, state.searchQuery);
        setState((prev: any) => ({
            ...prev,
            searchResults,
            filteredConversations: searchResults,
            selectedConversationIndex: 0,
            currentScreen: 'conversation-list',
            isSearchActive: true,
            statusMessage: `Found ${searchResults.length} conversations matching "${state.searchQuery}"`
        }));
    }

    private handleExportInput(input: string, key: any, state: any, setState: any): void {
        if (key.escape || input === '\u001b') {
            setState((prev: any) => ({ ...prev, currentScreen: 'conversation-list' }));
        } else if (key.upArrow || input === 'k') {
            const formats = ['html', 'markdown', 'json', 'simple'];
            const currentIndex = formats.indexOf(state.selectedExportFormat);
            const newIndex = currentIndex > 0 ? currentIndex - 1 : formats.length - 1;
            setState((prev: any) => ({ ...prev, selectedExportFormat: formats[newIndex] }));
        } else if (key.downArrow || input === 'j') {
            const formats = ['html', 'markdown', 'json', 'simple'];
            const currentIndex = formats.indexOf(state.selectedExportFormat);
            const newIndex = currentIndex < formats.length - 1 ? currentIndex + 1 : 0;
            setState((prev: any) => ({ ...prev, selectedExportFormat: formats[newIndex] }));
        } else if (input === 'm') {
            setState((prev: any) => ({ ...prev, includeMetadata: !prev.includeMetadata }));
        } else if (key.return || input === '\r') {
            this.performExport(state, setState);
        }
    }

    private async performExport(state: any, setState: any): Promise<void> {
        try {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'Exporting conversations...',
                loading: true
            }));

            const conversationsToExport = state.isSearchActive ? state.searchResults : state.filteredConversations;

            // Convert to DTO format for export
            const conversationDtos = conversationsToExport.map((conv: any) => ({
                id: conv.id,
                title: conv.title,
                messages: conv.messages.map((msg: any) => ({
                    role: this.getMessageType(msg),
                    content: msg.getContent(),
                    timestamp: msg.timestamp
                })),
                projectContext: conv.projectContext ? {
                    originalPath: conv.projectContext.getOriginalPath()
                } : undefined,
                metadata: state.includeMetadata ? {
                    messageCount: conv.messages.length,
                    startTime: conv.messages[0]?.timestamp,
                    endTime: conv.messages[conv.messages.length - 1]?.timestamp,
                    participants: ['user', 'assistant']
                } : undefined
            }));

            // Use the conversation service to export
            const appFormat = this.mapToAppExportFormat(state.selectedExportFormat);
            const outputPath = `conversations-${Date.now()}.${this.getFileExtension(state.selectedExportFormat)}`;

            await this.conversationService.exportConversations({
                format: appFormat,
                outputPath,
                includeMetadata: state.includeMetadata
            });

            setState((prev: any) => ({
                ...prev,
                loading: false,
                statusMessage: `Successfully exported ${conversationsToExport.length} conversations to ${outputPath}`,
                lastExportPath: outputPath,
                currentScreen: 'conversation-list'
            }));
        } catch (error) {
            setState((prev: any) => ({
                ...prev,
                loading: false,
                error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                currentScreen: 'error'
            }));
        }
    }

    private handleImportInput(input: string, key: any, state: any, setState: any): void {
        if (key.escape || input === '\u001b') {
            setState((prev: any) => ({
                ...prev,
                currentScreen: 'conversation-list',
                importMode: false,
                importId: ''
            }));
        } else if (key.return || input === '\r') {
            this.performImport(state, setState);
        } else if (key.backspace || key.delete) {
            setState((prev: any) => ({
                ...prev,
                importId: prev.importId.slice(0, -1)
            }));
        } else if (input && input.length === 1) {
            // Only allow alphanumeric characters, hyphens, and underscores
            if (/[a-zA-Z0-9\-_]/.test(input)) {
                setState((prev: any) => ({
                    ...prev,
                    importId: prev.importId + input
                }));
            }
        }
    }

    private async performImport(state: any, setState: any): Promise<void> {
        const trimmedId = state.importId.trim();
        
        // Validate conversation ID
        if (trimmedId.length < 8) {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'Conversation ID must be at least 8 characters long'
            }));
            return;
        }

        if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedId)) {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'Conversation ID can only contain letters, numbers, hyphens, and underscores'
            }));
            return;
        }

        try {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'Searching for conversation...',
                loading: true
            }));

            // Check if conversation already exists
            const existingConversation = state.conversations.find((conv: any) => 
                conv.id === trimmedId ||
                conv.title?.includes(trimmedId) ||
                conv.messages.some((msg: any) => msg.getContent().includes(trimmedId))
            );

            if (existingConversation) {
                setState((prev: any) => ({
                    ...prev,
                    loading: false,
                    currentConversation: existingConversation,
                    currentMessageIndex: 0,
                    scrollOffset: 0,
                    currentScreen: 'message-detail',
                    importMode: false,
                    importId: '',
                    statusMessage: `Found and opened conversation: ${existingConversation.title || trimmedId}`
                }));
                return;
            }

            // If not found, show message
            setState((prev: any) => ({
                ...prev,
                loading: false,
                statusMessage: `Conversation with ID "${trimmedId}" not found in current dataset`,
                importMode: false,
                importId: '',
                currentScreen: 'conversation-list'
            }));
        } catch (error) {
            setState((prev: any) => ({
                ...prev,
                loading: false,
                error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                currentScreen: 'error'
            }));
        }
    }

    private handleHelpInput(input: string, key: any, state: any, setState: any): void {
        if (input === 'h' || input === '?' || key.escape || input === '\u001b') {
            setState((prev: any) => ({
                ...prev,
                currentScreen: (prev as any).currentConversation ? 'message-detail' : 'conversation-list',
                showHelp: false
            }));
        }
    }

    private handleErrorInput(input: string, key: any, state: any, setState: any): void {
        setState((prev: any) => ({
            ...prev,
            currentScreen: 'project-list',
            error: undefined
        }));
    }

    private renderScreen(state: any, setState: any, React: any, inkComponents: any): any {
        const { Box, Text } = inkComponents;
        
        switch (state.currentScreen) {
            case 'loading':
                return this.renderLoadingScreen(React, Box, Text);
            case 'project-list':
                return this.renderProjectListScreen(state, React, Box, Text);
            case 'conversation-list':
                return this.renderConversationListScreen(state, React, Box, Text);
            case 'message-detail':
                return this.renderMessageDetailScreen(state, React, Box, Text);
            case 'search':
                return this.renderSearchScreen(state, React, Box, Text);
            case 'export-options':
                return this.renderExportScreen(state, React, Box, Text);
            case 'import':
                return this.renderImportScreen(state, React, Box, Text);
            case 'help':
                return this.renderHelpScreen(state, React, Box, Text);
            case 'error':
                return this.renderErrorScreen(state, React, Box, Text);
            default:
                return React.createElement(Text, { color: 'red' }, 'Unknown screen');
        }
    }

    private renderLoadingScreen(React: any, Box: any, Text: any): any {
        return React.createElement(Box, {
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: process.stdout.rows || 24
        }, [
            React.createElement(Text, { key: 'loading', color: 'cyan' }, '⏳ Loading conversations...'),
            React.createElement(Text, { key: 'wait', color: 'gray' }, 'Please wait while we scan your Claude directory')
        ]);
    }

    private renderProjectListScreen(state: any, React: any, Box: any, Text: any): any {
        const items = state.projects.map((project: any, index: number) => {
            const isSelected = index === state.selectedProjectIndex;
            const projectName = project.getOriginalPath().split('/').pop() || project.getOriginalPath();
            const conversationCount = state.conversations.filter((conv: any) => 
                conv.projectContext?.getOriginalPath() === project.getOriginalPath()
            ).length;
            
            return React.createElement(Text, {
                key: index,
                color: isSelected ? 'black' : 'blue',
                backgroundColor: isSelected ? 'cyan' : undefined,
                bold: isSelected
            }, `${isSelected ? '▶ ' : '  '}📁 ${projectName} (${conversationCount} conversations)`);
        });

        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' }, 
                React.createElement(Text, { bold: true, color: 'blue' }, ' Show Me The Talk - Project Selection ')
            ),
            React.createElement(Text, { key: 'instruction', color: 'gray' }, '  Select a project to view conversations:'),
            React.createElement(Box, { key: 'spacer1' }),
            React.createElement(Box, { key: 'items', flexDirection: 'column' }, items),
            React.createElement(Box, { key: 'spacer2' }),
            React.createElement(Box, { key: 'status', borderStyle: 'single', borderColor: 'gray' }, 
                React.createElement(Text, { color: 'gray' }, ' ↑↓/jk:navigate | ↵:select | q:quit | h:help ')
            )
        ]);
    }

    private renderConversationListScreen(state: any, React: any, Box: any, Text: any): any {
        const projectName = state.currentProject?.getOriginalPath().split('/').pop() || 'All Projects';
        const conversations = state.filteredConversations;
        
        const items = conversations.slice(0, 20).map((conversation: any, index: number) => {
            const isSelected = index === state.selectedConversationIndex;
            const time = conversation.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const messageCount = conversation.messages.length;
            const title = conversation.title || 'Untitled';
            
            return React.createElement(Text, {
                key: index,
                color: isSelected ? 'black' : 'white',
                backgroundColor: isSelected ? 'cyan' : undefined,
                bold: isSelected
            }, `${isSelected ? '▶ ' : '  '}[${time}] ${title} (${messageCount} msgs) 👤→🤖`);
        });

        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' }, 
                React.createElement(Text, { bold: true, color: 'blue' }, ` ${projectName} - ${conversations.length} conversations `)
            ),
            state.statusMessage && React.createElement(Text, { key: 'status', color: 'cyan' }, `ℹ️  ${state.statusMessage}`),
            state.isSearchActive && React.createElement(Text, { key: 'search', color: 'yellow' }, 
                `🔍 Search: "${state.searchQuery}" (${state.searchResults.length} results)`
            ),
            React.createElement(Box, { key: 'spacer1' }),
            conversations.length === 0
                ? React.createElement(Text, { key: 'empty', color: 'yellow' }, '💬 No conversations found')
                : React.createElement(Box, { key: 'items', flexDirection: 'column' }, items),
            conversations.length > 20 && React.createElement(Text, { key: 'more', color: 'gray' }, 
                `... and ${conversations.length - 20} more`
            ),
            React.createElement(Box, { key: 'spacer2' }),
            React.createElement(Box, { key: 'controls', borderStyle: 'single', borderColor: 'gray' }, 
                React.createElement(Text, { color: 'gray' }, ' ↑↓:nav | ↵:view | s:search | e:export | i:import | ESC:back | h:help ')
            )
        ]);
    }

    private renderMessageDetailScreen(state: any, React: any, Box: any, Text: any): any {
        const conversation = state.currentConversation;
        if (!conversation) {
            return React.createElement(Text, { color: 'red' }, 'No conversation selected');
        }

        const messages = conversation.messages;
        const currentMsg = messages[state.currentMessageIndex];
        const modeIndicator = '';

        if (!currentMsg) {
            return React.createElement(Text, { color: 'red' }, 'No messages found');
        }

        const messageType = this.getMessageType(currentMsg);
        const isUser = messageType === 'user';
        const content = currentMsg.getContent();
        const timestamp = currentMsg.timestamp.toLocaleTimeString();

        // Wrap content to fit terminal
        const terminalWidth = (process.stdout.columns || 80) - 4;
        const lines = this.wrapText(content, terminalWidth);
        const visibleLines = lines.slice(state.scrollOffset, state.scrollOffset + 15);
        const contentElements = visibleLines.map((line: string, index: number) => 
            React.createElement(Text, { key: index }, `  ${line}`)
        );

        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' }, 
                React.createElement(Text, { bold: true, color: 'blue' }, 
                    ` ${this.truncateTitle(conversation.title || 'Conversation', 60)}${modeIndicator} - Message ${state.currentMessageIndex + 1}/${messages.length} `
                )
            ),
            state.statusMessage && React.createElement(Text, { key: 'status', color: 'cyan' }, `ℹ️  ${state.statusMessage}`),
            
            // Main timeline - Always visible with proper positioning
            this.renderMainTimeline(state, React, Box, Text),
            
            // Message content view
            React.createElement(Box, { key: 'message', flexDirection: 'column' }, [
                React.createElement(Text, {
                    key: 'header',
                    bold: true,
                    color: isUser ? 'green' : 'blue'
                }, `${isUser ? '👤' : '🤖'} ${isUser ? 'User' : 'Assistant'} [${timestamp}]:`),
                React.createElement(Box, { key: 'spacer' }),
                ...contentElements,
                lines.length > visibleLines.length + state.scrollOffset &&
                    React.createElement(Text, { key: 'more', color: 'gray' }, '  [More content below - scroll down to see]')
            ]),
            React.createElement(Box, { key: 'spacer2' }),
            React.createElement(Box, { key: 'controls', borderStyle: 'single', borderColor: 'gray' }, 
                React.createElement(Text, { color: 'gray' }, ' ↑↓:scroll | j/k:next/prev msg | u/U:user msgs | i:import | ESC:back ')
            )
        ]);
    }

    private renderMainTimeline(state: any, React: any, Box: any, Text: any): any {
        const conversation = state.currentConversation;
        if (!conversation)
            return null;
        const messages = conversation.messages;
        const currentIndex = state.currentMessageIndex;
        const terminalWidth = Math.min(process.stdout.columns || 80, 120);
        const timelineWidth = terminalWidth - 8;
        // 🧠 PERFECT 2D BLOCKS: Focus on precision
        // Step 1: Ensure EVERY message gets at least 1 width
        const totalMessages = messages.length;
        let messageWidths;
        if (totalMessages <= timelineWidth) {
            // Normal case: more space than messages
            const baseWidth = Math.floor(timelineWidth / totalMessages);
            const remainder = timelineWidth % totalMessages;
            messageWidths = messages.map((_: any, i: number) => {
                return Math.max(1, baseWidth + (i < remainder ? 1 : 0));
            });
        }
        else {
            // Dense case: more messages than width - give each 1 char, compress if needed
            const compressionFactor = timelineWidth / totalMessages;
            let usedWidth = 0;
            messageWidths = messages.map((_: any, i: number) => {
                const targetPosition = Math.floor(i * compressionFactor);
                const nextTargetPosition = Math.floor((i + 1) * compressionFactor);
                const width = Math.max(1, nextTargetPosition - targetPosition);
                // Ensure we don't exceed timeline width
                if (usedWidth + width > timelineWidth) {
                    return Math.max(1, timelineWidth - usedWidth);
                }
                usedWidth += width;
                return width;
            });
            // Adjust last few messages if we're under timeline width
            const totalUsed = messageWidths.reduce((sum: number, w: number) => sum + w, 0);
            if (totalUsed < timelineWidth) {
                const shortfall = timelineWidth - totalUsed;
                for (let i = 0; i < shortfall && i < messageWidths.length; i++) {
                    messageWidths[messageWidths.length - 1 - i]++;
                }
            }
        }
        // Step 2: Calculate heights with better distribution
        const messageData = messages.map((msg: any, i: number) => {
            const content = msg.getContent();
            const cleanContent = content
                .replace(/\[Tool:.*?\]/g, '')
                .replace(/\[Viewed:.*?\]/g, '')
                .replace(/\[Created:.*?\]/g, '')
                .replace(/\[Edited:.*?\]/g, '')
                .trim();
            const contentLength = Math.max(cleanContent.length, 20);
            // Better height calculation: 1-5 levels based on content
            let height = 1;
            if (contentLength > 100)
                height = 2;
            if (contentLength > 300)
                height = 3;
            if (contentLength > 800)
                height = 4;
            if (contentLength > 1500)
                height = 5;

            return {
                index: i,
                width: messageWidths[i],
                height,
                isUser: this.getMessageType(msg) === 'user',
                isActive: i === currentIndex
            };
        });
        const maxHeight = Math.max(...messageData.map((m: any) => m.height));
        
        // Step 3: Build perfect 2D grid
        const timelineRows = [];
        // Render each row from top to bottom
        for (let row = maxHeight; row >= 1; row--) {
            const rowElements = [];
            for (const msgData of messageData) {
                const hasContent = row <= msgData.height;
                const width = msgData.width;
                if (hasContent) {
                    // Solid block for this message
                    const blockChar = msgData.isUser ? '▓' : '▒';
                    const blockString = blockChar.repeat(width);
                    rowElements.push(React.createElement(Text, {
                        key: `msg-${msgData.index}-row-${row}`,
                        color: msgData.isActive ? 'yellow' : (msgData.isUser ? 'green' : 'blue'),
                        bold: msgData.isActive,
                        backgroundColor: msgData.isActive ? 'black' : undefined
                    }, blockString));
                }
                else {
                    // Empty space
                    rowElements.push(React.createElement(Text, {
                        key: `empty-${msgData.index}-row-${row}`
                    }, ' '.repeat(width)));
                }
            }
            timelineRows.push(React.createElement(Box, {
                key: `timeline-row-${row}`,
                flexDirection: 'row'
            }, rowElements));
        }
        return React.createElement(Box, {
            key: 'main-timeline',
            flexDirection: 'column',
            borderStyle: 'single',
            borderColor: 'gray',
            paddingLeft: 1,
            paddingRight: 1
        }, [
            React.createElement(Text, { key: 'label', color: 'gray' }, `Timeline: ${messages.length} messages | 👤=User 🤖=AI`),
            ...timelineRows,
            React.createElement(Text, { key: 'position', color: 'gray' }, `Position: ${currentIndex + 1}/${messages.length} | ${this.getMessageType(messages[currentIndex]) === 'user' ? '👤 User' : '🤖 AI'}`),
        ]);
    }

    private renderTimeline(state: any, React: any, Box: any, Text: any): any {
        const conversation = state.currentConversation;
        if (!conversation)
            return null;
        const messages = conversation.messages;
        const currentIndex = state.currentMessageIndex;
        // Use the visual timeline renderer for proper position mapping
        const timelineRenderer = new VisualTimelineRenderer({
            maxWidth: Math.min(120, process.stdout.columns - 4), // Adapt to terminal width
            showBorder: true,
            showPositionIndicator: true,
            compactMode: false,
            enableScrollIndicators: true
        });
        const timelineLines = timelineRenderer.renderTimeline(messages, currentIndex);
        const statsLine = timelineRenderer.renderStats(messages, currentIndex);
        // Convert timeline strings to React elements with proper styling
        const timelineElements = timelineLines.map((line: string, index: number) => 
            React.createElement(Text, {
                key: `timeline-${index}`,
                // Strip ANSI codes for Ink rendering - Ink handles colors differently
                color: line.includes('current') ? 'black' : undefined,
                backgroundColor: line.includes('current') ? 'cyan' : undefined
            }, this.stripAnsiCodes(line))
        );
        return React.createElement(Box, { key: 'timeline', flexDirection: 'column' }, [
            React.createElement(Text, { key: 'title', bold: true, color: 'cyan' }, '📅 Visual Timeline:'),
            React.createElement(Box, { key: 'spacer' }),
            ...timelineElements,
            React.createElement(Box, { key: 'spacer2' }),
            React.createElement(Text, { key: 'stats', color: 'gray' }, statsLine)
        ]);
    }

    /**
     * Strip ANSI color codes for Ink compatibility
     */
    private stripAnsiCodes(text: string): string {
        // eslint-disable-next-line no-control-regex
        return text.replace(/\x1b\[[0-9;]*m/g, '');
    }

    private renderSearchScreen(state: any, React: any, Box: any, Text: any): any {
        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' }, 
                React.createElement(Text, { bold: true, color: 'blue' }, ' Search Conversations ')
            ),
            React.createElement(Box, { key: 'spacer1' }),
            React.createElement(Text, { key: 'prompt', color: 'white' }, `Query: ${state.searchQuery}_`),
            React.createElement(Box, { key: 'spacer2' }),
            state.searchResults.length > 0 && React.createElement(Text, { key: 'results', color: 'green' }, 
                `Results (${state.searchResults.length} found):`
            ),
            React.createElement(Box, { key: 'spacer3' }),
            React.createElement(Box, { key: 'controls', borderStyle: 'single', borderColor: 'gray' }, 
                React.createElement(Text, { color: 'gray' }, ' Type to search | ↵:search | ESC:cancel ')
            )
        ]);
    }

    private renderExportScreen(state: any, React: any, Box: any, Text: any): any {
        const formats = [
            { key: 'html', name: 'Enhanced HTML', desc: 'Interactive HTML with Time Machine' },
            { key: 'markdown', name: 'Markdown', desc: 'Enhanced markdown with formatting' },
            { key: 'json', name: 'JSON', desc: 'Structured data format' },
            { key: 'simple', name: 'Simple', desc: 'Clean text format' }
        ];

        const formatItems = formats.map((format, index) => {
            const isSelected = format.key === state.selectedExportFormat;
            return React.createElement(Box, { key: format.key, flexDirection: 'column' }, [
                React.createElement(Text, {
                    color: isSelected ? 'black' : 'white',
                    backgroundColor: isSelected ? 'cyan' : undefined,
                    bold: isSelected
                }, `${isSelected ? '▶ ' : '  '}📄 ${format.name}`),
                isSelected && React.createElement(Text, { color: 'gray' }, `    ${format.desc}`)
            ]);
        });

        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' }, 
                React.createElement(Text, { bold: true, color: 'blue' }, ' Export Options ')
            ),
            React.createElement(Box, { key: 'spacer1' }),
            ...formatItems,
            React.createElement(Box, { key: 'spacer2' }),
            React.createElement(Text, { key: 'metadata', color: 'cyan' }, 
                `✅ Include Metadata: ${state.includeMetadata ? 'Yes' : 'No'}`
            ),
            React.createElement(Box, { key: 'spacer3' }),
            React.createElement(Box, { key: 'controls', borderStyle: 'single', borderColor: 'gray' }, 
                React.createElement(Text, { color: 'gray' }, ' ↑↓:format | m:toggle metadata | ↵:export | ESC:back ')
            )
        ]);
    }

    private renderImportScreen(state: any, React: any, Box: any, Text: any): any {
        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' }, 
                React.createElement(Text, { bold: true, color: 'blue' }, ' Import Conversation ')
            ),
            React.createElement(Box, { key: 'spacer1' }),
            React.createElement(Text, { key: 'instruction', color: 'white' }, 
                'Import a conversation by entering its unique session ID:'
            ),
            React.createElement(Box, { key: 'spacer2' }),
            React.createElement(Text, { key: 'prompt', color: 'cyan' }, 'Conversation ID:'),
            React.createElement(Text, { key: 'input', color: 'white', bold: true }, `> ${state.importId}█`),
            React.createElement(Box, { key: 'spacer3' }),
            React.createElement(Box, { key: 'help', flexDirection: 'column' }, [
                React.createElement(Text, { color: 'cyan' }, 'Instructions:'),
                React.createElement(Text, { color: 'gray' }, '• Paste or type the conversation session ID'),
                React.createElement(Text, { color: 'gray' }, '• The ID should be alphanumeric with optional hyphens/underscores (min 8 chars)'),
                React.createElement(Text, { color: 'gray' }, '• Press Enter to import the conversation'),
            ]),
            React.createElement(Box, { key: 'spacer4' }),
            state.statusMessage && React.createElement(Text, { key: 'status', color: 'yellow' }, `⏳ ${state.statusMessage}`),
            React.createElement(Box, { key: 'controls', borderStyle: 'single', borderColor: 'gray' }, 
                React.createElement(Text, { color: 'gray' }, ' Type:enter ID | ↵:import | ESC:cancel | Backspace:delete ')
            )
        ]);
    }

    private renderHelpScreen(state: any, React: any, Box: any, Text: any): any {
        const helpSections = [
            {
                title: 'Navigation',
                shortcuts: [
                    'j/k or ↑/↓   - Move up/down',
                    '↵/Enter      - Select item',
                    'ESC          - Go back',
                    'q            - Quit'
                ]
            },
            {
                title: 'Conversation List',
                shortcuts: [
                    's            - Search conversations',
                    'e            - Export conversations',
                    'i            - Import conversation by ID'
                ]
            },
            {
                title: 'Message Detail',
                shortcuts: [
                    'j/k          - Next/previous message',
                    'u/U          - Next/previous user message',
                    't            - Toggle timeline mode',
                    '↑/↓          - Scroll content'
                ]
            }
        ];

        const helpContent: any[] = [];
        helpSections.forEach((section, sectionIndex) => {
            helpContent.push(React.createElement(Text, { 
                key: `title-${sectionIndex}`, 
                bold: true, 
                color: 'cyan' 
            }, section.title));
            
            section.shortcuts.forEach((shortcut, shortcutIndex) => {
                helpContent.push(React.createElement(Text, { 
                    key: `shortcut-${sectionIndex}-${shortcutIndex}`, 
                    color: 'white' 
                }, `  ${shortcut}`));
            });
            
            helpContent.push(React.createElement(Box, { key: `spacer-${sectionIndex}` }));
        });

        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' }, 
                React.createElement(Text, { bold: true, color: 'blue' }, ' Help - Keyboard Shortcuts ')
            ),
            React.createElement(Box, { key: 'spacer1' }),
            ...helpContent,
            React.createElement(Box, { key: 'controls', borderStyle: 'single', borderColor: 'gray' }, 
                React.createElement(Text, { color: 'gray' }, ' Press h again or ESC to close help ')
            )
        ]);
    }

    private renderErrorScreen(state: any, React: any, Box: any, Text: any): any {
        return React.createElement(Box, {
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: process.stdout.rows || 24
        }, [
            React.createElement(Text, { key: 'error', color: 'red', bold: true }, '❌ Error'),
            React.createElement(Box, { key: 'spacer1' }),
            React.createElement(Text, { key: 'message', color: 'white' }, state.error || 'Unknown error'),
            React.createElement(Box, { key: 'spacer2' }),
            React.createElement(Text, { key: 'continue', color: 'gray' }, 'Press any key to continue...')
        ]);
    }

    // Helper methods
    private getMessageType(message: any): string {
        if (message.getType) {
            return message.getType();
        }
        return message.role || 'unknown';
    }

    private wrapText(text: string, width: number): string[] {
        const lines: string[] = [];
        const paragraphs = text.split('\n');
        
        paragraphs.forEach(paragraph => {
            if (paragraph.length <= width) {
                lines.push(paragraph);
            } else {
                const words = paragraph.split(' ');
                let currentLine = '';
                words.forEach(word => {
                    if (currentLine.length + word.length + 1 <= width) {
                        currentLine += (currentLine ? ' ' : '') + word;
                    } else {
                        if (currentLine) lines.push(currentLine);
                        currentLine = word;
                    }
                });
                if (currentLine) lines.push(currentLine);
            }
        });
        
        return lines;
    }

    private truncateTitle(title: string, maxWidth: number): string {
        if (title.length <= maxWidth) {
            return title;
        }
        return title.substring(0, maxWidth - 3) + '...';
    }

    private mapToAppExportFormat(format: string): AppExportFormat {
        switch (format) {
            case 'json': return AppExportFormat.JSON;
            case 'markdown': return AppExportFormat.MARKDOWN;
            case 'simple': return AppExportFormat.SIMPLIFIED;
            case 'html': return AppExportFormat.HTML;
            default: return AppExportFormat.SIMPLIFIED;
        }
    }

    private getFileExtension(format: string): string {
        switch (format) {
            case 'json': return 'json';
            case 'markdown': return 'md';
            case 'simple': return 'md';
            case 'html': return 'html';
            default: return 'md';
        }
    }
}