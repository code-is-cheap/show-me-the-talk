# Show Me The Talk

> **Code is cheap, show me the talk** - Export and share your Claude Code conversation experiences!

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
npm install -g @code-is-cheap/show-me-the-talk
```

### Local Installation
```bash
npm install @code-is-cheap/show-me-the-talk
```

### One-time Usage with npx
```bash
npx @code-is-cheap/show-me-the-talk --help
```

## 🎯 Quick Start

### Interactive Terminal UI (Default)

```bash
# Launch interactive TUI (default behavior)
show-me-the-talk

# Short command alias
smtt

# Explicit TUI launch
show-me-the-talk --tui
```

The TUI provides:
- 🔍 **Interactive conversation browser** with real-time filtering
- ⌨️ **Keyboard navigation** (arrow keys, Enter to view, Esc to go back)
- 📊 **Live conversation metrics** and project organization
- 🎯 **Search and filter** by project, keywords, or date ranges
- 📱 **Responsive design** optimized for terminal environments

### Export Modes

```bash
# Export as JSON with metadata
show-me-the-talk -f json -o conversations.json -m

# Export as enhanced HTML with Time Machine features
show-me-the-talk -f html -o conversations.html

# Export specific session
show-me-the-talk -s abc123 -o session.md

# Export project conversations with metadata
show-me-the-talk -p /path/to/project -m -o project-talks.md

# One-time usage with npx (no installation required)
npx @code-is-cheap/show-me-the-talk -f json -o my-talks.json
```

### Programmatic Usage

```typescript
import { ShowMeTheTalk } from '@code-is-cheap/show-me-the-talk';

const smtt = new ShowMeTheTalk('~/.claude');

// Get all conversations
const conversations = await smtt.getAllConversations();

// Export to file
const result = await smtt.export({
  format: 'json',
  outputPath: 'my-conversations.json',
  includeMetadata: true
});

// Get metrics
const metrics = await smtt.getMetrics();
console.log(`Total conversations: ${metrics.totalConversations}`);

// Get categorized conversations
const categorized = await smtt.getCategorizedConversations();
console.log(`Debugging sessions: ${categorized.debugging.length}`);
```

## 🏗️ Architecture

This project follows **Domain-Driven Design (DDD)** principles with clean architecture:

```
src/
├── domain/           # Core business logic
│   ├── models/       # Domain entities (Conversation, Message, etc.)
│   ├── repositories/ # Repository interfaces
│   └── services/     # Domain services
├── application/      # Application orchestration
│   ├── dto/         # Data Transfer Objects
│   └── services/    # Application services
├── infrastructure/   # External concerns
│   ├── container/   # Dependency injection
│   ├── filesystem/  # File operations
│   └── persistence/ # Data access implementations
└── presentation/     # User interfaces
    └── cli/         # Command-line interface
```

### Key Principles Applied

- **SOLID Principles**: Each class has a single responsibility
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Repository Pattern**: Abstract data access behind interfaces
- **Dependency Injection**: Loose coupling between components
- **Clean Architecture**: Dependencies point inward toward the domain

## 📋 CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|----------|
| `--tui` | `-t` | Launch interactive Terminal UI | `default behavior` |
| `--format` | `-f` | Export format: `json`, `markdown`, `simple`, `html` | `simple` |
| `--output` | `-o` | Output file path | `conversations.md` |
| `--claude-dir` | `-d` | Claude directory path | `~/.claude` |
| `--session` | `-s` | Export specific session ID | - |
| `--project` | `-p` | Export conversations for specific project | - |
| `--metadata` | `-m` | Include conversation metrics | `false` |
| `--help` | `-h` | Show help message | - |
| `--version` | `-v` | Show version number | - |

## 📊 Export Formats

### Interactive Terminal UI (Default)

Modern terminal interface with real-time conversation browsing:

- **Live filtering** by project, keywords, date ranges
- **Keyboard navigation** (↑↓ for selection, Enter to view, Esc to go back)
- **Conversation preview** with metadata and quick stats
- **Project organization** with hierarchical navigation
- **Search functionality** across all conversations
- **Professional display** optimized for developer workflows

### Enhanced HTML Format

Interactive HTML export with Time Machine functionality:

```bash
show-me-the-talk -f html -o conversations.html
```

Features:
- **Responsive design** for all device sizes
- **Syntax highlighting** for code blocks with language detection
- **Interactive timeline** for conversation replay
- **Time Machine controls** (play/pause, speed control, filtering)
- **Modern typography** and beautiful styling
- **Search capabilities** built into the interface

### Simple Format

Clean, readable markdown focused on the conversation content:

```markdown
# Claude Code Conversations (Simplified)

## Session: abc123
**Project**: /path/to/project  
**Duration**: 15 minutes  
**Messages**: 8

### Q: How do I implement Domain-Driven Design in TypeScript?

**A**: To implement Domain-Driven Design in TypeScript, you should start with...

[Viewed: /src/domain/models/User.ts]

### Q: How can I improve this code structure?

**A**: I can see several opportunities for improvement...
```

### JSON Format

Structured data with full conversation details and metadata:

```json
{
  "conversations": [
    {
      "sessionId": "abc123",
      "projectPath": "/path/to/project",
      "startTime": "2023-01-01T10:00:00Z",
      "endTime": "2023-01-01T10:15:00Z",
      "messageCount": 8,
      "messages": [...]
    }
  ],
  "metrics": {
    "totalConversations": 1,
    "totalMessages": 8,
    "averageMessagesPerConversation": 8
  }
}
```

### Markdown Format

Detailed markdown with full conversation context and tool interactions.

## 🖥️ Terminal UI Guide

### Getting Started

Simply run the command to launch the interactive interface:

```bash
show-me-the-talk
# or
smtt
```

### Keyboard Controls

| Key | Action |
|-----|--------|
| `↑↓` | Navigate conversations |
| `Enter` | View selected conversation |
| `Esc` | Go back/Exit |
| `/` | Search conversations |
| `f` | Filter by project |
| `c` | Filter by category |
| `r` | Refresh conversations |
| `q` | Quit application |

### Features

- **Real-time Search**: Type to filter conversations instantly
- **Project Navigation**: Browse conversations organized by project
- **Category Filtering**: Filter by debugging, learning, architecture, etc.
- **Conversation Preview**: See metadata before opening full conversation
- **Export Options**: Export filtered results directly from TUI
- **Live Metrics**: See conversation counts and statistics in real-time

### TUI Requirements

- **Terminal**: Works best in modern terminals (iTerm2, Warp, Windows Terminal)
- **Colors**: Supports 256-color terminals for optimal experience
- **Size**: Minimum 80x24, recommended 120x30 for best experience
- **Node.js**: Requires Node.js 18+ for Ink framework support

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd show-me-the-talk

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

### Using Make

This project includes a comprehensive Makefile:

```bash
# Show available commands
make help

# Full development setup
make setup

# Run all quality checks
make check

# Run tests with coverage
make test-coverage

# Build and validate
make validate
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🎨 Code Quality

This project maintains high code quality standards:

- **TypeScript**: Full type safety with strict mode
- **ESLint**: Consistent code style and best practices
- **Prettier**: Automatic code formatting
- **Vitest**: Fast unit and integration testing
- **Test Coverage**: 80%+ coverage requirements
- **Domain-Driven Design**: Clean architecture principles

## 📈 Conversation Categories

The tool automatically categorizes conversations based on content:

- **🐛 Debugging**: Bug fixes, error resolution, troubleshooting
- **🏗️ Architecture**: Design decisions, structure planning, patterns
- **⚡ Implementation**: New features, coding, development
- **🔄 Refactoring**: Code improvement, optimization, restructuring
- **📚 Learning**: Questions, explanations, how-to guides
- **📂 Other**: Miscellaneous conversations

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style
4. Add tests for new functionality
5. Ensure all quality checks pass
6. Submit a pull request

### Development Guidelines

- Follow Domain-Driven Design principles
- Write comprehensive tests
- Maintain high test coverage
- Use descriptive commit messages
- Update documentation as needed

## 📝 License

[MIT License](LICENSE)

## 🙏 Acknowledgments

- Built for the Claude Code community
- Inspired by the philosophy: "Code is cheap, show me the talk"
- Designed to help developers share their AI collaboration experiences

---

**Show Me The Talk** - Because the conversation is often more valuable than the code! 💬✨