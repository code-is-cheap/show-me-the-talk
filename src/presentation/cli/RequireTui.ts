/**
 * Require-based TUI Implementation
 * Uses require() instead of import() to avoid ESM compatibility issues
 */

export interface TuiOptions {
    projectPath?: string;
    showHelp?: boolean;
    claudeDir?: string;
}

export class RequireTui {
    private static instance: RequireTui;
    private rl: any = null;

    static getInstance(): RequireTui {
        if (!RequireTui.instance) {
            RequireTui.instance = new RequireTui();
        }
        return RequireTui.instance;
    }

    async checkCompatibility(): Promise<{ compatible: boolean; error?: string }> {
        // Require-based approach is always compatible in CommonJS
        return { compatible: true };
    }

    async startTui(options: TuiOptions): Promise<{ clear: () => void; waitUntilExit: () => Promise<void> }> {
        try {
            // Clear screen and hide cursor
            process.stdout.write('\x1b[2J\x1b[0;0H\x1b[?25l');

            // Use require instead of import to avoid ESM issues
            const { Container } = require('../../infrastructure/container/Container');
            const container = Container.getInstance();
            container.registerServices(options.claudeDir || require('os').homedir() + '/.claude');

            const conversationRepo = container.get('ConversationRepository');

            // Load projects
            const projects = await this.loadProjects(conversationRepo);

            if (projects.length === 0) {
                this.showNoProjects();
                return this.createExitHandler();
            }

            // Show interactive project selection
            await this.showProjectSelection(projects);

            return this.createExitHandler();
        } catch (error) {
            throw new Error(`Failed to start require TUI: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async loadProjects(conversationRepo: any): Promise<any[]> {
        const allProjects = await conversationRepo.getAllProjects();
        const projectInfos = [];

        for (const project of allProjects) {
            const conversations = await conversationRepo.findByProjectContext(project);
            if (conversations.length > 0) {
                projectInfos.push({
                    path: project.getOriginalPath(),
                    name: project.getOriginalPath().split('-').pop() || project.getOriginalPath(),
                    conversations: conversations.length
                });
            }
        }

        return projectInfos.sort((a, b) => b.conversations - a.conversations);
    }

    private async showProjectSelection(projects: any[]): Promise<void> {
        let selectedIndex = 0;
        const maxIndex = projects.length - 1;

        const render = () => {
            // Clear screen and move to top
            process.stdout.write('\x1b[2J\x1b[0;0H');

            // Header with box drawing
            this.println('┌─────────────────────────────────────────────────────────────┐', 'cyan');
            this.println('│ 🚀 Show Me The Talk - Interactive Project Selection       │', 'cyan', true);
            this.println('│ ↑/↓ navigate • Enter select • q quit                      │', 'gray');
            this.println('└─────────────────────────────────────────────────────────────┘', 'cyan');
            this.println('');

            this.println(`📊 Found ${projects.length} projects with conversations`, 'green', true);
            this.println('');

            // Project list with better formatting
            projects.forEach((project, index) => {
                const isSelected = index === selectedIndex;
                const prefix = isSelected ? '▶ ' : '  ';
                const symbol = '📁';
                const name = project.name.length > 30 ? project.name.substring(0, 27) + '...' : project.name;
                const conversations = `(${project.conversations} conversations)`;

                if (isSelected) {
                    this.println(`${prefix}${symbol} ${name.padEnd(35)} ${conversations}`, 'black', true, 'cyan');
                } else {
                    this.println(`${prefix}${symbol} ${name.padEnd(35)} ${conversations}`, 'green');
                }
            });

            this.println('');
            this.println('┌─────────────────────────────────────────────────────────────┐', 'blue');
            this.println('│ 💡 Select a project to get the export CLI command          │', 'blue');
            this.println('└─────────────────────────────────────────────────────────────┘', 'blue');
        };

        const handleInput = (key: string): boolean => {
            switch (key) {
                case '\u001b[A': // Up arrow
                    selectedIndex = Math.max(0, selectedIndex - 1);
                    render();
                    break;
                case '\u001b[B': // Down arrow
                    selectedIndex = Math.min(maxIndex, selectedIndex + 1);
                    render();
                    break;
                case '\r': // Enter
                    const selected = projects[selectedIndex];
                    this.showProjectSelected(selected);
                    return true; // Exit
                case 'q':
                case '\u001b': // Escape
                    return true; // Exit
            }
            return false;
        };

        // Initial render
        render();

        // Set up input handling
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }

        return new Promise<void>((resolve) => {
            process.stdin.on('data', (chunk) => {
                const key = chunk.toString();
                if (handleInput(key)) {
                    resolve();
                }
            });
        });
    }

    private showProjectSelected(project: any): void {
        process.stdout.write('\x1b[2J\x1b[0;0H');

        this.println('┌─────────────────────────────────────────────────────────────┐', 'green');
        this.println('│ ✅ Project Selected Successfully!                          │', 'green', true);
        this.println('└─────────────────────────────────────────────────────────────┘', 'green');
        this.println('');

        this.println(`📁 Project: ${project.name}`, 'cyan', true);
        this.println(`💬 Conversations: ${project.conversations}`, 'blue', true);
        this.println('');

        this.println('🚀 Copy and run this command to export:', 'yellow', true);
        this.println('');
        this.println('┌─────────────────────────────────────────────────────────────┐', 'white');
        this.println(`│ show-me-the-talk --project "${project.path}" --format html    │`, 'white', true);
        this.println('└─────────────────────────────────────────────────────────────┘', 'white');
        this.println('');

        this.println('💡 Available export formats:', 'cyan', true);
        this.println('   --format html      Interactive HTML with Time Machine', 'gray');
        this.println('   --format markdown  Enhanced markdown with formatting', 'gray');
        this.println('   --format json      Structured JSON data', 'gray');
        this.println('   --format simple    Clean text format', 'gray');
        this.println('');

        this.println('📊 Additional options:', 'cyan', true);
        this.println('   --metadata         Include conversation metrics', 'gray');
        this.println('   --session <id>     Export specific session only', 'gray');
        this.println('');

        this.println('Press any key to exit...', 'yellow', true);
    }

    private showNoProjects(): void {
        process.stdout.write('\x1b[2J\x1b[0;0H');

        this.println('┌─────────────────────────────────────────────────────────────┐', 'yellow');
        this.println('│ 📂 No Projects Found                                       │', 'yellow', true);
        this.println('└─────────────────────────────────────────────────────────────┘', 'yellow');
        this.println('');

        this.println('No Claude Code conversations found in ~/.claude/projects/', 'gray');
        this.println('');

        this.println('💡 To fix this:', 'cyan', true);
        this.println('   • Run Claude Code and have some conversations', 'gray');
        this.println('   • Make sure the Claude directory exists', 'gray');
        this.println('   • Try specifying a different path with --claude-dir', 'gray');
        this.println('');

        this.println('Press any key to exit...', 'yellow', true);
    }

    private println(text: string, color?: string, bold?: boolean, bgColor?: string): void {
        let output = '';

        // Background color
        if (bgColor) {
            const bgColors: Record<string, string> = {
                'cyan': '\x1b[46m',
                'green': '\x1b[42m',
                'yellow': '\x1b[43m',
                'red': '\x1b[41m',
                'blue': '\x1b[44m'
            };
            output += bgColors[bgColor] || '';
        }

        // Text color and style
        if (bold) output += '\x1b[1m';
        if (color) {
            const colors: Record<string, string> = {
                'red': '\x1b[31m',
                'green': '\x1b[32m',
                'yellow': '\x1b[33m',
                'blue': '\x1b[34m',
                'magenta': '\x1b[35m',
                'cyan': '\x1b[36m',
                'white': '\x1b[37m',
                'gray': '\x1b[90m',
                'black': '\x1b[30m'
            };
            output += colors[color] || '';
        }

        output += text;
        output += '\x1b[0m'; // Reset

        console.log(output);
    }

    private createExitHandler(): { clear: () => void; waitUntilExit: () => Promise<void> } {
        return {
            clear: () => {
                this.clear();
            },
            waitUntilExit: () => {
                return new Promise<void>((resolve) => {
                    process.stdin.once('data', () => {
                        this.clear();
                        resolve();
                    });
                });
            }
        };
    }

    private clear(): void {
        // Show cursor and restore terminal
        process.stdout.write('\x1b[?25h\x1b[2J\x1b[0;0H');

        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
    }

    getUnavailabilityMessage(): string {
        return `🔄 TUI mode is temporarily unavailable.
💡 Use the enhanced CLI mode instead:
   --format html     # Beautiful HTML export with Time Machine features
   --format markdown # Enhanced markdown with emojis and formatting
   --metadata        # Include comprehensive conversation metrics

🚀 Available CLI filtering options:
   -p, --project <path>    Filter by specific project
   -s, --session <id>      Export specific session ID
   --format html           Interactive HTML with enhanced features`;
    }
}