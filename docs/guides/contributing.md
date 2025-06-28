# Contributing to Show Me The Talk

> Help us improve the Claude Code conversation parser and exporter

## 🤝 Welcome Contributors!

We welcome contributions from developers who want to improve how we share and analyze AI collaboration experiences. Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated!

## 🎯 Ways to Contribute

### 🐛 Bug Reports
- Report issues with conversation parsing
- Identify export format problems  
- Document unexpected behavior

### ✨ Feature Requests
- New export formats
- Additional analysis features
- CLI improvements
- API enhancements

### 📝 Documentation
- Improve existing docs
- Add usage examples
- Create tutorials
- Fix typos and clarify explanations

### 🧪 Testing
- Add test cases
- Improve test coverage
- Test with different Claude Code versions
- Performance testing

### 🔧 Code Contributions
- Bug fixes
- Feature implementations
- Performance improvements
- Refactoring

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ 
- npm 8+
- Git
- TypeScript knowledge
- Familiarity with Domain-Driven Design (helpful)

### Getting Started

```bash
# Fork and clone the repository
git clone https://github.com/your-username/show-me-the-talk.git
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

### Development Workflow

```bash
# Start development mode (watches for changes)
npm run dev

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration

# Check code quality
make check
```

## 🏗️ Architecture Guidelines

### Domain-Driven Design

This project follows DDD principles:

- **Domain Layer**: Pure business logic, no external dependencies
- **Application Layer**: Orchestrates domain operations
- **Infrastructure Layer**: Technical implementations
- **Presentation Layer**: User interfaces (CLI, API)

### Code Organization

```
src/
├── domain/           # 🎯 Core business logic
├── application/      # 🎭 Use cases and orchestration  
├── infrastructure/   # 🔧 Technical implementations
└── presentation/     # 🖥️ User interfaces
```

### Key Principles

1. **Dependency Inversion**: Dependencies point inward toward domain
2. **Single Responsibility**: Each class has one reason to change
3. **Interface Segregation**: Small, focused interfaces
4. **Open/Closed**: Open for extension, closed for modification

## 🧪 Testing Guidelines

### Test Structure

```
tests/
├── unit/             # Fast, isolated tests
│   ├── domain/       # Business logic tests
│   ├── application/  # Service tests
│   └── infrastructure/ # Technical tests
└── integration/      # End-to-end tests
```

### Writing Tests

#### Unit Tests
```typescript
// tests/unit/domain/models/Message.test.ts
import { describe, it, expect } from 'vitest';
import { UserMessage } from '@/domain/models/Message';

describe('UserMessage', () => {
  it('should create user message with string content', () => {
    const message = new UserMessage('id', new Date(), null, 'Hello');
    
    expect(message.getType()).toBe(MessageType.USER);
    expect(message.getContent()).toBe('Hello');
  });
});
```

#### Integration Tests
```typescript
// tests/integration/export.test.ts
import { ShowMeTheTalk } from '@/ShowMeTheTalk';

describe('Export Integration', () => {
  it('should export conversations to file', async () => {
    const smtt = new ShowMeTheTalk('./test-data');
    
    const result = await smtt.export({
      format: 'json',
      outputPath: './test-output.json'
    });
    
    expect(result.success).toBe(true);
    expect(existsSync('./test-output.json')).toBe(true);
  });
});
```

### Test Requirements

- **Coverage**: Maintain 80%+ test coverage
- **Fast**: Unit tests should run in <100ms each
- **Isolated**: Tests should not depend on external systems
- **Descriptive**: Clear test names and assertions

## 📝 Code Style

### TypeScript Guidelines

```typescript
// ✅ Good: Explicit types
interface ConversationMetrics {
  totalConversations: number;
  averageMessages: number;
}

// ✅ Good: Descriptive naming
class ConversationExportService {
  async exportToMarkdown(conversations: Conversation[]): Promise<string> {
    // Implementation
  }
}

// ❌ Avoid: any types
function process(data: any): any {
  // Avoid this
}

// ❌ Avoid: Unclear naming
class Handler {
  process(stuff: unknown): void {
    // Unclear purpose
  }
}
```

### Formatting

We use Prettier for consistent formatting:

```bash
# Format code
npm run format

# Check formatting
npm run lint
```

### ESLint Rules

Key rules we follow:
- No unused variables
- Prefer const over let
- Explicit return types for public methods
- No console.log in production code (use proper logging)

## 🚀 Contribution Process

### 1. Create an Issue

Before starting work, create an issue to discuss:
- Bug reports with reproduction steps
- Feature requests with use cases
- Questions about implementation approach

### 2. Fork and Branch

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/show-me-the-talk.git

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Changes

- Follow the architecture guidelines
- Write tests for new functionality
- Update documentation as needed
- Follow code style guidelines

### 4. Test Your Changes

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Test CLI functionality
npm run build
node dist/presentation/cli/cli.js --help
```

### 5. Commit Changes

Use conventional commit messages:

```bash
# Feature
git commit -m "feat: add JSON export format validation"

# Bug fix  
git commit -m "fix: handle invalid timestamps in conversation parsing"

# Documentation
git commit -m "docs: add API usage examples"

# Tests
git commit -m "test: add integration tests for export functionality"

# Refactor
git commit -m "refactor: extract conversation filtering logic"
```

### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Fill out the PR template with:
# - Description of changes
# - Testing done
# - Breaking changes (if any)
```

## 📋 Pull Request Guidelines

### PR Requirements

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (for significant changes)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Breaking Changes
[Describe any breaking changes]

## Additional Notes
[Any additional information]
```

## 🎯 Specific Contribution Areas

### Adding New Export Formats

1. **Create format interface**:
```typescript
// src/application/dto/ExportDto.ts
export enum ExportFormat {
  JSON = 'json',
  MARKDOWN = 'markdown', 
  SIMPLE = 'simple',
  XML = 'xml' // New format
}
```

2. **Implement export logic**:
```typescript
// src/infrastructure/filesystem/FileExportService.ts
private async exportToXml(data: ExportSummaryDto, outputPath: string): Promise<void> {
  // Implementation
}
```

3. **Add tests**:
```typescript
// tests/unit/infrastructure/FileExportService.test.ts
it('should export to XML format', async () => {
  // Test implementation
});
```

4. **Update CLI**:
```typescript
// src/presentation/cli/cli.ts
// Add XML to format validation
```

### Adding New Analysis Features

1. **Extend domain service**:
```typescript
// src/domain/services/ConversationService.ts
static extractTopics(conversations: Conversation[]): TopicAnalysis {
  // Implementation
}
```

2. **Add application service method**:
```typescript
// src/application/services/ConversationApplicationService.ts
async getTopicAnalysis(): Promise<TopicAnalysisDto> {
  // Implementation
}
```

3. **Expose through facade**:
```typescript
// src/ShowMeTheTalk.ts
async getTopics(): Promise<TopicAnalysisDto> {
  return await this.conversationService.getTopicAnalysis();
}
```

### Improving Documentation

1. **API docs**: Update JSDoc comments
2. **User guides**: Add practical examples  
3. **Architecture docs**: Explain design decisions
4. **Examples**: Real-world usage patterns

## 🔍 Code Review Process

### What We Look For

- **Correctness**: Does the code work as intended?
- **Architecture**: Does it follow DDD principles?
- **Tests**: Are there adequate tests?
- **Documentation**: Is it well documented?
- **Performance**: Any performance implications?

### Review Checklist

- [ ] Code follows architectural patterns
- [ ] Tests cover new functionality
- [ ] No performance regressions
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Error handling appropriate

## 🎉 Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- GitHub contributors graph
- Special mentions for significant contributions

## ❓ Getting Help

- **Questions**: Open a GitHub issue with "question" label
- **Discussions**: Use GitHub Discussions for broader topics
- **Real-time help**: Check if maintainers are available for quick questions

## 📜 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow GitHub's community guidelines

---

*Thank you for contributing to Show Me The Talk! Together we can make AI collaboration insights more accessible and valuable for everyone. 🤝*