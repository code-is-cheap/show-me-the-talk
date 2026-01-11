import { appendFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ConversationApplicationService } from '../../application/services/ConversationApplicationService.js';
import { ExportFormat as AppExportFormat } from '../../application/dto/ExportDto.js';
import { VisualTimelineRenderer } from './components/VisualTimelineRenderer.js';
import { searchConversations } from './utils/conversationUtils.js';
import { AnalyticsService } from '../../domain/services/analytics/AnalyticsService.js';
import { AnalyticsReport } from '../../domain/models/analytics/AnalyticsReport.js';

export interface TUIConfig {
    claudeDir: string;
    debug: boolean;
}

type ThreadLine = {
    text: string;
    color?: string;
    dimColor?: boolean;
    bold?: boolean;
};

type ThreadLayout = {
    lines: ThreadLine[];
    entryLineStarts: number[];
};

type ThreadSection = {
    id: number;
    title: string;
    startIndex: number;
    endIndex: number;
    checkpointIndex: number | null;
};

export class ComprehensiveInkTUI {
    private conversationService: ConversationApplicationService;
    private analyticsService: AnalyticsService;
    private options: TUIConfig;

    constructor(conversationService: ConversationApplicationService, options: TUIConfig = { claudeDir: '', debug: false }) {
        this.conversationService = conversationService;
        this.analyticsService = new AnalyticsService({ claudeDir: options.claudeDir });
        this.options = options;
    }

    public createInkApp(React: any, ink: { Box: any; Text: any; useInput: any; useApp: any }): () => any {
        const { Box, Text, useInput, useApp } = ink;

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
                totalItems: 0,
                analyticsReport: null,
                analyticsView: 'menu',
                viewMode: 'clean',
                    viewLayout: 'single',
                    checkpointOnly: false,
                    collapsedSections: {},
                    timelineFocus: false,
                    timelineSelectionIndex: 0,
                    timelinePreviewPosition: 'top'
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

        return InkTUIApp;
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
            const ink = await import('ink');
            const { render } = ink;

            // Main Ink App Component
            const InkTUIApp = this.createInkApp(React, ink);

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
            case 'analytics':
                this.handleAnalyticsInput(input, key, state, setState);
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
        } else if (input === 'a') {
            // Enter analytics mode
            this.enterAnalyticsMode(state, setState);
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

        const entryCount = Array.isArray(selectedConversation.messages) ? selectedConversation.messages.length : 0;
        const lastIndex = Math.max(0, entryCount - 1);

        setState((prev: any) => ({
            ...prev,
            currentConversation: selectedConversation,
            currentMessageIndex: lastIndex,
            scrollOffset: 0,
            userMessagesOnly: false,
            viewMode: 'clean',
            viewLayout: 'single',
            checkpointOnly: false,
            collapsedSections: {},
            timelineFocus: false,
            timelineSelectionIndex: 0,
            timelinePreviewPosition: 'top',
            currentScreen: 'message-detail',
            statusMessage: `Viewing conversation: ${selectedConversation.title || 'Untitled'}`
        }));
    }

    private handleMessageDetailInput(input: string, key: any, state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        if (state.timelineFocus) {
            this.handleTimelineFocusInput(input, key, state, setState);
            return;
        }

        if (state.checkpointOnly && state.viewLayout === 'thread' && (input === 'j' || input === 'k')) {
            this.jumpToCheckpoint(state, setState, input === 'j' ? 'next' : 'prev');
            return;
        }

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
        } else if (input === 'r') {
            this.toggleRawView(state, setState);
        } else if (input === 'v') {
            this.toggleLayout(state, setState);
        } else if (input === 't') {
            this.toggleTimelineFocus(state, setState);
        } else if (input === 'p') {
            this.toggleCheckpointOnly(state, setState);
        } else if (input === 'o') {
            this.toggleTimelinePreviewPosition(state, setState);
        } else if (input === 'c') {
            this.toggleSectionCollapse(state, setState);
        } else if (input === 'C') {
            this.toggleAllSections(state, setState);
        } else if (input === 'E') {
            this.exportCurrentSection(state, setState);
        } else if (input === 'P') {
            this.exportAllSections(state, setState);
        } else if (input === '[') {
            this.jumpToCheckpoint(state, setState, 'prev');
        } else if (input === ']') {
            this.jumpToCheckpoint(state, setState, 'next');
        } else if (input === 'i') {
            setState((prev: any) => ({
                ...prev,
                currentScreen: 'import',
                importMode: true,
                importId: ''
            }));
        } else if (key.upArrow) {
            if (state.viewLayout === 'thread') {
                const info = this.getThreadLayoutInfo(state, state.currentMessageIndex);
                setState((prev: any) => ({
                    ...prev,
                    scrollOffset: Math.max(0, Math.min(prev.scrollOffset - 1, info.maxScroll))
                }));
            } else {
                setState((prev: any) => ({
                    ...prev,
                    scrollOffset: Math.max(0, prev.scrollOffset - 1)
                }));
            }
        } else if (key.downArrow) {
            if (state.viewLayout === 'thread') {
                const info = this.getThreadLayoutInfo(state, state.currentMessageIndex);
                setState((prev: any) => ({
                    ...prev,
                    scrollOffset: Math.max(0, Math.min(prev.scrollOffset + 1, info.maxScroll))
                }));
            } else {
                setState((prev: any) => ({
                    ...prev,
                    scrollOffset: prev.scrollOffset + 1
                }));
            }
        } else if (key.escape || input === '\u001b') {
            setState((prev: any) => ({ ...prev, currentScreen: 'conversation-list' }));
        } else if (input === 'q') {
            process.exit(0);
        } else if (input === 'h' || input === '?') {
            setState((prev: any) => ({ ...prev, currentScreen: 'help' }));
        }
    }

    private handleTimelineFocusInput(input: string, key: any, state: any, setState: any): void {
        if (input === 't' || key.escape || input === '\u001b') {
            this.toggleTimelineFocus(state, setState);
            return;
        }

        if (key.upArrow || input === 'k' || key.leftArrow) {
            this.moveTimelineSelection(state, setState, -1);
            return;
        }

        if (key.downArrow || input === 'j' || key.rightArrow) {
            this.moveTimelineSelection(state, setState, 1);
            return;
        }

        if (key.return || input === '\r' || input === ' ') {
            this.jumpToTimelineSelection(state, setState);
            return;
        }
    }

    private toggleTimelineFocus(state: any, setState: any): void {
        if (state.viewLayout !== 'thread') {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'Timeline focus is available in thread view only'
            }));
            return;
        }

        const timelineEntries = this.getTimelineEntries(state);
        const sections = this.buildThreadSections(timelineEntries);
        const timelineIndex = this.getTimelineCurrentIndex(state, timelineEntries);
        const selectionIndex = this.getSectionIndexForTimelineIndex(sections, timelineIndex);
        const nextFocus = !state.timelineFocus;

        setState((prev: any) => ({
            ...prev,
            timelineFocus: nextFocus,
            timelineSelectionIndex: selectionIndex,
            statusMessage: nextFocus
                ? 'Timeline focus on (j/k or ↑/↓ to move, Enter to jump)'
                : 'Timeline focus off'
        }));
    }

    private moveTimelineSelection(state: any, setState: any, delta: number): void {
        const timelineEntries = this.getTimelineEntries(state);
        const sections = this.buildThreadSections(timelineEntries);
        if (sections.length === 0) {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'No timeline sections available'
            }));
            return;
        }

        const maxIndex = sections.length - 1;
        const nextIndex = Math.max(0, Math.min(maxIndex, (state.timelineSelectionIndex ?? 0) + delta));
        setState((prev: any) => ({
            ...prev,
            timelineSelectionIndex: nextIndex
        }));
    }

    private jumpToTimelineSelection(state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        const timelineEntries = this.getTimelineEntries(state);
        const sections = this.buildThreadSections(timelineEntries);
        if (sections.length === 0) {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'No timeline sections available'
            }));
            return;
        }

        const selectionIndex = Math.max(0, Math.min(sections.length - 1, state.timelineSelectionIndex ?? 0));
        const section = sections[selectionIndex];
        if (!section) return;

        const targetIndex = section.checkpointIndex ?? section.startIndex;
        const targetEntry = timelineEntries[targetIndex];
        const activeEntries = this.getActiveEntries(state);
        const matchIndex = this.findActiveEntryIndex(activeEntries, targetEntry);

        if (matchIndex >= 0) {
            this.updateMessageIndex(state, setState, matchIndex, `Jumped to ${section.title}`);
            return;
        }

        if (state.viewMode !== 'raw' && Array.isArray(conversation.rawEntries) && conversation.rawEntries.length > 0) {
            const scrollOffset = state.viewLayout === 'thread'
                ? this.getThreadScrollOffsetForIndex(
                    { ...state, viewMode: 'raw', currentMessageIndex: targetIndex },
                    targetIndex,
                    conversation.rawEntries,
                    state.collapsedSections || {}
                )
                : 0;
            setState((prev: any) => ({
                ...prev,
                viewMode: 'raw',
                currentMessageIndex: targetIndex,
                scrollOffset,
                statusMessage: `Switched to raw view: ${section.title}`
            }));
            return;
        }

        setState((prev: any) => ({
            ...prev,
            statusMessage: 'Selected section is not available in the current view'
        }));
    }

    private navigateToNextMessage(state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        const entries = this.getActiveEntries(state);
        const nextIndex = Math.min(entries.length - 1, state.currentMessageIndex + 1);
        this.updateMessageIndex(state, setState, nextIndex);
    }

    private navigateToPreviousMessage(state: any, setState: any): void {
        const prevIndex = Math.max(0, state.currentMessageIndex - 1);
        this.updateMessageIndex(state, setState, prevIndex);
    }

    private navigateToNextUserMessage(state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        const messages = this.getActiveEntries(state);
        const currentIndex = state.currentMessageIndex;

        // Find next user message
        for (let i = currentIndex + 1; i < messages.length; i++) {
            const message = messages[i];
            const messageType = this.getMessageType(message);
            if (messageType === 'user') {
                this.updateMessageIndex(state, setState, i, `Jumped to next user message (${i + 1}/${messages.length})`);
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

        const messages = this.getActiveEntries(state);
        const currentIndex = state.currentMessageIndex;

        // Find previous user message
        for (let i = currentIndex - 1; i >= 0; i--) {
            const message = messages[i];
            const messageType = this.getMessageType(message);
            if (messageType === 'user') {
                this.updateMessageIndex(state, setState, i, `Jumped to previous user message (${i + 1}/${messages.length})`);
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

    private handleAnalyticsInput(input: string, key: any, state: any, setState: any): void {
        if (key.escape || input === '\u001b' || input === 'b') {
            setState((prev: any) => ({
                ...prev,
                currentScreen: 'conversation-list',
                analyticsView: 'menu'
            }));
        } else if (input === 'w') {
            setState((prev: any) => ({ ...prev, analyticsView: 'wordcloud' }));
        } else if (input === 'c') {
            setState((prev: any) => ({ ...prev, analyticsView: 'clusters' }));
        } else if (input === 't') {
            setState((prev: any) => ({ ...prev, analyticsView: 'timeline' }));
        } else if (input === 'i') {
            setState((prev: any) => ({ ...prev, analyticsView: 'insights' }));
        } else if (input === 'e') {
            this.exportAnalyticsToHTML(state, setState);
        } else if (input === 'q') {
            process.exit(0);
        }
    }

    private async enterAnalyticsMode(state: any, setState: any): Promise<void> {
        try {
            setState((prev: any) => ({
                ...prev,
                loading: true,
                statusMessage: 'Generating analytics report...'
            }));

            // Generate analytics report from current conversations
            const report = await this.analyticsService.generateReport(state.filteredConversations);

            setState((prev: any) => ({
                ...prev,
                loading: false,
                currentScreen: 'analytics',
                analyticsReport: report,
                analyticsView: 'menu',
                statusMessage: 'Analytics report generated successfully'
            }));
        } catch (error) {
            setState((prev: any) => ({
                ...prev,
                loading: false,
                error: `Failed to generate analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
                currentScreen: 'error'
            }));
        }
    }

    private async exportAnalyticsToHTML(state: any, setState: any): Promise<void> {
        try {
            if (!state.analyticsReport) {
                setState((prev: any) => ({
                    ...prev,
                    statusMessage: 'No analytics report available'
                }));
                return;
            }

            setState((prev: any) => ({
                ...prev,
                loading: true,
                statusMessage: 'Exporting analytics to HTML...'
            }));

            const timestamp = Date.now();
            const outputPath = `analytics-report-${timestamp}.html`;

            // Generate HTML content
            const htmlContent = this.generateAnalyticsHTML(state.analyticsReport);
            const fs = await import('fs/promises');
            await fs.writeFile(outputPath, htmlContent, 'utf-8');

            setState((prev: any) => ({
                ...prev,
                loading: false,
                statusMessage: `Analytics exported to ${outputPath}`
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

    private generateAnalyticsHTML(report: any): string {
        const jsonData = JSON.stringify(report.toJSON(), null, 2);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code Analytics Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .section {
            background: white;
            padding: 30px;
            margin-bottom: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { margin: 0 0 10px 0; }
        h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .stat { display: inline-block; margin: 10px 20px 10px 0; }
        .stat-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; }
        .insight { padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; background: #f9f9f9; }
        .insight.high { border-left-color: #e74c3c; }
        .insight.medium { border-left-color: #f39c12; }
        .insight.low { border-left-color: #95a5a6; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Claude Code Analytics Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="section">
        <h2>Summary</h2>
        <pre>${report.getSummary()}</pre>
    </div>

    <div class="section">
        <h2>Statistics</h2>
        <div class="stat">
            <div class="stat-value">${report.statistics.totalConversations}</div>
            <div class="stat-label">Conversations</div>
        </div>
        <div class="stat">
            <div class="stat-value">${report.statistics.totalMessages}</div>
            <div class="stat-label">Messages</div>
        </div>
        <div class="stat">
            <div class="stat-value">${report.statistics.totalWords}</div>
            <div class="stat-label">Words</div>
        </div>
    </div>

    <div class="section">
        <h2>Key Insights</h2>
        ${report.insights.map((insight: any) => `
            <div class="insight ${insight.importance}">
                <h3>${insight.title}</h3>
                <p>${insight.description}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Full Report Data (JSON)</h2>
        <pre>${jsonData}</pre>
    </div>
</body>
</html>`;
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
            case 'analytics':
                return this.renderAnalyticsScreen(state, setState, React, Box, Text);
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
            React.createElement(Text, {
                key: 'status',
                color: state.statusMessage ? 'cyan' : 'gray',
                dimColor: !state.statusMessage
            }, state.statusMessage ? `ℹ️  ${state.statusMessage}` : ' '),
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
                React.createElement(Text, { color: 'gray' }, ' ↑↓:nav | ↵:view | a:analytics | s:search | e:export | ESC:back | h:help ')
            )
        ]);
    }

    private renderMessageDetailScreen(state: any, React: any, Box: any, Text: any): any {
        const conversation = state.currentConversation;
        if (!conversation) {
            return React.createElement(Text, { color: 'red' }, 'No conversation selected');
        }

        if (state.viewLayout === 'thread') {
            return this.renderThreadDetailScreen(state, React, Box, Text);
        }

        const messages = this.getActiveEntries(state);
        const currentMsg = messages[state.currentMessageIndex];
        const modeIndicator = '';

        if (!currentMsg) {
            return React.createElement(Text, { color: 'red' }, 'No messages found');
        }

        const messageType = this.getMessageType(currentMsg);
        const label = this.formatEntryLabel(currentMsg);
        const color = this.getEntryColor(messageType);
        const content = this.getEntryContent(currentMsg);
        const metadataLines = this.formatEntryMetadata(currentMsg);
        const combinedContent = metadataLines.length > 0
            ? [content, ...metadataLines].filter(Boolean).join('\n')
            : content;
        const timestamp = this.getEntryTimestamp(currentMsg).toLocaleTimeString();

        // Calculate available height for content
        const terminalHeight = process.stdout.rows || 24;
        
        // Use FIXED timeline height to prevent layout shifts
        // Always reserve space for maximum possible timeline height (3 rows)
        const FIXED_TIMELINE_HEIGHT = 3;
        
        // FIXED CONTENT HEIGHT: Use a reasonable fixed height for content area
        // This prevents layout shifts when switching between messages
        // For terminals >= 30 rows: use 15 lines (good reading experience)
        // For smaller terminals: use proportional height but at least 8 lines
        let FIXED_CONTENT_HEIGHT: number;
        if (terminalHeight >= 30) {
            FIXED_CONTENT_HEIGHT = 15;
        } else if (terminalHeight >= 24) {
            FIXED_CONTENT_HEIGHT = 10;
        } else {
            FIXED_CONTENT_HEIGHT = 8;
        }
        
        const availableContentHeight = FIXED_CONTENT_HEIGHT;

        // Wrap content to fit terminal
        const terminalWidth = (process.stdout.columns || 80) - 4;
        const lines = this.wrapText(combinedContent, terminalWidth);
        const visibleLines = lines.slice(state.scrollOffset, state.scrollOffset + availableContentHeight);
        const contentElements = visibleLines.map((line: string, index: number) => 
            React.createElement(Text, { key: index }, `  ${line}`)
        );

        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' }, 
                React.createElement(Text, { bold: true, color: 'blue' }, 
                    ` ${this.truncateTitle(conversation.title || 'Conversation', 60)}${modeIndicator} - ${state.viewMode === 'raw' ? 'RAW' : 'CLEAN'} ${state.currentMessageIndex + 1}/${messages.length} `
                )
            ),
            React.createElement(Text, {
                key: 'status',
                color: state.statusMessage ? 'cyan' : 'gray',
                dimColor: !state.statusMessage,
                wrap: 'truncate'
            }, state.statusMessage ? `ℹ️  ${state.statusMessage}` : ' '),
            
            // Main timeline - Always visible with proper positioning
            this.renderMainTimeline(state, React, Box, Text),
            
            // Message content view with fixed height box
            React.createElement(Box, { 
                key: 'message', 
                flexDirection: 'column',
                height: availableContentHeight + 2 // +2 for header and spacer
            }, [
                React.createElement(Text, {
                    key: 'header',
                    bold: true,
                    color
                }, `${label} [${timestamp}]:`),
                React.createElement(Box, { key: 'spacer' }),
                ...contentElements,
                // Fill empty lines to maintain consistent height
                ...Array(Math.max(0, availableContentHeight - contentElements.length)).fill(null).map((_, i) => 
                    React.createElement(Text, { key: `empty-${i}` }, '')
                ),
                // Scroll indicator
                lines.length > availableContentHeight && React.createElement(Text, { 
                    key: 'scroll-info', 
                    color: 'gray',
                    dimColor: true
                }, `  [${state.scrollOffset + 1}-${Math.min(state.scrollOffset + availableContentHeight, lines.length)} of ${lines.length} lines]`)
            ]),
            React.createElement(Box, { key: 'spacer2' }),
            React.createElement(Box, { key: 'controls', borderStyle: 'single', borderColor: 'gray' }, 
                React.createElement(Text, { color: 'gray' }, ' ↑↓:scroll | j/k:next/prev msg | u/U:user msgs | r:raw | v:thread | [ ]:checkpoint | E/P:export stage/all | ESC:back ')
            )
        ]);
    }

    private renderThreadDetailScreen(state: any, React: any, Box: any, Text: any): any {
        const conversation = state.currentConversation;
        if (!conversation) {
            return React.createElement(Text, { color: 'red' }, 'No conversation selected');
        }

        const activeEntries = this.getActiveEntries(state);
        const entryCount = activeEntries.length;
        const displayIndex = entryCount > 0 ? Math.min(state.currentMessageIndex, entryCount - 1) : 0;
        const entryPosition = entryCount > 0 ? displayIndex + 1 : 0;
        const timelineEntries = this.getTimelineEntries(state);
        const timelineIndex = this.getTimelineCurrentIndex(state, timelineEntries);

        if (entryCount === 0) {
            return React.createElement(Text, { color: 'yellow' }, 'No messages found');
        }

        const layoutInfo = this.getThreadLayoutInfo(state, state.currentMessageIndex);
        const { contentWidth, sidebarWidth, availableHeight, maxScroll, headerLines, footerLines, terminalWidth, terminalHeight } = layoutInfo;
        const threadLines = layoutInfo.layout.lines;

        const scrollOffset = Math.min(state.scrollOffset, maxScroll);
        const visibleLines = threadLines.slice(scrollOffset, scrollOffset + availableHeight);

        const contentElements = visibleLines.map((line: ThreadLine, index: number) => {
            const focusDim = state.timelineFocus;
            return React.createElement(Text, {
                key: `line-${index}`,
                color: line.color,
                dimColor: focusDim ? true : line.dimColor,
                bold: focusDim ? false : line.bold
            }, ` ${line.text}`);
        });

        const sections = this.buildThreadSections(timelineEntries);
        const selectionIndex = Math.min(state.timelineSelectionIndex || 0, Math.max(0, sections.length - 1));
        const mappedRawIndex = entryCount > 1 && timelineEntries.length > 1
            ? Math.round((displayIndex / (entryCount - 1)) * (timelineEntries.length - 1))
            : Math.min(displayIndex, Math.max(0, timelineEntries.length - 1));
        const displaySectionIndex = sections.length > 0
            ? this.getSectionIndexForTimelineIndex(sections, mappedRawIndex)
            : 0;
        const sectionIndex = state.timelineFocus ? selectionIndex : displaySectionIndex;
        const rawActiveIndex = state.timelineFocus
            ? (sections[selectionIndex]?.checkpointIndex ?? sections[selectionIndex]?.startIndex ?? timelineIndex)
            : mappedRawIndex;
        const previewEntries = state.timelineFocus ? timelineEntries : activeEntries;
        const previewIndex = state.timelineFocus ? rawActiveIndex : displayIndex;
        const previewText = this.getTimelinePreview(previewEntries, previewIndex, sidebarWidth);
        const cursorIndex = state.timelineFocus ? rawActiveIndex : displayIndex;
        const cursorTotal = state.timelineFocus ? timelineEntries.length : activeEntries.length;
        const timelineLines = this.renderMiniTimeline(
            timelineEntries,
            availableHeight,
            sidebarWidth,
            sections,
            state.timelineFocus,
            selectionIndex,
            previewText,
            state.timelinePreviewPosition ?? 'top',
            cursorIndex,
            cursorTotal,
            sectionIndex
        );
        const timelineElements = timelineLines.map((line, index) => {
            const focusHighlight = state.timelineFocus;
            const boostedColor = focusHighlight && line.color === 'gray' ? 'white' : line.color;
            return React.createElement(Text, {
                key: `tl-${index}`,
                color: boostedColor,
                dimColor: focusHighlight ? false : line.dimColor,
                bold: focusHighlight ? (line.bold ?? false) : line.bold,
                wrap: 'truncate'
            }, line.text);
        });

        const focusedSection = sections[selectionIndex];
        const focusPreview = focusedSection
            ? this.getSectionPreview(timelineEntries, focusedSection, sidebarWidth)
            : '';
        const infoBadges: string[] = [];
        if (state.statusMessage) infoBadges.push(state.statusMessage);
        if (state.checkpointOnly) infoBadges.push('Checkpoint-only');
        if (state.timelineFocus) {
            const focusLabel = focusPreview || (focusedSection ? focusedSection.title : '');
            infoBadges.push(focusLabel ? `Focus: ${focusLabel}` : 'Focus');
        }
        const statusText = infoBadges.length > 0 ? infoBadges.join(' • ') : ' ';

        this.logTimelineDebug('thread-render', {
            screen: state.currentScreen,
            viewLayout: state.viewLayout,
            viewMode: state.viewMode,
            currentMessageIndex: state.currentMessageIndex,
            timelineIndex,
            displayIndex,
            displayTotal: entryCount,
            mappedRawIndex,
            availableHeight,
            sidebarWidth,
            contentWidth,
            scrollOffset,
            maxScroll,
            headerLines,
            footerLines,
            terminalWidth,
            terminalHeight
        });

        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' },
                React.createElement(Text, { bold: true, color: 'blue' },
                    ` ${this.truncateTitle(conversation.title || 'Conversation', 60)} - THREAD (${state.viewMode.toUpperCase()}) ${entryPosition}/${entryCount} `
                )
            ),
            React.createElement(Text, { key: 'status', color: infoBadges.length > 0 ? 'cyan' : 'gray', dimColor: infoBadges.length === 0, wrap: 'truncate' }, statusText),
            React.createElement(Text, {
                key: 'legend',
                color: 'gray',
                dimColor: true,
                wrap: 'truncate'
            }, 'Legend: 👤 User | 🤖 Assistant | 🔧 tool call | 🧰 tool result | ⚙️ system | ◆ checkpoint'),
            React.createElement(Text, {
                key: 'mode',
                color: state.timelineFocus ? 'magenta' : 'green',
                wrap: 'truncate'
            }, state.timelineFocus ? 'Mode: TIMELINE NAV (j/k move, Enter jump, t exit)' : 'Mode: READING (t to focus timeline)'),
            React.createElement(Box, { key: 'body', flexDirection: 'row' }, [
                React.createElement(Box, { key: 'content', flexDirection: 'column', width: contentWidth }, [
                    ...contentElements,
                    ...Array(Math.max(0, availableHeight - contentElements.length)).fill(null).map((_, i) =>
                        React.createElement(Text, { key: `empty-${i}` }, '')
                    ),
                    threadLines.length > availableHeight && React.createElement(Text, {
                        key: 'scroll-info',
                        color: 'gray',
                        dimColor: true
                    }, ` [${scrollOffset + 1}-${Math.min(scrollOffset + availableHeight, threadLines.length)} of ${threadLines.length} lines]`)
                ]),
                React.createElement(Box, { key: 'sidebar', flexDirection: 'column', width: sidebarWidth }, [
                    React.createElement(Text, { key: 'tl-header', color: state.timelineFocus ? 'magenta' : 'gray', bold: state.timelineFocus, wrap: 'truncate' }, this.formatTimelineHeader(sidebarWidth, state.timelineFocus, state.timelinePreviewPosition ?? 'top')),
                    ...timelineElements
                ])
            ]),
            React.createElement(Box, { key: 'controls', borderStyle: 'single', borderColor: 'gray' },
                React.createElement(Text, { color: 'gray' }, ' ↑↓:scroll | j/k:next/prev msg | u/U:user msgs | r:raw | v:view | t:focus timeline | o:preview pos | p:checkpoints | c:collapse | [ ]:checkpoint | E/P:export stage/all | ESC:back ')
            )
        ]);
    }

    private renderMainTimeline(state: any, React: any, Box: any, Text: any): any {
        const conversation = state.currentConversation;
        if (!conversation)
            return null;
        const messages = this.getTimelineEntries(state);
        const currentIndex = this.getTimelineCurrentIndex(state, messages);
        const terminalWidth = Math.min(process.stdout.columns || 80, 120);
        const terminalHeight = process.stdout.rows || 24;
        const timelineWidth = terminalWidth - 8;
        
        // Skip timeline in very small terminals to preserve content space
        if (terminalHeight < 20) {
            return React.createElement(Box, {
                key: 'minimal-timeline',
                flexDirection: 'column',
                borderStyle: 'single',
                borderColor: 'gray',
                paddingLeft: 1,
                paddingRight: 1
            }, [
                React.createElement(Text, { key: 'position', color: 'gray' }, 
                    `Message ${currentIndex + 1}/${messages.length} | ${this.formatEntryLabel(messages[currentIndex])}`
                ),
            ]);
        }
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
            const content = this.getEntryContent(msg);
            const cleanContent = content
                .replace(/\[Tool:.*?\]/g, '')
                .replace(/\[Viewed:.*?\]/g, '')
                .replace(/\[Created:.*?\]/g, '')
                .replace(/\[Edited:.*?\]/g, '')
                .trim();
            const contentLength = Math.max(cleanContent.length, 20);
            // Better height calculation: 1-3 levels based on content (reduced for more content space)
            let height = 1;
            if (contentLength > 300)
                height = 2;
            if (contentLength > 1000)
                height = 3;

            return {
                index: i,
                width: messageWidths[i],
                height,
                type: this.getMessageType(msg),
                isActive: i === currentIndex
            };
        });
        // FIXED: Always use maximum possible height to prevent layout shifts
        const maxHeight = 3;
        
        // Step 3: Build perfect 2D grid
        const timelineRows = [];
        // Render each row from top to bottom
        for (let row = maxHeight; row >= 1; row--) {
            const rowElements = [];
            for (const msgData of messageData) {
                const hasContent = row <= msgData.height;
                const width = msgData.width;
                if (hasContent) {
                    const type = msgData.type;
                    const isUser = type === 'user';
                    const isAssistant = type === 'assistant';
                    const isSystem = ['system', 'summary', 'queue', 'file_snapshot', 'tool_result', 'unknown'].includes(type);

                    const blockChar = isUser ? '▓' : (isAssistant ? '▒' : '░');
                    const blockString = blockChar.repeat(width);

                    const color = msgData.isActive
                        ? 'yellow'
                        : (isUser ? 'green' : (isAssistant ? 'blue' : (isSystem ? 'magenta' : 'gray')));

                    rowElements.push(React.createElement(Text, {
                        key: `msg-${msgData.index}-row-${row}`,
                        color,
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
            React.createElement(Text, { key: 'label', color: 'gray' }, `Timeline: ${messages.length} entries | 👤=User 🤖=AI ░=System`),
            ...timelineRows,
            React.createElement(Text, { key: 'position', color: 'gray' }, `Position: ${currentIndex + 1}/${messages.length} | ${this.formatEntryLabel(messages[currentIndex])}`),
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
                    'a            - Analytics dashboard',
                    'e            - Export conversations',
                    'i            - Import conversation by ID'
                ]
            },
            {
                title: 'Message Detail',
                shortcuts: [
                    'j/k          - Next/previous message',
                    'u/U          - Next/previous user message',
                    'r            - Toggle raw transcript view',
                    'v            - Toggle thread view',
                    't            - Timeline focus (thread view only)',
                    'o            - Cycle timeline preview position',
                    'p            - Checkpoint-only view (thread view only)',
                    '[ / ]        - Jump to previous/next checkpoint',
                    'c / C        - Collapse current / toggle all sections (thread view only)',
                    'E / P        - Export current stage / all stages',
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

    private async renderAnalyticsScreen(state: any, setState: any, React: any, Box: any, Text: any): Promise<any> {
        if (state.loading) {
            return React.createElement(Box, {
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }, [
                React.createElement(Text, { key: 'loading', color: 'cyan' }, '⏳ Generating analytics...'),
                React.createElement(Text, { key: 'wait', color: 'gray' }, 'Please wait...')
            ]);
        }

        if (!state.analyticsReport) {
            return React.createElement(Box, { flexDirection: 'column' }, [
                React.createElement(Text, { key: 'error', color: 'red' }, 'No analytics report available')
            ]);
        }

        const report = state.analyticsReport;

        // Dynamically import analytics components
        const { TerminalWordCloud } = await import('./components/analytics/TerminalWordCloud.js');
        const { ClustersSummary } = await import('./components/analytics/ClustersSummary.js');
        const { TimelineView } = await import('./components/analytics/TimelineView.js');
        const { InsightsPanel } = await import('./components/analytics/InsightsPanel.js');
        const { AnalyticsMenu } = await import('./components/analytics/AnalyticsMenu.js');

        let content;
        switch (state.analyticsView) {
            case 'wordcloud':
                content = React.createElement(TerminalWordCloud, {
                    wordCloud: report.wordCloud,
                    limit: 20
                });
                break;
            case 'clusters':
                content = React.createElement(ClustersSummary, {
                    techStackClusters: report.techStackClusters,
                    taskTypeClusters: report.taskTypeClusters,
                    topicClusters: report.topicClusters
                });
                break;
            case 'timeline':
                content = React.createElement(TimelineView, {
                    timeline: report.timeline
                });
                break;
            case 'insights':
                content = React.createElement(InsightsPanel, {
                    insights: report.insights
                });
                break;
            case 'menu':
            default:
                content = React.createElement(AnalyticsMenu, {
                    selectedOption: 'w'
                });
                break;
        }

        return React.createElement(Box, { flexDirection: 'column' }, [
            React.createElement(Box, { key: 'header', borderStyle: 'single', borderColor: 'blue' },
                React.createElement(Text, { bold: true, color: 'blue' }, ` Analytics Dashboard - ${state.analyticsView.toUpperCase()} `)
            ),
            state.statusMessage && React.createElement(Text, { key: 'status', color: 'cyan' }, `ℹ️  ${state.statusMessage}`),
            React.createElement(Box, { key: 'content', flexDirection: 'column', marginTop: 1 }, content),
            React.createElement(Box, { key: 'footer', marginTop: 1, borderStyle: 'single', borderColor: 'gray' },
                React.createElement(Text, { color: 'gray' }, ' w:wordcloud | c:clusters | t:timeline | i:insights | e:export | b:back | q:quit ')
            )
        ]);
    }

    // Helper methods
    private getActiveEntries(state: any): any[] {
        const conversation = state.currentConversation;
        if (!conversation) {
            return [];
        }

        const rawEntries = conversation.rawEntries;
        if (state.viewMode === 'raw' && Array.isArray(rawEntries) && rawEntries.length > 0) {
            return rawEntries;
        }

        return conversation.messages || [];
    }

    private toggleRawView(state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        const hasRaw = Array.isArray(conversation.rawEntries) && conversation.rawEntries.length > 0;
        if (!hasRaw) {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'No raw entries available for this conversation'
            }));
            return;
        }

        const nextMode = state.viewMode === 'raw' ? 'clean' : 'raw';
        const entries = nextMode === 'raw' ? conversation.rawEntries : conversation.messages;
        const nextIndex = Math.min(state.currentMessageIndex, entries.length - 1);
        const scrollOffset = state.viewLayout === 'thread'
            ? this.getThreadScrollOffsetForIndex(state, nextIndex, entries, state.collapsedSections || {})
            : 0;
        const selectionIndex = state.timelineFocus
            ? state.timelineSelectionIndex
            : this.getTimelineSelectionIndex({ ...state, viewMode: nextMode, currentMessageIndex: nextIndex });

        setState((prev: any) => ({
            ...prev,
            viewMode: nextMode,
            currentMessageIndex: nextIndex < 0 ? 0 : nextIndex,
            scrollOffset,
            timelineSelectionIndex: selectionIndex,
            statusMessage: nextMode === 'raw' ? 'Switched to raw transcript view' : 'Switched to clean transcript view'
        }));
    }

    private toggleLayout(state: any, setState: any): void {
        const nextLayout = state.viewLayout === 'thread' ? 'single' : 'thread';
        const nextIndex = Math.min(state.currentMessageIndex, this.getActiveEntries(state).length - 1);
        const scrollOffset = nextLayout === 'thread'
            ? this.getThreadScrollOffsetForIndex(state, nextIndex, undefined, state.collapsedSections || {})
            : 0;
        const selectionIndex = state.timelineFocus
            ? state.timelineSelectionIndex
            : this.getTimelineSelectionIndex(state, nextIndex);

        setState((prev: any) => ({
            ...prev,
            viewLayout: nextLayout,
            currentMessageIndex: nextIndex < 0 ? 0 : nextIndex,
            scrollOffset,
            timelineSelectionIndex: selectionIndex,
            statusMessage: nextLayout === 'thread' ? 'Switched to thread view' : 'Switched to single-message view'
        }));
    }

    private toggleSectionCollapse(state: any, setState: any): void {
        if (state.viewLayout !== 'thread') {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'Collapse available in thread view only'
            }));
            return;
        }

        const entries = this.getActiveEntries(state);
        const sections = this.buildThreadSections(entries);
        const section = sections.find(sec =>
            state.currentMessageIndex >= sec.startIndex && state.currentMessageIndex <= sec.endIndex
        );
        if (!section) return;

        const collapsedSections = { ...(state.collapsedSections || {}) };
        const nextCollapsed = !collapsedSections[section.id];
        collapsedSections[section.id] = nextCollapsed;

        const scrollOffset = nextCollapsed
            ? this.getThreadScrollOffsetForIndex(state, section.startIndex, entries, collapsedSections)
            : this.getThreadScrollOffsetForIndex(state, state.currentMessageIndex, entries, collapsedSections);

        setState((prev: any) => ({
            ...prev,
            collapsedSections,
            scrollOffset,
            statusMessage: nextCollapsed ? 'Section collapsed' : 'Section expanded'
        }));
    }

    private toggleAllSections(state: any, setState: any): void {
        if (state.viewLayout !== 'thread') {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'Collapse available in thread view only'
            }));
            return;
        }

        const entries = this.getActiveEntries(state);
        const sections = this.buildThreadSections(entries);
        if (sections.length === 0) return;

        const collapsedSections = { ...(state.collapsedSections || {}) };
        const shouldCollapse = !sections.every(section => collapsedSections[section.id]);
        sections.forEach(section => {
            collapsedSections[section.id] = shouldCollapse;
        });

        const scrollOffset = shouldCollapse
            ? this.getThreadScrollOffsetForIndex(state, state.currentMessageIndex, entries, collapsedSections)
            : this.getThreadScrollOffsetForIndex(state, state.currentMessageIndex, entries, collapsedSections);

        setState((prev: any) => ({
            ...prev,
            collapsedSections,
            scrollOffset,
            statusMessage: shouldCollapse ? 'All sections collapsed' : 'All sections expanded'
        }));
    }

    private toggleCheckpointOnly(state: any, setState: any): void {
        if (state.viewLayout !== 'thread') {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'Checkpoint-only view is available in thread view only'
            }));
            return;
        }

        const nextCheckpointOnly = !state.checkpointOnly;
        const entries = this.getActiveEntries(state);
        const scrollOffset = this.getThreadScrollOffsetForIndex(
            { ...state, checkpointOnly: nextCheckpointOnly },
            state.currentMessageIndex,
            entries,
            state.collapsedSections || {}
        );

        setState((prev: any) => ({
            ...prev,
            checkpointOnly: nextCheckpointOnly,
            scrollOffset,
            statusMessage: nextCheckpointOnly ? 'Checkpoint-only view enabled' : 'Checkpoint-only view disabled'
        }));
    }

    private toggleTimelinePreviewPosition(state: any, setState: any): void {
        if (state.viewLayout !== 'thread') {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'Timeline preview position available in thread view only'
            }));
            return;
        }

        const order = ['top', 'middle', 'bottom'];
        const current = state.timelinePreviewPosition ?? 'top';
        const currentIndex = order.indexOf(current);
        const nextPosition = order[(currentIndex + 1) % order.length];

        setState((prev: any) => ({
            ...prev,
            timelinePreviewPosition: nextPosition,
            statusMessage: `Preview position: ${nextPosition}`
        }));
    }

    private exportCurrentSection(state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        try {
            const timelineEntries = this.getTimelineEntries(state);
            const sections = this.buildThreadSections(timelineEntries);
            if (sections.length === 0) {
                setState((prev: any) => ({
                    ...prev,
                    statusMessage: 'No sections available to export'
                }));
                return;
            }

            const timelineIndex = this.getTimelineCurrentIndex(state, timelineEntries);
            const sectionIndex = this.getSectionIndexForTimelineIndex(sections, timelineIndex);
            const section = sections[sectionIndex];
            const exportDir = this.ensureExportDir();
            const baseId = conversation.sessionId ? conversation.sessionId.slice(0, 8) : 'session';
            const fileName = `section-${baseId}-${section.id + 1}.md`;
            const outputPath = join(exportDir, fileName);

            const headerLines = [
                `# ${conversation.title || 'Conversation'}`,
                `Session: ${conversation.sessionId || 'unknown'}`,
                `Stage ${section.id + 1}/${sections.length}: ${section.title}`,
                ''
            ];

            const content = [
                ...headerLines,
                this.formatSectionMarkdown(timelineEntries, section, !!state.includeMetadata)
            ].join('\n');

            writeFileSync(outputPath, content, 'utf8');

            setState((prev: any) => ({
                ...prev,
                statusMessage: `Exported stage ${section.id + 1} to ${outputPath}`
            }));
        } catch (error) {
            setState((prev: any) => ({
                ...prev,
                statusMessage: `Failed to export stage: ${error instanceof Error ? error.message : 'Unknown error'}`
            }));
        }
    }

    private exportAllSections(state: any, setState: any): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        try {
            const timelineEntries = this.getTimelineEntries(state);
            const sections = this.buildThreadSections(timelineEntries);
            if (sections.length === 0) {
                setState((prev: any) => ({
                    ...prev,
                    statusMessage: 'No sections available to export'
                }));
                return;
            }

            const exportDir = this.ensureExportDir();
            const baseId = conversation.sessionId ? conversation.sessionId.slice(0, 8) : 'session';
            const fileName = `sections-${baseId}.md`;
            const outputPath = join(exportDir, fileName);

            const headerLines = [
                `# ${conversation.title || 'Conversation'}`,
                `Session: ${conversation.sessionId || 'unknown'}`,
                `Stages: ${sections.length}`,
                ''
            ];

            const sectionBlocks = sections.map(section =>
                this.formatSectionMarkdown(timelineEntries, section, !!state.includeMetadata)
            );

            const content = [...headerLines, ...sectionBlocks].join('\n');
            writeFileSync(outputPath, content, 'utf8');

            setState((prev: any) => ({
                ...prev,
                statusMessage: `Exported ${sections.length} stages to ${outputPath}`
            }));
        } catch (error) {
            setState((prev: any) => ({
                ...prev,
                statusMessage: `Failed to export stages: ${error instanceof Error ? error.message : 'Unknown error'}`
            }));
        }
    }

    private ensureExportDir(): string {
        const exportDir = join(process.cwd(), 'exports');
        mkdirSync(exportDir, { recursive: true });
        return exportDir;
    }

    private formatSectionMarkdown(entries: any[], section: ThreadSection, includeMetadata: boolean): string {
        const lines: string[] = [];
        lines.push(`## Stage ${section.id + 1}: ${section.title}`);
        lines.push('');

        for (let index = section.startIndex; index <= section.endIndex; index++) {
            const entry = entries[index];
            if (!entry) continue;

            const label = this.formatEntryLabel(entry);
            const timestamp = this.getEntryTimestamp(entry).toISOString();
            lines.push(`- ${label} (${timestamp})`);

            const content = this.getEntryContent(entry);
            if (content) {
                content.split('\n').forEach(line => {
                    lines.push(`  ${line}`);
                });
            }

            if (includeMetadata) {
                const metadataLines = this.formatEntryMetadata(entry);
                metadataLines.forEach(metaLine => {
                    lines.push(`  ↳ ${metaLine}`);
                });
            }

            lines.push('');
        }

        lines.push('');
        return lines.join('\n');
    }

    private jumpToCheckpoint(state: any, setState: any, direction: 'prev' | 'next'): void {
        const conversation = state.currentConversation;
        if (!conversation) return;

        const timelineEntries = this.getTimelineEntries(state);
        const checkpointIndexes = this.getCheckpointIndexes(timelineEntries);
        if (checkpointIndexes.length === 0) {
            setState((prev: any) => ({
                ...prev,
                statusMessage: 'No checkpoints in this conversation'
            }));
            return;
        }

        const timelineIndex = this.getTimelineCurrentIndex(state, timelineEntries);
        const sorted = checkpointIndexes.sort((a, b) => a - b);
        const nextIndex = direction === 'next'
            ? sorted.find(idx => idx > timelineIndex)
            : [...sorted].reverse().find(idx => idx < timelineIndex);

        if (nextIndex === undefined) {
            setState((prev: any) => ({
                ...prev,
                statusMessage: direction === 'next' ? 'No later checkpoint' : 'No earlier checkpoint'
            }));
            return;
        }

        const checkpointEntry = timelineEntries[nextIndex];
        const activeEntries = this.getActiveEntries(state);
        const matchIndex = this.findActiveEntryIndex(activeEntries, checkpointEntry);

        if (matchIndex >= 0) {
            this.updateMessageIndex(state, setState, matchIndex, 'Jumped to checkpoint');
            return;
        }

        // If we can't map, switch to raw view (if available) and jump directly
        if (state.viewMode !== 'raw' && Array.isArray(conversation.rawEntries) && conversation.rawEntries.length > 0) {
            const scrollOffset = state.viewLayout === 'thread'
                ? this.getThreadScrollOffsetForIndex(state, nextIndex, conversation.rawEntries, state.collapsedSections || {})
                : 0;
            const selectionIndex = state.timelineFocus
                ? state.timelineSelectionIndex
                : this.getTimelineSelectionIndex({ ...state, viewMode: 'raw', currentMessageIndex: nextIndex });
            setState((prev: any) => ({
                ...prev,
                viewMode: 'raw',
                currentMessageIndex: nextIndex,
                scrollOffset,
                timelineSelectionIndex: selectionIndex,
                statusMessage: 'Switched to raw view for checkpoint'
            }));
            return;
        }

        setState((prev: any) => ({
            ...prev,
            statusMessage: 'Checkpoint not available in current view'
        }));
    }

    private findActiveEntryIndex(activeEntries: any[], checkpointEntry: any): number {
        if (activeEntries.length === 0 || !checkpointEntry) return -1;
        const checkpointId = checkpointEntry.id || checkpointEntry.metadata?.messageId;
        if (checkpointId) {
            const idMatch = activeEntries.findIndex(entry => entry.id === checkpointId);
            if (idMatch >= 0) return idMatch;
        }

        const checkpointTime = this.getEntryTimestamp(checkpointEntry).getTime();
        let closestIndex = -1;
        for (let i = 0; i < activeEntries.length; i++) {
            const entryTime = this.getEntryTimestamp(activeEntries[i]).getTime();
            if (entryTime >= checkpointTime) {
                closestIndex = i;
                break;
            }
        }
        if (closestIndex === -1) {
            closestIndex = activeEntries.length - 1;
        }
        return closestIndex;
    }

    private updateMessageIndex(state: any, setState: any, nextIndex: number, statusMessage?: string): void {
        const entries = this.getActiveEntries(state);
        const safeIndex = entries.length > 0 ? Math.max(0, Math.min(nextIndex, entries.length - 1)) : 0;
        const activeSections = this.buildThreadSections(entries);
        const section = activeSections.find(sec => safeIndex >= sec.startIndex && safeIndex <= sec.endIndex);
        const collapsedSections = { ...(state.collapsedSections || {}) };
        if (state.viewLayout === 'thread' && section && collapsedSections[section.id]) {
            collapsedSections[section.id] = false;
        }
        const scrollOffset = state.viewLayout === 'thread'
            ? this.getThreadScrollOffsetForIndex(state, safeIndex, entries, collapsedSections)
            : 0;
        const selectionIndex = state.timelineFocus
            ? state.timelineSelectionIndex
            : this.getTimelineSelectionIndex({ ...state, currentMessageIndex: safeIndex });

        setState((prev: any) => ({
            ...prev,
            currentMessageIndex: safeIndex,
            scrollOffset,
            collapsedSections,
            timelineSelectionIndex: selectionIndex,
            statusMessage: statusMessage ?? prev.statusMessage
        }));
    }

    private getMessageType(message: any): string {
        if (message.getType) {
            return message.getType();
        }
        if (message.type) {
            return message.type;
        }
        return message.role || 'unknown';
    }

    private getEntryContent(message: any): string {
        if (!message) return '';
        if (message.getContent) {
            return message.getContent();
        }
        return message.content || '';
    }

    private getEntryTimestamp(message: any): Date {
        const ts = message?.timestamp;
        if (ts instanceof Date) {
            return ts;
        }
        const parsed = new Date(ts);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    private formatEntryLabel(message: any): string {
        const type = this.getMessageType(message);
        switch (type) {
            case 'user':
                return '👤 User';
            case 'assistant':
                return this.hasToolCalls(message) ? '🤖 Assistant 🔧' : '🤖 Assistant';
            case 'tool_result':
                return message?.metadata?.isError ? '🧰 Tool Result ⚠️' : '🧰 Tool Result';
            case 'system':
                return '⚙️ System';
            case 'file_snapshot':
                return '📂 File Snapshot';
            case 'summary':
                return '📝 Summary';
            case 'queue':
                return '⏱ Queue';
            default:
                return '❓ Event';
        }
    }

    private hasToolCalls(message: any): boolean {
        if (!message) return false;
        if (message.getToolUses) {
            const tools = message.getToolUses();
            return Array.isArray(tools) && tools.length > 0;
        }
        const tools = message.metadata?.toolUses;
        return Array.isArray(tools) && tools.length > 0;
    }

    private getEntryColor(type: string): string {
        switch (type) {
            case 'user':
                return 'green';
            case 'assistant':
                return 'blue';
            case 'tool_result':
                return 'magenta';
            case 'system':
                return 'yellow';
            case 'file_snapshot':
                return 'cyan';
            case 'summary':
                return 'blue';
            case 'queue':
                return 'gray';
            default:
                return 'white';
        }
    }

    private formatEntryMetadata(message: any): string[] {
        if (!message) {
            return [];
        }

        if (message.getType) {
            const type = message.getType();
            const lines: string[] = [];

            if (type === 'assistant') {
                if (message.getModel?.()) {
                    lines.push(`Model: ${message.getModel()}`);
                }
                const toolUses = message.getToolUses?.() || [];
                if (Array.isArray(toolUses) && toolUses.length > 0) {
                    toolUses.forEach((tool: any) => {
                        lines.push(`Tool call: ${this.formatToolSummary(tool)}`);
                    });
                }
                const usage = message.getUsage?.();
                if (usage) {
                    lines.push(`Tokens: ${usage.inputTokens ?? 0} in, ${usage.outputTokens ?? 0} out`);
                }
            }

            return lines;
        }

        const type = message.type;
        const metadata = message.metadata || {};
        const lines: string[] = [];

        if (type === 'assistant') {
            if (metadata.model) {
                lines.push(`Model: ${metadata.model}`);
            }
            if (Array.isArray(metadata.toolUses) && metadata.toolUses.length > 0) {
                metadata.toolUses.forEach((tool: any) => {
                    lines.push(`Tool call: ${this.formatToolSummary(tool)}`);
                });
            }
            if (metadata.usage) {
                lines.push(`Tokens: ${metadata.usage.inputTokens ?? 0} in, ${metadata.usage.outputTokens ?? 0} out`);
            }
        }

        if (type === 'tool_result') {
            if (metadata.toolUseId) {
                lines.push(`Tool result: ${metadata.toolUseId}`);
            }
            if (metadata.isError) {
                lines.push('Error: true');
            }
        }

        if (type === 'file_snapshot') {
            const files = Array.isArray(metadata.files) ? metadata.files : [];
            if (files.length > 0) {
                lines.push(`Files (${files.length}): ${files.slice(0, 5).join(', ')}${files.length > 5 ? '…' : ''}`);
            }
        }

        if (type === 'system') {
            if (metadata.subtype) {
                lines.push(`Subtype: ${metadata.subtype}`);
            }
            if (metadata.level) {
                lines.push(`Level: ${metadata.level}`);
            }
        }

        if (type === 'queue' && metadata.operation) {
            lines.push(`Operation: ${metadata.operation}`);
        }

        if (type === 'summary' && metadata.leafUuid) {
            lines.push(`Leaf: ${metadata.leafUuid}`);
        }

        return lines;
    }

    private formatToolSummary(tool: any): string {
        if (!tool) return 'Unknown';
        const name = tool.name || 'Tool';
        const input = tool.input || tool.parameters;
        if (!input) {
            return name;
        }
        let preview = '';
        try {
            preview = JSON.stringify(input);
        } catch {
            preview = String(input);
        }
        if (preview.length > 80) {
            preview = `${preview.slice(0, 77)}...`;
        }
        return `${name} (${preview})`;
    }

    private logTimelineDebug(event: string, payload: Record<string, unknown>): void {
        if (!process.env.CCSHOW_DEBUG_TIMELINE) return;
        try {
            const record = {
                ts: new Date().toISOString(),
                event,
                ...payload
            };
            appendFileSync('ccshow-timeline.log', `${JSON.stringify(record)}\n`);
        } catch {
            // Ignore logging failures in TUI render loop
        }
    }

    private getTimelineEntries(state: any): any[] {
        const conversation = state.currentConversation;
        if (!conversation) return [];
        const rawEntries = conversation.rawEntries;
        if (Array.isArray(rawEntries) && rawEntries.length > 0) {
            return rawEntries;
        }
        return this.getActiveEntries(state);
    }

    private getThreadLayoutInfo(state: any, activeIndex: number, entriesOverride?: any[], collapsedOverride?: Record<number, boolean>) {
        const entries = entriesOverride ?? this.getActiveEntries(state);
        const terminalWidth = process.stdout.columns || 80;
        const terminalHeight = process.stdout.rows || 24;

        const sidebarWidth = Math.max(20, Math.min(28, Math.floor(terminalWidth * 0.32)));
        const contentWidth = Math.max(28, terminalWidth - sidebarWidth - 4);

        const headerLines = 6;
        const footerLines = 3;
        const availableHeight = Math.max(8, terminalHeight - headerLines - footerLines);

        const layout = this.buildThreadLayout(
            entries,
            contentWidth - 2,
            activeIndex,
            collapsedOverride ?? state.collapsedSections ?? {},
            state.checkpointOnly
        );
        const maxScroll = Math.max(0, layout.lines.length - availableHeight);

        return {
            entries,
            layout,
            contentWidth,
            sidebarWidth,
            availableHeight,
            maxScroll,
            headerLines,
            footerLines,
            terminalWidth,
            terminalHeight
        };
    }

    private getThreadScrollOffsetForIndex(
        state: any,
        targetIndex: number,
        entriesOverride?: any[],
        collapsedOverride?: Record<number, boolean>,
        align: 'top' | 'bottom' = 'bottom'
    ): number {
        const info = this.getThreadLayoutInfo(state, targetIndex, entriesOverride, collapsedOverride);
        const startLine = info.layout.entryLineStarts[targetIndex] ?? 0;
        if (align === 'top') {
            return Math.max(0, Math.min(startLine, info.maxScroll));
        }
        const bottomAligned = startLine - (info.availableHeight - 1);
        return Math.max(0, Math.min(bottomAligned, info.maxScroll));
    }

    private getTimelineCurrentIndex(state: any, timelineEntries: any[]): number {
        const current = this.getActiveEntries(state)[state.currentMessageIndex];
        if (!current || timelineEntries.length === 0) {
            return 0;
        }

        const currentId = current.id || current.uuid;
        if (!currentId) {
            return Math.min(state.currentMessageIndex, timelineEntries.length - 1);
        }

        const matchIndex = timelineEntries.findIndex((entry: any) => {
            if (entry.id === currentId) return true;
            const messageId = entry.metadata?.messageId;
            return messageId && messageId === currentId;
        });

        return matchIndex >= 0 ? matchIndex : Math.min(state.currentMessageIndex, timelineEntries.length - 1);
    }

    private getSectionIndexForTimelineIndex(sections: ThreadSection[], timelineIndex: number): number {
        if (sections.length === 0) return 0;
        const directMatch = sections.findIndex(section =>
            timelineIndex >= section.startIndex && timelineIndex <= section.endIndex
        );
        if (directMatch >= 0) return directMatch;

        for (let i = sections.length - 1; i >= 0; i--) {
            if (timelineIndex >= sections[i].startIndex) {
                return i;
            }
        }
        return 0;
    }

    private getTimelineSelectionIndex(state: any, currentIndexOverride?: number): number {
        const timelineEntries = this.getTimelineEntries(state);
        if (timelineEntries.length === 0) return 0;

        const nextState = currentIndexOverride === undefined
            ? state
            : { ...state, currentMessageIndex: currentIndexOverride };
        const timelineIndex = this.getTimelineCurrentIndex(nextState, timelineEntries);
        const sections = this.buildThreadSections(timelineEntries);
        return this.getSectionIndexForTimelineIndex(sections, timelineIndex);
    }

    private getSectionPreview(entries: any[], section: ThreadSection, width: number): string {
        const maxWidth = Math.max(10, width - 4);
        for (let index = section.startIndex; index <= section.endIndex; index++) {
            const entry = entries[index];
            if (!entry) continue;
            const content = this.getEntryContent(entry);
            const line = content.split('\n').map((lineItem: string) => lineItem.trim()).find((lineItem: string) => lineItem.length > 0);
            if (line) {
                return this.truncateTitle(line, maxWidth);
            }
        }
        return this.truncateTitle(section.title, maxWidth);
    }

    private renderMiniTimeline(
        entries: any[],
        height: number,
        width: number,
        sections: ThreadSection[],
        focus: boolean,
        selectionIndex: number,
        previewText: string,
        previewPosition: 'top' | 'middle' | 'bottom',
        cursorIndex: number,
        cursorTotal: number,
        sectionIndex: number
    ): ThreadLine[] {
        const safeWidth = Math.max(14, width);
        const lines: ThreadLine[] = new Array(height).fill(null).map(() => ({
            text: this.formatTimelineRow(' ', ' ', ' ', '', safeWidth),
            color: 'gray',
            dimColor: true
        }));

        if (entries.length === 0 || height === 0) {
            return lines;
        }

        const stats = this.getTimelineStats(entries);
        const safeCursorTotal = Math.max(1, cursorTotal);
        const safeCursorIndex = Math.max(0, Math.min(safeCursorTotal - 1, cursorIndex));
        const activeSectionIndex = Math.max(0, Math.min(sectionIndex, sections.length - 1));
        const activeSection = sections[activeSectionIndex];

        const statsLine: ThreadLine = {
            text: this.formatTimelineRow(' ', ' ', ' ', `CP ${stats.checkpoints} | Files ${stats.files} | Msgs ${stats.entries}`, safeWidth),
            color: 'gray',
            dimColor: true,
            bold: false
        };
        const positionLine: ThreadLine = {
            text: this.formatTimelineRow(' ', ' ', ' ', `Pos ${this.positionLabel(safeCursorIndex, safeCursorTotal)}`, safeWidth),
            color: focus ? 'magenta' : 'cyan',
            dimColor: false,
            bold: true
        };
        const stageLabel = activeSection
            ? `Stage ${activeSectionIndex + 1}/${sections.length}: ${activeSection.title}`
            : 'Stage 0/0: (none)';
        const stageLine: ThreadLine = {
            text: this.formatTimelineRow(' ', ' ', ' ', stageLabel, safeWidth),
            color: activeSection ? 'yellow' : 'gray',
            dimColor: !activeSection,
            bold: !!activeSection
        };

        const baseHeader = [statsLine, positionLine, stageLine];
        const previewEnabled = height - baseHeader.length >= 6;
        const previewLines = previewEnabled ? 2 : 0;
        const headerLines: ThreadLine[] = [];
        const previewTextLine = this.wrapText(previewText || '(empty)', Math.max(6, safeWidth - 6))[0] ?? '';
        const previewLine1: ThreadLine = {
            text: this.formatTimelineRow(' ', ' ', ' ', 'Preview', safeWidth),
            color: 'gray',
            dimColor: true,
            bold: false
        };
        const previewLine2: ThreadLine = {
            text: this.formatTimelineRow(' ', ' ', ' ', previewTextLine, safeWidth),
            color: 'white',
            dimColor: false,
            bold: false
        };
        const previewInsertAfter = previewLines === 0
            ? -1
            : previewPosition === 'top'
                ? 0
                : previewPosition === 'middle'
                    ? 1
                    : 2;
        baseHeader.forEach((line, idx) => {
            headerLines.push(line);
            if (previewLines && idx === previewInsertAfter) {
                headerLines.push(previewLine1, previewLine2);
            }
        });

        for (let row = 0; row < Math.min(height, headerLines.length); row += 1) {
            lines[row] = headerLines[row];
        }

        const timelineStartRow = headerLines.length;
        if (height <= timelineStartRow) {
            return lines;
        }
        const timelineHeight = Math.max(1, height - timelineStartRow);
        const buckets = this.buildOverviewBuckets(entries, timelineHeight);
        const cursorRow = this.positionForEntry(safeCursorIndex, safeCursorTotal, timelineHeight);

        for (let row = 0; row < timelineHeight; row += 1) {
            const lineIndex = timelineStartRow + row;
            const bucket = buckets[row];
            const rail = bucket.rail;
            const inActiveSection = activeSection
                ? bucket.startIndex <= activeSection.endIndex && bucket.endIndex >= activeSection.startIndex
                : false;
            const track = inActiveSection ? '┃' : '│';
            const marker = bucket.checkpoint ? '◆' : bucket.file ? '■' : bucket.count > 0 ? '•' : ' ';
            const label = bucket.checkpoint ? (bucket.label ?? '') : '';

            lines[lineIndex] = {
                text: this.formatTimelineRow(rail, inActiveSection ? '║' : track, marker, label, safeWidth),
                color: bucket.checkpoint ? 'yellow' : inActiveSection ? 'white' : 'gray',
                dimColor: !inActiveSection,
                bold: inActiveSection
            };
        }

        const cursorLabelLine = activeSection ? activeSection.title : 'Current';
        const cursorLineIndex = timelineStartRow + cursorRow;

        lines[cursorLineIndex] = {
            text: this.formatTimelineRow(buckets[Math.max(0, cursorRow)]?.rail ?? '.', '┃', '●', cursorLabelLine, safeWidth, focus ? '▶' : ' '),
            color: focus ? 'magenta' : 'cyan',
            bold: true,
            dimColor: false
        };

        this.logTimelineDebug('mini-timeline', {
            height,
            width,
            headerLines: headerLines.length,
            previewLines,
            previewPosition,
            timelineHeight,
            timelineStartRow,
            cursorRow,
            cursorLineIndex,
            cursorIndex: safeCursorIndex,
            cursorTotal: safeCursorTotal,
            activeSectionIndex,
            focus
        });

        return lines;
    }

    private formatTimelineHeader(width: number, focus: boolean, previewPosition: 'top' | 'middle' | 'bottom'): string {
        const previewLabel = previewPosition === 'middle' ? 'MID' : previewPosition.toUpperCase();
        const header = focus
            ? `Timeline [NAV] P:${previewLabel} ●cur ◆cp ■file`
            : `Timeline [READ] P:${previewLabel} ●cur ◆cp ■file`;
        return this.formatTimelineRow(' ', ' ', ' ', header, width);
    }

    private formatTimelineRow(rail: string, track: string, marker: string, label: string, width: number, prefix = ' '): string {
        const base = `${prefix}${rail} ${track}${marker} `;
        const labelWidth = Math.max(0, width - base.length);
        const trimmedLabel = label.length > labelWidth ? `${label.slice(0, Math.max(0, labelWidth - 1))}…` : label;
        return `${base}${trimmedLabel.padEnd(labelWidth)}`;
    }

    private getTimelineStats(entries: any[]): { entries: number; checkpoints: number; files: number } {
        let checkpoints = 0;
        let files = 0;
        entries.forEach(entry => {
            if (this.isCheckpointEntry(entry)) {
                checkpoints += 1;
            }
            if (this.getMessageType(entry) === 'file_snapshot') {
                const fileCount = Array.isArray(entry.metadata?.files) ? entry.metadata.files.length : 0;
                files += fileCount || 1;
            }
        });
        return { entries: entries.length, checkpoints, files };
    }

    private positionForEntry(index: number, total: number, height: number): number {
        if (height <= 1 || total <= 1) {
            return 0;
        }
        const clamped = Math.max(0, Math.min(total - 1, index));
        const scale = (height - 1) / (total - 1);
        return Math.max(0, Math.min(height - 1, Math.round(clamped * scale)));
    }

    private positionLabel(index: number, total: number): string {
        if (total <= 0) return '0/0';
        const clamped = Math.max(0, Math.min(total - 1, index));
        const position = clamped + 1;
        const percent = Math.round((position / total) * 100);
        return `${position}/${total} (${percent}%)`;
    }

    private getTimelinePreview(entries: any[], activeIndex: number, width: number): string {
        const entry = entries[activeIndex];
        if (!entry) return '';
        const label = this.formatEntryLabel(entry);
        const content = this.getEntryContent(entry).trim();
        if (this.getMessageType(entry) === 'file_snapshot') {
            const files = Array.isArray(entry.metadata?.files) ? entry.metadata.files : [];
            return `${label}: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '…' : ''}`;
        }
        if (content) {
            return `${label}: ${content.split('\n')[0]}`;
        }
        const metadata = this.formatEntryMetadata(entry);
        if (metadata.length > 0) {
            return `${label}: ${metadata[0]}`;
        }
        return label;
    }

    private getSectionStats(entries: any[], section: ThreadSection): { fileCount: number; checkpointCount: number } {
        let fileCount = 0;
        let checkpointCount = 0;
        for (let index = section.startIndex; index <= section.endIndex; index++) {
            const entry = entries[index];
            if (!entry) continue;
            if (this.isCheckpointEntry(entry)) {
                checkpointCount += 1;
            }
            if (this.getMessageType(entry) === 'file_snapshot') {
                const count = Array.isArray(entry.metadata?.files) ? entry.metadata.files.length : 0;
                fileCount += count || 1;
            }
        }
        return { fileCount, checkpointCount };
    }

    private buildOverviewBuckets(entries: any[], height: number): Array<{ rail: string; checkpoint: boolean; file: boolean; count: number; label?: string; startIndex: number; endIndex: number }> {
        if (height <= 0) return [];
        const buckets = new Array(height).fill(0).map(() => ({
            count: 0,
            checkpoint: false,
            file: false,
            label: undefined as string | undefined,
            startIndex: Number.POSITIVE_INFINITY,
            endIndex: -1
        }));
        const scale = entries.length > 1 ? (height - 1) / (entries.length - 1) : 0;
        entries.forEach((entry, index) => {
            const row = Math.max(0, Math.min(height - 1, Math.round(index * scale)));
            buckets[row].count += 1;
            buckets[row].startIndex = Math.min(buckets[row].startIndex, index);
            buckets[row].endIndex = Math.max(buckets[row].endIndex, index);
            if (this.isCheckpointEntry(entry)) {
                buckets[row].checkpoint = true;
                if (!buckets[row].label) {
                    buckets[row].label = this.getCheckpointTitle(entry);
                }
            }
            if (this.getMessageType(entry) === 'file_snapshot') {
                buckets[row].file = true;
            }
        });
        return buckets.map(bucket => {
            let rail = ' ';
            if (bucket.checkpoint) {
                rail = '◆';
            } else if (bucket.file) {
                rail = '■';
            } else if (bucket.count >= 6) {
                rail = '#';
            } else if (bucket.count >= 3) {
                rail = ':';
            } else if (bucket.count >= 1) {
                rail = '.';
            }
            return {
                rail,
                checkpoint: bucket.checkpoint,
                file: bucket.file,
                count: bucket.count,
                label: bucket.label,
                startIndex: Number.isFinite(bucket.startIndex) ? bucket.startIndex : 0,
                endIndex: bucket.endIndex >= 0 ? bucket.endIndex : 0
            };
        });
    }

    private getCheckpointIndexes(entries: any[]): number[] {
        const indexes: number[] = [];
        entries.forEach((entry, index) => {
            if (this.isCheckpointEntry(entry)) {
                indexes.push(index);
            }
        });
        return indexes;
    }

    private buildThreadSections(entries: any[]): ThreadSection[] {
        if (entries.length === 0) return [];

        const sections: ThreadSection[] = [];
        let currentStart = 0;
        let currentTitle = 'Start';
        let currentCheckpoint: number | null = null;

        entries.forEach((entry, index) => {
            if (!this.isCheckpointEntry(entry)) {
                return;
            }

            if (index === currentStart) {
                currentTitle = this.getCheckpointTitle(entry);
                currentCheckpoint = index;
                return;
            }

            sections.push({
                id: sections.length,
                title: currentTitle,
                startIndex: currentStart,
                endIndex: index - 1,
                checkpointIndex: currentCheckpoint
            });

            currentStart = index;
            currentTitle = this.getCheckpointTitle(entry);
            currentCheckpoint = index;
        });

        sections.push({
            id: sections.length,
            title: currentTitle,
            startIndex: currentStart,
            endIndex: entries.length - 1,
            checkpointIndex: currentCheckpoint
        });

        return sections;
    }

    private getCheckpointTitle(entry: any): string {
        const type = this.getMessageType(entry);
        const content = this.getEntryContent(entry).trim();

        if (type === 'summary' && content) {
            return content.split('\n')[0] || 'Summary';
        }

        if (type === 'file_snapshot') {
            const files = entry.metadata?.files;
            if (Array.isArray(files)) {
                return `Snapshot (${files.length} files)`;
            }
            return 'File snapshot';
        }

        if (type === 'system' && entry.metadata?.subtype === 'compact_boundary') {
            return 'Compaction';
        }

        return 'Checkpoint';
    }

    private isCheckpointEntry(entry: any): boolean {
        const type = this.getMessageType(entry);
        if (type === 'file_snapshot' || type === 'summary') {
            return true;
        }
        if (type === 'system') {
            const subtype = entry.metadata?.subtype;
            return subtype === 'compact_boundary';
        }
        return false;
    }

    private buildThreadLayout(
        entries: any[],
        width: number,
        activeIndex: number,
        collapsedSections: Record<number, boolean> = {},
        checkpointOnly = false
    ): ThreadLayout {
        const lines: ThreadLine[] = [];
        const entryLineStarts: number[] = [];
        const sections = this.buildThreadSections(entries);

        const pushEntryLines = (entry: any, index: number, highlight: boolean): void => {
            const type = this.getMessageType(entry);
            const color = this.getEntryColor(type);

            entryLineStarts[index] = lines.length;

            const label = this.formatEntryLabel(entry);
            const timestamp = this.getEntryTimestamp(entry).toLocaleTimeString();
            lines.push({
                text: `${highlight ? '▶' : ' '} ${label} ${timestamp}`,
                color,
                bold: highlight
            });

            const content = this.getEntryContent(entry);
            const contentLines = this.wrapText(content, width);
            const bodyPrefix = highlight ? '>' : '|';
            const contentColor = type === 'tool_result' ? 'magenta'
                : type === 'system' ? 'yellow'
                : type === 'file_snapshot' ? 'cyan'
                : type === 'summary' ? 'blue'
                : undefined;
            contentLines.forEach(line => {
                lines.push({
                    text: `${bodyPrefix} ${line}`,
                    dimColor: type === 'tool_result' || type === 'system',
                    color: contentColor
                });
            });

            const metadata = this.formatEntryMetadata(entry);
            if (metadata.length > 0) {
                metadata.forEach(metaLine => {
                    lines.push({
                        text: `  ↳ ${metaLine}`,
                        dimColor: true
                    });
                });
            }
        };

        sections.forEach(section => {
            const isCollapsed = !!collapsedSections[section.id];
            const sectionActive = activeIndex >= section.startIndex && activeIndex <= section.endIndex;
            const headerIcon = section.checkpointIndex === null ? '○' : '◆';
            const collapseIcon = isCollapsed ? '+' : '-';
            const headerLineIndex = lines.length;

            lines.push({
                text: `${sectionActive ? '▶' : ' '} ${headerIcon} ${collapseIcon} ${section.title}`,
                color: sectionActive ? 'yellow' : 'gray',
                bold: sectionActive
            });

            if (checkpointOnly) {
                for (let i = section.startIndex; i <= section.endIndex; i++) {
                    entryLineStarts[i] = headerLineIndex;
                }

                if (!isCollapsed && section.checkpointIndex !== null) {
                    const checkpointEntry = entries[section.checkpointIndex];
                    if (checkpointEntry) {
                        pushEntryLines(checkpointEntry, section.checkpointIndex, section.checkpointIndex === activeIndex);
                    }
                }

                lines.push({ text: '' });
                return;
            }

            if (isCollapsed) {
                for (let i = section.startIndex; i <= section.endIndex; i++) {
                    entryLineStarts[i] = headerLineIndex;
                }
                lines.push({ text: '' });
                return;
            }

            for (let index = section.startIndex; index <= section.endIndex; index++) {
                const entry = entries[index];
                if (!entry) continue;
                pushEntryLines(entry, index, index === activeIndex);

                if (index < section.endIndex) {
                    lines.push({ text: '' });
                }
            }

            lines.push({ text: '' });
        });

        return { lines, entryLineStarts };
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

    private calculateTimelineHeight(messages: any[]): number {
        // Calculate the maximum height of the timeline based on message content
        let maxHeight = 1;
        
        for (const msg of messages) {
            const content = msg.getContent();
            const cleanContent = content
                .replace(/\[Tool:.*?\]/g, '')
                .replace(/\[Viewed:.*?\]/g, '')
                .replace(/\[Created:.*?\]/g, '')
                .replace(/\[Edited:.*?\]/g, '')
                .trim();
            const contentLength = Math.max(cleanContent.length, 20);
            
            // Same height calculation as in renderMainTimeline
            let height = 1;
            if (contentLength > 300)
                height = 2;
            if (contentLength > 1000)
                height = 3;
                
            maxHeight = Math.max(maxHeight, height);
        }
        
        return maxHeight;
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
