#!/usr/bin/env node

import { ShowMeTheTalk } from '../../ShowMeTheTalk.js';
import { ConversationApplicationService } from '../../application/services/ConversationApplicationService.js';
import { resolve } from 'path';
import { homedir } from 'os';
import { readFileSync } from 'fs';

interface ParsedArgs {
    format: 'json' | 'markdown' | 'simple' | 'html';
    output: string;
    claudeDir?: string;
    sessionId?: string;
    projectPath?: string;
    includeMetadata?: boolean;
    help?: boolean;
    version?: boolean;
    tui?: boolean;
}

function parseArgs(): ParsedArgs {
    const args = process.argv.slice(2);
    const parsed: ParsedArgs = {
        format: 'simple',
        output: 'conversations.md'
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '-f':
            case '--format':
                if (nextArg) {
                    if (['json', 'markdown', 'simple', 'html'].includes(nextArg)) {
                        parsed.format = nextArg as ParsedArgs['format'];
                        i++;
                    } else {
                        console.error(`❌ Invalid format: ${nextArg}`);
                        console.error('Valid formats are: json, markdown, simple, html');
                        process.exit(1);
                    }
                }
                break;
            case '-o':
            case '--output':
                if (nextArg) {
                    parsed.output = nextArg;
                    i++;
                }
                break;
            case '-d':
            case '--claude-dir':
                if (nextArg) {
                    parsed.claudeDir = nextArg;
                    i++;
                }
                break;
            case '-s':
            case '--session':
                if (nextArg) {
                    parsed.sessionId = nextArg;
                    i++;
                }
                break;
            case '-p':
            case '--project':
                if (nextArg) {
                    parsed.projectPath = nextArg;
                    i++;
                }
                break;
            case '-m':
            case '--metadata':
                parsed.includeMetadata = true;
                break;
            case '-h':
            case '--help':
                parsed.help = true;
                break;
            case '-v':
            case '--version':
                parsed.version = true;
                break;
            case '-t':
            case '--tui':
                parsed.tui = true;
                break;
        }
    }

    return parsed;
}

function getVersion(): string {
    try {
        const packageJsonPath = resolve(__dirname, '../../../package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.version;
    } catch {
        return '1.0.0'; // fallback version
    }
}

function showVersion(): void {
    console.log(getVersion());
}

function showHelp(): void {
    console.log(`
Show Me The Talk - Claude Code Conversation Exporter

Usage: show-me-the-talk [options]

Options:
  -f, --format <format>     Export format: json, markdown, simple, html (default: interactive TUI)
  -o, --output <file>       Output file path (default: conversations.md)
  -d, --claude-dir <dir>    Claude directory path (default: ~/.claude)
  -s, --session <id>        Export specific session ID
  -p, --project <path>      Export conversations for specific project
  -m, --metadata            Include conversation metrics
  -t, --tui                 Launch interactive Terminal UI (default behavior)
  -v, --version             Show version number
  -h, --help                Show this help message

Examples:
  show-me-the-talk                                    # Launch interactive Terminal UI (default)
  show-me-the-talk --tui                              # Launch interactive Terminal UI explicitly
  show-me-the-talk -f json -o talks.json             # Export as JSON
  show-me-the-talk -s abc123 -o session.md           # Export specific session
  show-me-the-talk -p myproject -m -o project.md     # Export project with metadata

"Code is cheap, show me the talk" - Export your AI collaboration experiences!
`);
}

async function main(): Promise<void> {
    try {
        const args = parseArgs();

        if (args.help) {
            showHelp();
            return;
        }

        if (args.version) {
            showVersion();
            return;
        }

        // Default to TUI if no explicit export arguments are provided
        const hasExportArgs = args.format !== 'simple' || args.output !== 'conversations.md' || 
                            args.sessionId || args.projectPath || args.includeMetadata;
        
        if (args.tui || !hasExportArgs) {
            try {
                // Use the ComprehensiveInkTUI with React+Ink integration
                const { ComprehensiveInkTUI } = await import('../tui/ComprehensiveInkTUI.js');
                const { Container } = await import('../../infrastructure/container/Container.js');

                const claudeDir = args.claudeDir || resolve(homedir(), '.claude');
                console.log('🚀 Starting Comprehensive Ink TUI with React+Ink integration...');
                console.log('💡 Features: Timeline mode (t), User navigation (u/U), Import (i)');

                // Initialize services
                const container = Container.getInstance();
                container.registerServices(claudeDir);
                const conversationService = container.get('ConversationApplicationService') as ConversationApplicationService;

                // Create and start the Ink TUI
                const tui = new ComprehensiveInkTUI(conversationService, {
                    claudeDir,
                    debug: false
                });

                await tui.start();
                console.log('\n👋 TUI session ended');
                return;
            } catch (error) {
                console.log('❌ Failed to start TUI mode:');
                console.log(error instanceof Error ? error.message : 'Unknown error');
                console.log('\n💡 Use the enhanced CLI mode instead:');
                console.log('   --format html     # Beautiful HTML export with Time Machine features');
                console.log('   --format markdown # Enhanced markdown with emojis and formatting');
                console.log('   --metadata        # Include comprehensive conversation metrics');
                console.log('\n🚀 Available CLI filtering options:');
                console.log('   -p, --project <path>    Filter by specific project');
                console.log('   -s, --session <id>      Export specific session ID');
                console.log('   --format html           Interactive HTML with enhanced features');
                return;
            }
        }

        // Default Claude directory
        const claudeDir = args.claudeDir || resolve(homedir(), '.claude');

        console.log(`📂 Reading from: ${claudeDir}`);
        console.log(`📄 Output format: ${args.format}`);
        console.log(`💾 Writing to: ${args.output}`);

        // Validate Claude directory exists
        try {
            const showMeTheTalk = new ShowMeTheTalk(claudeDir);

            // Show progress for large exports
            console.log('🔍 Scanning for conversations...');

            const result = await showMeTheTalk.export({
                format: args.format,
                outputPath: args.output,
                sessionId: args.sessionId,
                projectPath: args.projectPath,
                includeMetadata: args.includeMetadata || false,
                simplifyToolInteractions: true
            });

            if (result.success) {
                console.log(`✅ Found ${result.conversationCount} conversation(s)`);
                console.log(`🎉 Successfully exported to: ${result.outputPath}`);

                // Show additional info for HTML exports
                if (args.format === 'html') {
                    console.log('💡 HTML export includes:');
                    console.log('   • Responsive design for all devices');
                    console.log('   • Syntax highlighting for code blocks');
                    console.log('   • Interactive conversation navigation');
                    console.log('   • Beautiful typography and styling');
                }

                // Show metadata info
                if (args.includeMetadata) {
                    console.log('📊 Export includes comprehensive conversation metrics');
                }
            } else {
                console.error(`❌ Export failed: ${result.error}`);

                // Provide helpful suggestions
                if (result.error?.includes('no such file or directory')) {
                    console.log('💡 Make sure Claude Code has been run and conversations exist in:');
                    console.log(`   ${claudeDir}/projects/`);
                }
                process.exit(1);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('ENOENT')) {
                console.error(`❌ Claude directory not found: ${claudeDir}`);
                console.log('💡 Try:');
                console.log('   • Use --claude-dir to specify a different directory');
                console.log('   • Make sure Claude Code has been run first');
                console.log('   • Check that the path exists and is readable');
            } else {
                throw error;
            }
            process.exit(1);
        }
    } catch (error) {
        console.error('💥 Unexpected error:', error instanceof Error ? error.message : error);
        console.log('🐛 If this error persists, please report it at:');
        console.log('   https://github.com/your-repo/show-me-the-talk/issues');
        process.exit(1);
    }
}

// ESM equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main };