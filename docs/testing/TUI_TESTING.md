# TUI Testing Guide

This document provides comprehensive guidance for testing the Terminal User Interface (TUI) components of the show-me-the-talk application.

## Overview

The TUI is built using React with Ink, which renders React components to the terminal. Testing requires special considerations for TTY behavior, terminal output, and user interactions.

## UX Acceptance

Use the checklist below as the experience "definition of done":
- [UX Acceptance Checklist](./UX_ACCEPTANCE_CHECKLIST.md)

## Testing Architecture

### 1. Testing Levels

#### Unit Tests
- Test individual TUI components in isolation
- Mock terminal environment and dependencies
- Verify component behavior and state management
- Test utility functions like `truncateTitle` and `wrapText`

#### Integration Tests
- Test complete user workflows through the CLI
- Verify TTY vs non-TTY behavior
- Test keyboard navigation and input handling
- Validate output formatting and display

#### End-to-End Tests
- Test full application lifecycle
- Verify data import/export functionality
- Test error handling and edge cases

### 2. Key Testing Challenges

#### TTY Environment
- Applications behave differently in TTY vs non-TTY contexts
- Use `process.stdout.isTTY` detection in production code
- Mock TTY behavior in tests using child processes

#### Terminal Output
- Capture and validate console output
- Handle ANSI escape codes and colors
- Test terminal resizing and responsive behavior

#### User Input
- Simulate keyboard events and navigation
- Test focus management between components
- Validate input handling and validation

## Testing Tools and Libraries

### Required Dependencies

```bash
npm install --save-dev jest @types/jest mock-stdin strip-ansi
```

### Core Testing Stack
- **Jest**: Primary testing framework
- **mock-stdin**: Simulate user input to stdin
- **strip-ansi**: Remove ANSI codes for output comparison
- **child_process**: Spawn CLI processes for integration testing

## Testing Strategies

### 1. Component Unit Testing

Test individual TUI components by mocking their dependencies:

```typescript
import { ComprehensiveInkTUI } from '../src/presentation/tui/ComprehensiveInkTUI';

describe('ComprehensiveInkTUI', () => {
  it('should truncate long titles correctly', () => {
    const tui = new ComprehensiveInkTUI(mockConfig);
    const result = tui['truncateTitle']('Very long title that exceeds limit', 10);
    expect(result).toBe('Very lo...');
  });
});
```

### 2. CLI Integration Testing

Test the CLI application as a whole using child processes:

```typescript
import { spawn, execSync } from 'child_process';

describe('CLI Integration', () => {
  it('should display conversations in TTY mode', (done) => {
    const child = spawn('node', ['dist/bin/show-me-the-talk.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: 'true' }
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', () => {
      expect(output).toContain('conversations');
      done();
    });
    
    // Simulate user input
    child.stdin.write('q\n'); // Quit
  });
});
```

### 3. TTY Behavior Testing

Test different behaviors based on TTY context:

```typescript
describe('TTY Detection', () => {
  it('should behave differently in TTY vs non-TTY', () => {
    // Test with TTY
    const ttyOutput = execSync('node dist/bin/show-me-the-talk.js --help', {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    // Test without TTY (piped)
    const nonTtyOutput = execSync('echo "" | node dist/bin/show-me-the-talk.js --help', {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    expect(ttyOutput.toString()).toContain('🚀');
    expect(nonTtyOutput.toString()).not.toContain('🚀');
  });
});
```

## Test Organization

### Directory Structure

```
tests/
├── unit/
│   ├── tui/
│   │   ├── ComprehensiveInkTUI.test.ts
│   │   ├── VisualTimelineRenderer.test.ts
│   │   └── components/
│   └── utils/
├── integration/
│   ├── cli.test.ts
│   ├── navigation.test.ts
│   └── export.test.ts
└── fixtures/
    ├── sample-conversations.json
    └── test-data/
```

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

## Best Practices

### 1. Path Management
- **Always use relative paths** in tests - never hardcode absolute paths like `/Volumes/...` or `/Users/...`
- Use `process.cwd()` and `path.resolve()` for cross-platform compatibility
- Test paths should be relative to the project root: `./test/data` not `/absolute/path`
- Example: `resolve(process.cwd(), 'dist/bin/show-me-the-talk.js')` instead of hardcoded paths

### 2. Mock External Dependencies
- Mock file system operations
- Mock console methods when testing output
- Use dependency injection for testability

### 3. Test Edge Cases
- Empty conversation lists
- Very long titles and content
- Terminal resizing scenarios
- Keyboard interrupt handling

### 4. Validate User Experience
- Test navigation flows
- Verify responsive layout
- Ensure proper error messages
- Test accessibility features

### 5. Performance Testing
- Measure rendering performance with large datasets
- Test memory usage with extensive conversation histories
- Validate responsiveness under load

## Specific Test Cases

### Title Truncation
```typescript
describe('Title Truncation', () => {
  it('should truncate titles longer than 60 characters', () => {
    const longTitle = 'A'.repeat(70);
    const truncated = tui['truncateTitle'](longTitle, 60);
    expect(truncated).toHaveLength(60);
    expect(truncated).toEndWith('...');
  });
  
  it('should not truncate short titles', () => {
    const shortTitle = 'Short title';
    const result = tui['truncateTitle'](shortTitle, 60);
    expect(result).toBe(shortTitle);
  });
});
```

### Navigation Testing
```typescript
describe('Navigation', () => {
  it('should navigate between conversations with arrow keys', async () => {
    const mockStdin = require('mock-stdin').stdin();
    
    // Simulate down arrow key
    mockStdin.send('\u001b[B');
    
    // Verify state change
    expect(tui.getCurrentSelection()).toBe(1);
    
    mockStdin.restore();
  });
});
```

### Output Validation
```typescript
describe('Output Formatting', () => {
  it('should format conversation list correctly', () => {
    const conversations = [
      { title: 'Test 1', messageCount: 5 },
      { title: 'Test 2', messageCount: 10 }
    ];
    
    const output = renderConversationList(conversations);
    
    expect(stripAnsi(output)).toContain('Test 1');
    expect(stripAnsi(output)).toContain('5 msgs');
  });
});
```

## Running Tests

### Development Testing
```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run specific test file
npm test tests/unit/tui/ComprehensiveInkTUI.test.ts

# Run with coverage
npm run test:coverage
```

### CI/CD Testing
```bash
# Run tests in CI environment
npm run test:ci

# Generate coverage reports
npm run test:coverage:ci
```

## Debugging Tests

### Common Issues
1. **TTY Detection**: Ensure proper stdio configuration in child processes
2. **Async Operations**: Use proper async/await patterns for terminal output
3. **ANSI Codes**: Strip ANSI codes when comparing text output
4. **Timing Issues**: Add appropriate delays for terminal rendering

### Debug Tools
- Use `--verbose` flag for detailed test output
- Enable debug logging with `DEBUG=show-me-the-talk:*`
- Use `--detectOpenHandles` to find resource leaks

## Continuous Integration

Configure tests to run in CI environments with proper TTY simulation:

```yaml
# .github/workflows/test.yml
- name: Run TUI Tests
  run: |
    npm test
  env:
    FORCE_COLOR: true
    CI: true
```

## Future Enhancements

- Add visual regression testing for terminal output
- Implement property-based testing for edge cases
- Add performance benchmarking
- Create interactive test runner for manual testing
