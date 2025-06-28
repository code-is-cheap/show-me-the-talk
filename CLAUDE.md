# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Workflow
```bash
# Build the project
npm run build

# Development mode with live reload
npm run dev

# Watch mode for continuous building
npm run watch

# Type checking without building
npm run typecheck
```

### Testing
```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit                    # Unit tests only  
npm run test:integration            # Integration tests only
npm run test:watch                  # Watch mode
npm run test:coverage              # With coverage report
npm run test:ui                    # Visual test interface

# Run working tests only (recommended)
npm run test:unit -- tests/unit/tui/
npm run test:integration

# Run single test file
npm test tests/unit/tui/ComprehensiveInkTUI.test.ts
npm run test:unit -- tests/unit/tui/title-truncation.test.ts

# Phase 1 Implementation Tests (Enhanced Features)
npm run test:phase1                 # Phase 1 unit tests
npm run test:phase1:integration     # Phase 1 integration tests
npm run migrate:phase1              # Migrate to enhanced storage
npm run verify:phase1               # Verify Phase 1 implementation
npm run benchmark:storage           # Performance benchmarking
```

### Code Quality
```bash
# Linting
npm run lint                       # Check for issues
npm run lint:fix                   # Auto-fix issues

# Formatting
npm run format                     # Format with Prettier

# Run all quality checks
npm run typecheck && npm run lint
```

### CLI Testing
```bash
# Test the CLI directly
./dist/bin/show-me-the-talk.js --help
npm run build && ./dist/bin/show-me-the-talk.js

# CLI requires TTY environment - cannot be tested via pipes
# Use actual terminal for interactive testing

# Test with different output formats
show-me-the-talk -f json -o test.json
show-me-the-talk -f markdown -o test.md
show-me-the-talk -f html -o test.html
```

### Enhanced Implementation Setup
```bash
# Start Phase 1 implementation (content-addressable storage)
bash scripts/start-implementation.sh
node scripts/create-core-files.js

# Emergency rollback if needed
bash scripts/emergency-rollback.sh
```

## Architecture Overview

This is a **Domain-Driven Design (DDD)** TypeScript project that exports Claude Code conversations. The architecture follows clean architecture principles with clear separation of concerns.

### Core Architecture Layers

**Domain Layer (`src/domain/`)**
- **Models**: Core entities like `Conversation`, `Message`, `ProjectContext` 
- **Enhanced Models**: Rich conversation elements with semantic meaning (`ConversationElement`, `AssistantResponse`, `UserQuestion`)
- **Services**: Business logic for conversation filtering, exchange extraction, table of contents generation
- **Repositories**: Interfaces for data access (implemented in infrastructure)

**Application Layer (`src/application/`)**  
- **Services**: `ConversationApplicationService` orchestrates business operations
- **DTOs**: Data transfer objects like `ExportRequest`/`ExportResult` for API boundaries

**Infrastructure Layer (`src/infrastructure/`)**
- **Persistence**: `JsonlConversationRepository` implements domain repository interfaces
- **FileSystem**: `FileExportService` handles file operations  
- **Container**: Dependency injection container managing service lifecycles
- **TUI**: Terminal UI service integration

**Presentation Layer (`src/presentation/`)**
- **CLI**: Command-line interface using process arguments
- **TUI**: Interactive terminal interface built with React + Ink

### Key Design Patterns

**Dependency Injection**: Central `Container` manages all service dependencies and lifecycles. Services are registered with the container and resolved by name.

**Repository Pattern**: Domain defines repository interfaces, infrastructure provides implementations. This allows swapping data sources without changing business logic.

**Visitor Pattern**: Rendering system uses visitors (`HtmlRenderVisitor`, `MarkdownRenderVisitor`) to traverse conversation elements and generate different output formats.

**Enhanced Domain Models**: Beyond basic CRUD, the system models rich conversation semantics:
- `ConversationElement` hierarchy represents different types of interactions
- `TimeMachine` provides temporal conversation navigation
- `ConversationExchangeExtractor` identifies meaningful dialogue patterns

### Critical Components

**ComprehensiveInkTUI**: The main terminal interface component (`src/presentation/tui/ComprehensiveInkTUI.ts`). Uses React hooks for state management and Ink for terminal rendering. Contains complex keyboard navigation, search, filtering, and export workflows.

**ConversationApplicationService**: Primary application facade (`src/application/services/ConversationApplicationService.ts`). Coordinates between domain services, repositories, and presentation layer. Handles conversation loading, filtering, export operations.

**Container**: Dependency injection container (`src/infrastructure/container/Container.ts`) that manages service lifecycles and dependencies. Services are registered by name and resolved via `get<T>(serviceName: string)` method.

**VisualTimelineRenderer**: Specialized component for rendering conversation timelines in the terminal. Manages scrolling, highlighting, and responsive layout.

**Enhanced Conversation Models**: The `enhanced/` directory contains sophisticated models that parse raw conversation data into semantic elements (code blocks, tool interactions, questions/responses).

**Render Visitors**: The `rendering/` directory implements visitor pattern for different export formats - `HtmlRenderVisitor`, `MarkdownRenderVisitor` traverse conversation elements to generate formatted output.

## TUI Development Notes

The terminal interface is built with React + Ink and requires TTY environment for proper operation. Key considerations:

- **TTY Detection**: CLI checks `process.stdin.isTTY` and fails gracefully in non-TTY environments
- **Title Truncation**: Long titles are truncated to prevent layout breaking (`truncateTitle` method)
- **Keyboard Navigation**: Complex state management for navigation between screens and list items
- **Responsive Layout**: Terminal width detection and adaptive content rendering

## Testing Strategy

**Working Tests**: Core TUI and CLI integration tests are fully functional (48 tests passing).

**Unit Tests**: Focus on individual components, especially utility functions like `truncateTitle` and domain model behavior.

**Integration Tests**: Test CLI functionality using child processes and proper TTY simulation.

**TUI Testing**: Uses Vitest with custom matchers (`toEndWith`, `toStartWith`) and mocked dependencies for terminal components.

**Migrated Tests**: Additional tests from backup need API compatibility updates but provide good reference patterns.

Test files are organized by type (`tests/unit/`, `tests/integration/`) with dedicated setup in `tests/setup.ts`.

## Export System

The export system supports multiple formats through a visitor pattern:
- **JSON**: Machine-readable structured data
- **Markdown**: Human-readable documentation  
- **Simple**: Clean, minimal format
- **HTML**: Enhanced web format with TimeMachine interactive features

Export configuration is managed through `ExportConfiguration` builder pattern, allowing flexible output customization.

## CLI Entry Points

Two main entry points:
- **Library API**: `ShowMeTheTalk` class (`src/ShowMeTheTalk.ts`) provides programmatic access
- **CLI Tool**: `src/presentation/cli/cli.ts` handles command-line arguments and launches TUI or direct export

The CLI auto-detects whether to launch interactive TUI (default) or perform direct export based on arguments provided. Available as both `show-me-the-talk` and `smtt` commands.

## Enhanced Features Implementation

The project includes implementation scripts for enhanced features:

### Phase 1: Content-Addressable Storage
- **ContentAddressableStore**: SHA-256 based deduplication system achieving 50-75% storage reduction
- **ConversationTimeline**: Rich timeline data structures for session analysis
- **TimelineAnalyzer**: Automatic conversation complexity and efficiency analysis
- **EnhancedJsonlConversationRepository**: Backward-compatible enhanced repository with content addressing

### Implementation Status
- Scripts available in `scripts/` directory for Phase 1 implementation
- Complete test suites in `tests/unit/` and `tests/integration/`
- Migration and rollback procedures included
- Performance benchmarking tools provided

### Container Integration
When implementing enhanced features, update `Container.ts` to register new services:
```typescript
// Register content store
container.register('ContentStore', () => new ContentAddressableStore({...}));

// Use enhanced repository
container.register('ConversationRepository', () => new EnhancedJsonlConversationRepository(...));
```