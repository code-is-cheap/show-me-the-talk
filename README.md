# Show Me The Talk

[![npm version](https://img.shields.io/npm/v/ccshow.svg)](https://www.npmjs.com/package/ccshow)
[![npm downloads](https://img.shields.io/npm/dm/ccshow.svg)](https://www.npmjs.com/package/ccshow)
[![license](https://img.shields.io/npm/l/ccshow.svg)](https://github.com/code-is-cheap/show-me-the-talk/blob/main/LICENSE)
[![Node.js Version](https://img.shields.io/node/v/ccshow.svg)](https://nodejs.org)

> **Code is cheap, show me the talk** - Export and share your Claude Code conversation experiences!

https://github.com/user-attachments/assets/ca717e8e-acaa-45de-9f69-910930b3f1c7

A TypeScript library and CLI tool for parsing, analyzing, and exporting Claude Code conversations. Built with Domain-Driven Design principles and SOLID architecture.

## 🚀 Features

- **🖥️ Interactive Terminal UI**: Modern terminal interface with Ink + React
- **📊 Growth-Hacking Analytics Dashboard**: Spotify Wrapped-style reports with developer personas, achievements, and MBTI typing
- **🎯 Developer Persona Classification**: Discover if you're a Night Owl Full-Stack, Tech Explorer, or one of 8 other types
- **🏆 Gamified Achievement System**: Unlock 10 badges from Common to Legendary across 4 categories
- **📅 365-Day Contribution Heatmap**: GitHub-style activity grid with streak tracking and FOMO mechanisms
- **🎬 Wrapped Story Mode**: 8 swipeable full-screen cards optimized for Instagram Stories sharing
- **⚡ Multiple Export Formats**: JSON, Markdown, Simple, and Enhanced HTML with Time Machine
- **🤖 Smart Conversation Analysis**: Auto-categorize by debugging, architecture, learning, etc.
- **📁 Project-based Organization**: Group and navigate conversations by project context
- **⌨️ Keyboard Navigation**: Professional terminal experience optimized for developers
- **🎨 Enhanced HTML Export**: Interactive conversations with syntax highlighting and timeline
- **🔍 Advanced Parsing**: Extract meaningful dialogues from Claude Code JSONL files
- **🛠️ TypeScript**: Full type safety with modern development experience

## 📦 Installation

### Global Installation (Recommended for CLI usage)
```bash
# Simple package name
npm install -g ccshow

# Or use the full name (preserves the "code is cheap, show me the talk" slogan)
npm install -g @code-is-cheap/show-me-the-talk
```

### Local Installation
```bash
npm install ccshow
# or: npm install @code-is-cheap/show-me-the-talk
```

### One-time Usage with npx
```bash
npx ccshow --help
```

## 🎯 Quick Start

### Interactive Terminal UI (Default)

```bash
# Launch interactive TUI - multiple command options available:
ccshow                    # Shortest command
show-me-the-talk         # Full command name
smtt                     # Quick alias
cctalk                   # Claude Code Talk

# All commands are equivalent and launch the same TUI
```

### Command Line Export

```bash
# Export all conversations as JSON (use any command: ccshow, show-me-the-talk, smtt, or cctalk)
ccshow -f json -o my-conversations.json

# Export with metadata and analytics
ccshow -f json -o detailed.json -m

# Export specific project conversations
ccshow -f markdown -o project.md -p "/path/to/project"

# Export single conversation session
ccshow -f html -o session.html -s "session-id-here"
```

## 🛠️ Usage

### CLI Options

```bash
Usage: ccshow [options]
   or: show-me-the-talk [options]
   or: smtt [options]
   or: cctalk [options]

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
```

### Export Formats

#### 1. **JSON** - Machine-readable structured data
```bash
ccshow -f json -o data.json
```

#### 2. **Markdown** - Human-readable documentation
```bash
ccshow -f markdown -o conversations.md
```

#### 3. **Simple** - Clean, minimal format
```bash
ccshow -f simple -o clean.md
```

#### 4. **HTML** - Enhanced web format with Time Machine
```bash
ccshow -f html -o interactive.html
```

## 📚 Library Usage

### Basic Usage

```typescript
import { ShowMeTheTalk } from 'ccshow';

const tool = new ShowMeTheTalk('~/.claude');
const conversations = await tool.getConversations();

// Export conversations
await tool.export('json', 'output.json', {
  includeMetadata: true,
  projectPath: '/path/to/project'
});
```

### Advanced Usage

```typescript
import {
  ShowMeTheTalk,
  ExportConfiguration,
  ConversationFilter
} from 'ccshow';

const tool = new ShowMeTheTalk('~/.claude');

// Custom export configuration
const config = ExportConfiguration.create()
  .withFormat('html')
  .withMetadata(true)
  .withTimeMachine(true)
  .build();

// Apply filters
const filter = new ConversationFilter()
  .byProject('/my/project')
  .byCategory('debugging')
  .afterDate(new Date('2024-01-01'));

const conversations = await tool.getConversations(filter);
await tool.exportWithConfig(conversations, 'output.html', config);
```

## 📊 Analytics Dashboard

Show Me The Talk includes a **growth-hacking analytics dashboard** that transforms your conversation data into shareable, viral-ready insights inspired by Spotify Wrapped, GitHub Year in Review, and Duolingo streaks.

### ✨ Key Features

- **🎯 Developer Persona Classification** - Discover your coding personality type (8 types with MBTI mapping)
- **🏆 Achievement System** - Unlock 10 badges across 4 categories (Activity, Consistency, Exploration, Mastery)
- **📅 Contribution Heatmap** - GitHub-style 365-day activity grid with streak tracking
- **🎬 Wrapped Story** - 8 swipeable full-screen cards optimized for Instagram Stories
- **📈 Hero-First Design** - 100vh gradient hero section with persona + MBTI reveal
- **💬 MBTI Typing** - Each persona mapped to Myers-Briggs type (ENTP, INTJ, ENFP, etc.)

### 🚀 Generate Your Analytics

```bash
# Build and generate analytics report
npm run build
npx tsx scripts/test-analytics.ts

# Open the generated HTML
open test-analytics-report.html
```

> 💡 **Optional LLM sentence insights** – to let the dashboard summarize full sentences (not just words), set the following before running the script:
> ```bash
> export ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic/v1/messages
> export ANTHROPIC_AUTH_TOKEN=YOUR_GLM_KEY            # e.g. 4ea0...DI
> export ANALYTICS_LLM_MODEL=GLM-4.6                  # optional override
> export ANALYTICS_LLM_MAX_TOKENS=2048                # optional override
> export ANALYTICS_LLM_MODE=mock|auto|live            # default auto
> ```
> `mock` mode replays `tests/fixtures/llm/sentence-insights.mock.json` so CI stays deterministic; set `live` only when you want to hit GLM for real.  You can also persist live responses via `ANALYTICS_LLM_CACHE_PATH=/tmp/sentence-insights.json`.
> Without these variables the report falls back to the built-in heuristic analysis.

### 📱 What's in the Dashboard?

**Tier 1: Hero (Above Fold)**
- Your coding year overview (2025)
- Developer persona reveal (e.g., "Tech Explorer 🧭")
- MBTI typing (e.g., "ENTP - The Visionary")
- Total conversations (giant 128px number)
- Massive CTA: "View Your Wrapped Story"

**Tier 2: Social Proof**
- Achievement badges with rarity tiers (Common → Legendary)
- 365-day contribution heatmap with current/longest streaks
- Activity statistics (active days, most productive hour)

**Tier 3: Identity**
- Top 5 technologies with medal icons (🥇🥈🥉)
- Word cloud with TF-IDF weighting
- Multi-theme switcher (Vibrant/Gradient/Monochrome)

**Tier 4: Details (Collapsible)**
- Conversation statistics
- Task distribution charts
- Topic clusters
- Timeline evolution
- AI-generated insights

### 🎯 8-Card Wrapped Story

1. **Welcome** - "Your 2025 Coding Year"
2. **Big Number** - Total conversations with motivational context
3. **Word Cloud** - Top 20 words visualized
4. **Heatmap** - Streak display (🔥 Fire emoji for active streaks)
5. **Tech Stack** - Top 5 technologies ranked
6. **Achievements** - Unlocked badges (top 3 by rarity)
7. **Persona** - Your developer type with MBTI badge
8. **Share** - Social sharing buttons (Twitter, LinkedIn, Download)

### 📖 Documentation

- **[Complete Handover](docs/ANALYTICS_HANDOVER.md)** - 50+ page technical documentation
- **[Quick Start Guide](docs/QUICK_START.md)** - 5-minute setup and common tasks
- **[Test Script](scripts/test-analytics.ts)** - Example analytics generation

### 🎨 Developer Personas

| Persona | MBTI | Description |
|---------|------|-------------|
| 🦉 Night Owl Full-Stack | ENTP | Code when the world sleeps, exploring everything |
| 🌅 Early Bird Architect | INTJ | Start early, plan carefully, build with intention |
| ⚔️ Weekend Warrior | ENFP | Save coding adventures for weekends |
| 📚 Consistent Learner | ISFJ | Every day is a learning day |
| 🧭 Tech Explorer | ENTP | Love discovering new technologies |
| 🎯 Deep Specialist | ISTJ | Dive deep, master thoroughly |
| ⚡ Sprint Coder | ESTP | Work in intense bursts |
| 🏗️ Steady Builder | ISFJ | Build consistently, steady progress |

### 🏆 Achievement Badges

**Legendary** 💎
- Century Club (100+ conversations)
- Marathon Runner (14-day streak)

**Epic** 🔮
- Week Warrior (7-day streak)

**Rare** 💎
- Full-Stack Explorer (10+ technologies)
- Knowledge Seeker (50+ conversations)
- Deep Diver (50+ messages in one conversation)
- Consistent Learner (30+ active days)

**Common** ⭐
- First Steps (first conversation)
- Tech Enthusiast (5+ technologies)
- Productive Day (5+ conversations in one day)

### 📊 Sample Output

The dashboard generates a **self-contained 117 KB HTML file** with:
- ✅ Zero external dependencies at runtime
- ✅ Embedded CSS/JS for offline use
- ✅ CDN-loaded libraries (Chart.js, D3, Swiper.js)
- ✅ Responsive design (desktop + mobile)
- ✅ Dark mode support
- ✅ Print-friendly styles

**Perfect for:**
- Social media screenshots 📸
- Portfolio showcases 💼
- Year-end reviews 🎉
- Team presentations 👥
- Personal bragging rights 🏆

## 🏗️ Architecture

Built with **Domain-Driven Design** and **Clean Architecture** principles:

```
src/
├── domain/              # Core business logic
│   ├── models/          # Entities and value objects
│   ├── services/        # Domain services
│   └── repositories/    # Repository interfaces
├── application/         # Application orchestration
│   ├── dto/            # Data transfer objects
│   └── services/       # Application services
├── infrastructure/      # External concerns
│   ├── persistence/    # Data access implementations
│   ├── filesystem/     # File operations
│   └── container/      # Dependency injection
└── presentation/        # User interfaces
    ├── cli/            # Command-line interface
    └── tui/            # Terminal user interface
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- TypeScript 5+

### Setup
```bash
git clone https://github.com/code-is-cheap/show-me-the-talk.git
cd show-me-the-talk
npm install
npm run build
```

### Development Scripts
```bash
npm run dev         # Development mode with tsx
npm run build       # Build TypeScript to JavaScript
npm run watch       # Build in watch mode
npm run test        # Run all tests
npm run lint        # Run ESLint
npm run format      # Format with Prettier
```

### Testing
```bash
npm test                    # Run all tests
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and development process.

## 📈 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## 🆘 Support

- 📖 [Documentation](https://github.com/code-is-cheap/show-me-the-talk/wiki)
- 🐛 [Issue Tracker](https://github.com/code-is-cheap/show-me-the-talk/issues)
- 💬 [Discussions](https://github.com/code-is-cheap/show-me-the-talk/discussions)

---

<div align="center">

**Show Me The Talk** - Making Claude Code conversations shareable and accessible! 🚀

Made with ❤️ by [@code-is-cheap](https://github.com/code-is-cheap)

[NPM Package](https://www.npmjs.com/package/ccshow) • [GitHub Repository](https://github.com/code-is-cheap/show-me-the-talk) • [Report Bug](https://github.com/code-is-cheap/show-me-the-talk/issues) • [Request Feature](https://github.com/code-is-cheap/show-me-the-talk/discussions)

</div>
