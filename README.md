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
- **📊 Real-time Filtering**: Live search and filter conversations by project, keywords, date
- **⚡ Multiple Export Formats**: JSON, Markdown, Simple, and Enhanced HTML with Time Machine
- **🤖 Smart Conversation Analysis**: Auto-categorize by debugging, architecture, learning, etc.
- **📁 Project-based Organization**: Group and navigate conversations by project context
- **📈 Rich Metrics & Analytics**: Comprehensive conversation statistics and insights
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
