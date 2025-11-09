import { homedir } from 'os';
import { resolve } from 'path';
import { JsonlConversationRepository } from '../src/infrastructure/persistence/JsonlConversationRepository.js';
import { HourlyActivityAnalyzer } from '../src/domain/services/analytics/HourlyActivityAnalyzer.js';

interface CliOptions {
    claudeDir: string;
    lookbackDays: number;
    maxHistory?: number;
}

function parseArgs(argv: string[]): CliOptions {
    const defaults: CliOptions = {
        claudeDir: resolve(homedir(), '.claude'),
        lookbackDays: 120
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if ((arg === '--claude-dir' || arg === '-d') && argv[i + 1]) {
            defaults.claudeDir = resolve(argv[++i]);
        } else if ((arg === '--lookback' || arg === '-l') && argv[i + 1]) {
            const parsed = Number(argv[++i]);
            if (!Number.isNaN(parsed) && parsed > 0) {
                defaults.lookbackDays = parsed;
            }
        } else if (arg === '--max-history' && argv[i + 1]) {
            const parsed = Number(argv[++i]);
            if (!Number.isNaN(parsed) && parsed > 0) {
                defaults.maxHistory = parsed;
            }
        }
    }

    return defaults;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    console.log('🗂  Claude directory:', args.claudeDir);
    console.log('📆 Lookback window:', `${args.lookbackDays} days`);

    const repository = new JsonlConversationRepository(args.claudeDir);
    const conversations = await repository.findAll();
    console.log('💬 Conversations loaded:', conversations.length);

    const analyzer = new HourlyActivityAnalyzer({
        claudeDir: args.claudeDir,
        lookbackDays: args.lookbackDays,
        maxHistoryRecords: args.maxHistory
    });

    const summary = await analyzer.analyze(conversations);
    if (!summary) {
        console.log('⚠️  Unable to derive hourly activity. Make sure ~/.claude/history.jsonl exists or add more conversations.');
        return;
    }

    console.log('\n⏱️  Hourly Momentum Preview');
    console.log('Timezone         :', summary.timezone);
    console.log('Total touchpoints:', summary.totalEvents);
    console.log('Prime hour       :', summary.peakHour?.label ?? 'n/a');
    console.log('Focus window     :', summary.focusWindow?.label ?? 'n/a');
    console.log('Night share      :', `${(summary.nightShare * 100).toFixed(1)}%`);
    console.log('Weekend share    :', `${(summary.weekendShare * 100).toFixed(1)}%`);
    console.log('Recommendations  :');
    summary.recommendations.slice(0, 3).forEach(rec => {
        console.log(`  ${rec.icon}  ${rec.title} – ${rec.description}`);
    });

    console.log('\n🧾 JSON payload (copy into analytics debugger if needed):');
    console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
    console.error('Hourly activity analyzer failed:', error);
    process.exitCode = 1;
});
