#!/usr/bin/env node

import { ShowMeTheTalk } from '../../ShowMeTheTalk.js';
import { ConversationApplicationService } from '../../application/services/ConversationApplicationService.js';
import { CostAnalysisApplicationService } from '../../application/services/CostAnalysisApplicationService.js';
import { UsageGrouping } from '../../domain/models/usage/UsageReport.js';
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
    includeRaw?: boolean;
    help?: boolean;
    version?: boolean;
    tui?: boolean;
    costReport?: string;
    costGroup?: UsageGrouping;
    costSince?: string;
    costUntil?: string;
    costProject?: string;
    costMode?: 'auto' | 'calculate' | 'display';
    costTimezone?: string;
    costLocale?: string;
    costOrder?: 'asc' | 'desc';
    costBreakdown?: boolean;
    costInstances?: boolean;
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
            case '--raw':
            case '--full':
                parsed.includeRaw = true;
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
            case '--cost-report':
                if (nextArg) {
                    parsed.costReport = nextArg;
                    i++;
                }
                break;
            case '--cost-group':
                if (nextArg && isValidUsageGrouping(nextArg)) {
                    parsed.costGroup = nextArg;
                    i++;
                } else if (nextArg) {
                    console.error(`❌ Invalid cost grouping: ${nextArg}`);
                    console.error('Valid values: daily, weekly, monthly, session, blocks');
                    process.exit(1);
                }
                break;
            case '--cost-since':
                if (nextArg) {
                    parsed.costSince = nextArg;
                    i++;
                }
                break;
            case '--cost-until':
                if (nextArg) {
                    parsed.costUntil = nextArg;
                    i++;
                }
                break;
            case '--cost-project':
                if (nextArg) {
                    parsed.costProject = nextArg;
                    i++;
                }
                break;
            case '--cost-mode':
                if (nextArg && ['auto', 'calculate', 'display'].includes(nextArg)) {
                    parsed.costMode = nextArg as ParsedArgs['costMode'];
                    i++;
                }
                break;
            case '--cost-timezone':
                if (nextArg) {
                    parsed.costTimezone = nextArg;
                    i++;
                }
                break;
            case '--cost-locale':
                if (nextArg) {
                    parsed.costLocale = nextArg;
                    i++;
                }
                break;
            case '--cost-order':
                if (nextArg && ['asc', 'desc'].includes(nextArg)) {
                    parsed.costOrder = nextArg as ParsedArgs['costOrder'];
                    i++;
                }
                break;
            case '--cost-breakdown':
                parsed.costBreakdown = true;
                break;
            case '--no-cost-breakdown':
                parsed.costBreakdown = false;
                break;
            case '--cost-instances':
                parsed.costInstances = true;
                break;
        }
    }

    return parsed;
}

function isValidUsageGrouping(value: string): value is UsageGrouping {
    return ['daily', 'weekly', 'monthly', 'session', 'blocks'].includes(value);
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
      --raw, --full         Include full raw transcript entries
  -t, --tui                 Launch interactive Terminal UI (default behavior)
  --cost-report <file>      Generate cost analysis JSON via ccusage (requires ccusage CLI)
      --cost-group <mode>   Grouping for analysis: daily, weekly, monthly, session, blocks (default: daily)
      --cost-since <yyyymmdd>  Filter start date passed to ccusage
      --cost-until <yyyymmdd>  Filter end date passed to ccusage
      --cost-project <name> Filter ccusage data to a project/instance name
      --cost-mode <mode>    ccusage cost mode: auto | calculate | display
      --cost-timezone <tz>  Timezone for ccusage aggregation (e.g., America/Los_Angeles)
      --cost-order <dir>    Sort order for ccusage output: asc | desc (default: asc)
      --cost-breakdown      Force per-model breakdown (default behavior)
      --no-cost-breakdown   Disable ccusage breakdown flag
      --cost-instances      Include ccusage --instances breakdown per project
  -v, --version             Show version number
  -h, --help                Show this help message

Examples:
  show-me-the-talk                                    # Launch interactive Terminal UI (default)
  show-me-the-talk --tui                              # Launch interactive Terminal UI explicitly
  show-me-the-talk -f json -o talks.json             # Export as JSON
  show-me-the-talk -s abc123 -o session.md           # Export specific session
  show-me-the-talk -p myproject -m -o project.md     # Export project with metadata
  show-me-the-talk -f html --raw -o full.html        # Export full raw transcript

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

        if (args.costReport) {
            await generateCostAnalysis(args);
            return;
        }

        // Default to TUI if no explicit export arguments are provided
        const hasExportArgs = args.format !== 'simple' || args.output !== 'conversations.md' || 
                            args.sessionId || args.projectPath || args.includeMetadata || args.includeRaw;
        
        if (args.tui || !hasExportArgs) {
            try {
                // Use the ComprehensiveInkTUI with React+Ink integration
                const { ComprehensiveInkTUI } = await import('../tui/ComprehensiveInkTUI.js');
                const { Container } = await import('../../infrastructure/container/Container.js');

                const claudeDir = args.claudeDir || resolve(homedir(), '.claude');
                console.log('🚀 Starting Comprehensive Ink TUI with React+Ink integration...');
                console.log('💡 Features: Timeline mode (t), Thread view (v), Raw view (r), User navigation (u/U), Import (i)');

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
                console.log('   --raw             # Include full raw transcript entries');
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
                simplifyToolInteractions: true,
                includeRaw: args.includeRaw
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
                if (args.includeRaw) {
                    console.log('🧾 Export includes full raw transcript entries');
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

async function generateCostAnalysis(args: ParsedArgs): Promise<void> {
    if (!args.costReport) {
        throw new Error('Cost analysis requires --cost-report <file>.');
    }

    const grouping = args.costGroup ?? 'daily';
    console.log(`📊 Generating ${grouping} cost analysis via ccusage...`);

    try {
        const costService = new CostAnalysisApplicationService();
        const { report, outputPath, command } = await costService.generateReport({
            grouping,
            outputPath: args.costReport,
            since: args.costSince,
            until: args.costUntil,
            project: args.costProject,
            mode: args.costMode,
            timezone: args.costTimezone,
            locale: args.costLocale,
            order: args.costOrder ?? 'asc',
            includeBreakdown: args.costBreakdown ?? true,
            includeInstances: args.costInstances ?? false
        });

        console.log(`✅ Cost analysis saved to: ${outputPath}`);
        console.log(`   Command: ${command.join(' ')}`);
        console.log(`   Total cost: $${report.totals.costUSD.toFixed(4)}`);
        console.log(`   Entries analyzed: ${report.totals.entryCount}`);
        if (report.modelUsage.length) {
            const topModel = report.modelUsage[0];
            console.log(`   Top model: ${topModel.model} (${(topModel.shareOfCost * 100).toFixed(1)}% of spend)`);
        }
    } catch (error) {
        console.error('❌ Failed to generate cost analysis.');
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }
        console.error('💡 Make sure the ccusage CLI is installed and accessible in your PATH.');
        process.exit(1);
    }
}

// ESM equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main };
