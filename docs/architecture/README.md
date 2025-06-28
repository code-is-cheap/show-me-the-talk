# Architecture Overview

> Domain-Driven Design architecture for conversation parsing and export

## 🏗️ System Architecture

Show Me The Talk follows **Domain-Driven Design (DDD)** principles with a clean, layered architecture that separates concerns and ensures maintainability.

```
┌─────────────────────────────────────────────────┐
│                Presentation Layer               │
│            (CLI, Future Web UI)                 │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Application Layer                  │
│         (Orchestration, DTOs, Use Cases)       │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│               Domain Layer                      │
│        (Business Logic, Entities, Rules)       │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│            Infrastructure Layer                 │
│     (Data Access, File System, External APIs)  │
└─────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
src/
├── domain/                 # 🎯 Core Business Logic
│   ├── models/            #    Business Entities
│   │   ├── Conversation.ts
│   │   ├── Message.ts
│   │   └── ProjectContext.ts
│   ├── repositories/      #    Data Access Contracts
│   │   └── ConversationRepository.ts
│   └── services/          #    Domain Services
│       └── ConversationService.ts
│
├── application/           # 🎭 Application Orchestration
│   ├── dto/              #    Data Transfer Objects
│   │   └── ExportDto.ts
│   └── services/         #    Application Services
│       └── ConversationApplicationService.ts
│
├── infrastructure/       # 🔧 Technical Implementation
│   ├── container/       #    Dependency Injection
│   │   └── Container.ts
│   ├── filesystem/      #    File Operations
│   │   └── FileExportService.ts
│   └── persistence/     #    Data Access Implementation
│       └── JsonlConversationRepository.ts
│
├── presentation/         # 🖥️ User Interfaces
│   └── cli/
│       └── cli.ts
│
├── index.ts             # 📦 Public API
└── ShowMeTheTalk.ts     # 🎪 Main Facade
```

## 🎯 Domain Layer

The heart of the application containing pure business logic.

### Core Entities

#### Conversation
**Role**: Aggregate root representing a complete Claude Code session
**Responsibilities**:
- Manage collection of messages
- Calculate conversation metrics (duration, message count)
- Enforce business rules (message ordering, validation)
- Extract meaningful exchanges (Q&A pairs)

```typescript
class Conversation {
  // Aggregates messages and enforces conversation invariants
  addMessage(message: Message): void
  getMeaningfulExchanges(): ConversationExchange[]
  calculateDuration(): number
}
```

#### Message
**Role**: Value objects representing individual conversation turns
**Responsibilities**:
- Encapsulate message content and metadata
- Handle different message types (user, assistant)
- Process tool interactions and summarize them

```typescript
abstract class Message {
  // Polymorphic message handling
  abstract getContent(): string
  abstract getType(): MessageType
}

class UserMessage extends Message { /* User inputs */ }
class AssistantMessage extends Message { /* AI responses */ }
```

#### ProjectContext
**Role**: Value object for project identification
**Responsibilities**:
- Encode/decode project paths
- Provide project identity and comparison

### Domain Services

#### ConversationService
**Role**: Domain service for conversation operations
**Responsibilities**:
- Filter meaningful conversations
- Categorize conversations by type
- Calculate aggregate metrics
- Extract question-answer pairs

```typescript
class ConversationService {
  static filterMeaningfulConversations(conversations: Conversation[]): Conversation[]
  static categorizeConversations(conversations: Conversation[]): ConversationCategories
  static calculateConversationMetrics(conversations: Conversation[]): ConversationMetrics
}
```

### Repository Pattern

```typescript
interface ConversationRepository {
  findAll(): Promise<Conversation[]>
  findBySessionId(sessionId: string): Promise<Conversation | null>
  findByProjectContext(projectContext: ProjectContext): Promise<Conversation[]>
}
```

## 🎭 Application Layer

Orchestrates domain operations and provides use cases.

### Application Services

#### ConversationApplicationService
**Role**: Application service coordinating domain operations
**Responsibilities**:
- Orchestrate conversation retrieval and export
- Map domain objects to DTOs
- Handle export requests and coordinate with infrastructure

```typescript
class ConversationApplicationService {
  async getAllConversations(): Promise<ConversationDto[]>
  async exportConversations(request: ExportRequest): Promise<ExportResult>
  async getConversationMetrics(): Promise<ConversationMetrics>
}
```

### Data Transfer Objects (DTOs)

DTOs provide a stable API boundary and decouple internal domain models from external representation.

```typescript
interface ConversationDto {
  sessionId: string
  projectPath: string
  startTime: string
  messageCount: number
  messages: MessageDto[]
}

interface ExportRequest {
  format: ExportFormat
  outputPath: string
  sessionId?: string
  includeMetadata: boolean
}
```

## 🔧 Infrastructure Layer

Handles all external concerns and technical implementation details.

### Data Access

#### JsonlConversationRepository
**Role**: Concrete implementation of conversation repository
**Responsibilities**:
- Parse JSONL files from Claude Code
- Convert raw data to domain objects
- Handle file system operations and error recovery

```typescript
class JsonlConversationRepository implements ConversationRepository {
  private parseJsonlFile(filePath: string): any[]
  private parseMessage(rawMessage: any): Message | null
  private parseConversationFile(projectDir: string, jsonlFile: string): Conversation | null
}
```

### Export Services

#### FileExportService
**Role**: Handle file export operations
**Responsibilities**:
- Export data in multiple formats (JSON, Markdown)
- Generate formatted output
- Handle file system operations

```typescript
class FileExportService implements ExportService {
  async export(data: ExportSummaryDto, format: ExportFormat, outputPath: string): Promise<void>
  private exportToJson(data: ExportSummaryDto, outputPath: string): Promise<void>
  private exportToMarkdown(data: ExportSummaryDto, outputPath: string): Promise<void>
}
```

### Dependency Injection

#### Container
**Role**: IoC container managing dependencies
**Responsibilities**:
- Wire up dependencies
- Manage object lifecycle
- Provide configured instances

```typescript
class Container {
  static createConfiguredContainer(claudeDir: string): Container
  get<T>(token: string): T
  register<T>(token: string, factory: () => T): void
}
```

## 🖥️ Presentation Layer

User-facing interfaces and API boundaries.

### CLI Interface

```typescript
// Command-line interface providing user-friendly access
class CLI {
  parseArgs(): CliArgs
  showHelp(): void
  async main(): Promise<void>
}
```

### Public API Facade

```typescript
// Simplified facade hiding internal complexity
class ShowMeTheTalk {
  async getAllConversations(): Promise<ConversationDto[]>
  async export(options: ExportOptions): Promise<ExportResult>
  async getMetrics(): Promise<ConversationMetrics>
}
```

## 🎨 Design Patterns Used

### 1. Repository Pattern
Abstracts data access behind interfaces, allowing different storage implementations.

### 2. Facade Pattern
`ShowMeTheTalk` class provides a simplified interface to complex subsystems.

### 3. Strategy Pattern
Export formats implemented as different strategies.

### 4. Factory Pattern
Container creates and configures object instances.

### 5. Template Method Pattern
Message parsing follows template method for different message types.

## 🔄 Data Flow

### 1. Conversation Discovery
```
CLI Request → Application Service → Repository → File System
                                ← Domain Objects ←
```

### 2. Conversation Processing
```
Raw JSONL → Repository → Domain Objects → Domain Service → Processed Data
```

### 3. Export Process
```
Export Request → Application Service → Domain Service → Export Service → File System
```

### 4. Complete Flow Example
```
1. CLI parses arguments
2. ShowMeTheTalk facade receives request
3. Application service coordinates operation
4. Repository loads data from ~/.claude
5. Domain objects enforce business rules
6. Domain services process conversations
7. Export service generates output
8. Result returned to user
```

## ⚡ Key Design Decisions

### 1. Domain-Driven Design
**Why**: Complex business logic around conversation parsing and categorization
**Benefit**: Clear separation of concerns, maintainable code

### 2. Immutable Value Objects
**Why**: Messages and project contexts are immutable
**Benefit**: Thread safety, predictable behavior

### 3. Interface Segregation
**Why**: Repository and export service interfaces
**Benefit**: Testability, pluggable implementations

### 4. Dependency Injection
**Why**: Loose coupling between layers
**Benefit**: Testability, configuration flexibility

### 5. Error Boundary Pattern
**Why**: Graceful handling of corrupted conversation files
**Benefit**: Robust parsing, user-friendly error messages

## 🧪 Testing Strategy

### Unit Tests
- **Domain Layer**: Pure business logic testing
- **Application Layer**: Service coordination testing
- **Infrastructure Layer**: Data access and export testing

### Integration Tests
- End-to-end workflow testing
- File system integration
- CLI interface testing

### Test Organization
```
tests/
├── unit/
│   ├── domain/
│   │   ├── models/
│   │   └── services/
│   └── application/
└── integration/
    └── complete-workflow/
```

## 🔮 Extension Points

### Adding New Export Formats
1. Implement `ExportService` interface
2. Add format to `ExportFormat` enum
3. Register in DI container

### Adding New Message Types
1. Extend `Message` base class
2. Update repository parsing logic
3. Add appropriate domain logic

### Adding New Analysis Features
1. Extend `ConversationService` with new methods
2. Add corresponding DTOs
3. Expose through application service

### Adding New Data Sources
1. Implement `ConversationRepository` interface
2. Add configuration options
3. Register in DI container

---

*Built with Domain-Driven Design for maximum maintainability and extensibility! 🏗️*