# Show Me The Talk - System Architecture

## Overview

Show Me The Talk is a sophisticated TypeScript library and CLI tool for parsing, analyzing, and exporting Claude Code conversations. Built with Domain-Driven Design (DDD) principles and clean architecture patterns.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  CLI Interface          │  TUI Components (Ink.js)          │
│  - Enhanced UX          │  - Project Selection               │
│  - Error Handling       │  - Conversation Filtering          │
│  - Progress Feedback    │  - Export Dialog                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
├─────────────────────────────────────────────────────────────┤
│  ConversationApplicationService                             │
│  - Export orchestration                                     │
│  - DTO mapping                                             │
│  - Use case coordination                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Core Models                │  Enhanced Models               │
│  - Conversation             │  - UserQuestion                │
│  - Message                  │  - AssistantResponse           │
│  - ProjectContext           │  - CodeBlock                   │
│                            │  - ToolInteractionGroup        │
│                            │                                │
│  Domain Services            │  Rendering System              │
│  - ConversationService      │  - Visitor Pattern             │
│  - ConversationFilter       │  - MarkdownRenderVisitor       │
│                            │  - HtmlRenderVisitor            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Persistence               │  Export Services                │
│  - JsonlConversationRepo   │  - FileExportService            │
│  - JSONL parsing           │  - Multi-format support        │
│                            │  - HTML/Markdown/JSON/Simple    │
│                            │                                │
│  Dependency Injection      │  Configuration                  │
│  - Container.ts            │  - ExportConfiguration          │
│  - Service registry        │  - Builder pattern              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Core Design Principles

### 1. Domain-Driven Design (DDD)
- **Domain Models**: Pure business logic with no external dependencies
- **Repository Pattern**: Abstract data access behind interfaces
- **Domain Services**: Complex business rules and calculations
- **Value Objects**: Immutable data structures (ProjectContext, SemanticContext)

### 2. Clean Architecture
- **Dependency Rule**: Dependencies point inward toward domain
- **Layer Isolation**: Each layer has specific responsibilities
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: High-level modules don't depend on low-level details

### 3. SOLID Principles
- **Single Responsibility**: Each class has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable for base types
- **Interface Segregation**: Clients shouldn't depend on unused interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

## 🔄 Data Flow

### 1. Conversation Parsing Flow
```
JSONL Files → JsonlConversationRepository → Domain Models → Application Services → Export
```

1. **JSONL Reading**: Parse Claude Code's native format
2. **Model Creation**: Convert to rich domain objects
3. **Enhanced Processing**: Apply semantic analysis and categorization
4. **Export Pipeline**: Transform to desired output format

### 2. Export Pipeline
```
Domain Models → ConversationElementFactory → Visitors → File Writers
```

1. **DTO Conversion**: Map domain models to DTOs
2. **Element Creation**: Create enhanced conversation elements
3. **Visitor Pattern**: Apply format-specific rendering
4. **File Output**: Write formatted content to files

## 🧱 Key Components

### Domain Layer

#### Core Models
- **Conversation**: Main aggregate root containing messages and metadata
- **Message**: Base class for UserMessage and AssistantMessage
- **ProjectContext**: Value object representing project information
- **ToolInteraction**: Represents tool usage in conversations

#### Enhanced Models (Semantic Analysis)
- **ConversationElement**: Abstract base for all conversation elements
- **UserQuestion**: Categorized user questions with complexity analysis
- **AssistantResponse**: Analyzed responses with quality metrics
- **CodeBlock**: Code snippets with purpose classification
- **ToolInteractionGroup**: Grouped tool operations with impact assessment

#### Domain Services
- **ConversationService**: Core business logic for metrics and categorization
- **ConversationFilter**: Advanced filtering and search capabilities

### Infrastructure Layer

#### Persistence
- **JsonlConversationRepository**: Handles Claude Code's JSONL format
- **Error Recovery**: Graceful handling of malformed data
- **Performance**: Efficient parsing of large conversation files

#### Export Services
- **FileExportService**: Multi-format export implementation
- **Format Support**: JSON, Markdown, HTML, Simplified
- **Security**: XSS prevention and HTML escaping
- **Styling**: Beautiful, responsive HTML output

### Application Layer

#### Services
- **ConversationApplicationService**: Coordinates use cases
- **Export Orchestration**: Manages complex export workflows
- **DTO Management**: Handles data transfer objects

## 🎨 Enhanced Conversation Model

### Semantic Content Classification

```typescript
enum ContentImportance {
  PRIMARY = 'primary',     // Key information
  SECONDARY = 'secondary', // Supporting details  
  TERTIARY = 'tertiary'   // Background context
}

enum VisualStyle {
  PROMINENT = 'prominent', // Stand out visually
  STANDARD = 'standard',   // Normal appearance
  SUBTLE = 'subtle'       // Understated presentation
}
```

### Question Classification
- **Learning**: Understanding concepts and exploring ideas
- **Implementation**: Building features and solving problems
- **Debugging**: Troubleshooting and fixing issues
- **Review**: Code review and optimization
- **General**: Miscellaneous conversations

### Response Analysis
- **Type Detection**: Code-focused, explanation, mixed content
- **Quality Scoring**: Based on length, detail, and usefulness
- **Tool Usage**: Analysis of development tool interactions

### Code Block Classification
- **Purpose**: Implementation, testing, configuration, documentation
- **Complexity**: Simple snippets to complex applications
- **Language Detection**: Automatic programming language identification

## 🔧 Configuration System

### Export Configuration
```typescript
interface ExportConfiguration {
  includeTimestamps: boolean;
  includeMetadata: boolean;
  includeComplexityInfo: boolean;
  showToolDetails: boolean;
  groupByCategory: boolean;
  markdown: MarkdownExportOptions;
  html: HtmlExportOptions;
  performance: PerformanceOptions;
}
```

### Builder Pattern
```typescript
const config = ExportConfigurationBuilder
  .create()
  .withTimestamps(true)
  .withMetadata(true)
  .withHtmlStyling('modern')
  .withPerformanceOptimization(true)
  .build();
```

## 📊 Performance Characteristics

### Scalability
- **Large Conversations**: Handles 1000+ messages efficiently
- **Memory Management**: Streaming and lazy loading
- **Export Performance**: <10 seconds for typical datasets
- **Concurrent Processing**: Parallel conversation parsing

### Optimization Strategies
- **Lazy Loading**: Load conversations on demand
- **Streaming**: Process large files without full memory load
- **Caching**: Intelligent caching of parsed data
- **Batch Processing**: Efficient bulk operations

## 🛡️ Security Features

### Input Validation
- **JSONL Parsing**: Safe JSON parsing with error recovery
- **Path Validation**: Secure file path handling
- **Type Safety**: Comprehensive TypeScript typing

### Output Security
- **HTML Escaping**: Prevent XSS attacks in HTML exports
- **Path Sanitization**: Safe output file handling
- **Content Filtering**: Remove sensitive information

## 🧪 Testing Strategy

### Test Coverage
- **Unit Tests**: 300+ tests for domain logic
- **Integration Tests**: End-to-end workflow testing
- **Edge Cases**: Malformed data and error conditions
- **Performance Tests**: Large dataset handling

### Testing Principles
- **Fast Feedback**: Quick test execution
- **Reliability**: Deterministic and stable tests
- **Maintainability**: Easy to understand and modify
- **Coverage**: 95%+ test coverage for critical paths

## 🚀 Future Enhancements

### Planned Features
1. **Interactive Web UI**: Browser-based conversation explorer
2. **Advanced Analytics**: Conversation pattern analysis
3. **Export Templates**: Customizable output formats
4. **Real-time Processing**: Live conversation monitoring
5. **API Integration**: REST API for external tools

### Technical Improvements
1. **ESM Migration**: Full ES modules support
2. **TUI Enhancement**: Advanced terminal interface
3. **Performance Optimization**: Further speed improvements
4. **Plugin System**: Extensible export formats
5. **Cloud Integration**: Cloud storage support

## 📝 Usage Examples

### Basic Export
```bash
show-me-the-talk --format html --output conversations.html --metadata
```

### Project-Specific Export
```bash
show-me-the-talk --project my-app --format markdown --output project-summary.md
```

### Programmatic Usage
```typescript
const showMeTheTalk = new ShowMeTheTalk('/path/to/.claude');
const result = await showMeTheTalk.export({
  format: 'html',
  outputPath: './output.html',
  includeMetadata: true
});
```

This architecture provides a robust, scalable, and maintainable foundation for conversation analysis and export, with clean separation of concerns and excellent extensibility for future enhancements.