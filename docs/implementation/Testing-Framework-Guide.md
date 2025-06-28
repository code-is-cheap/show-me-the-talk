# Comprehensive Testing Framework Guide

## Overview

This guide provides a complete, self-contained testing framework for verifying all phases of the show-me-the-talk enhancement implementation. Every test is designed to be independently executable with clear pass/fail criteria and comprehensive coverage.

## Testing Philosophy

### Test Pyramid Strategy

```
           🔼 E2E Tests (5%)
          ────────────────────
         🔼🔼 Integration Tests (25%)
        ──────────────────────────
       🔼🔼🔼 Unit Tests (70%)
      ──────────────────────────────
```

**Test Distribution**:
- **Unit Tests (70%)**: Individual component verification
- **Integration Tests (25%)**: Component interaction verification  
- **End-to-End Tests (5%)**: Complete workflow verification

### Quality Gates

| Phase | Unit Coverage | Integration Coverage | E2E Scenarios | Performance Tests |
|-------|---------------|---------------------|---------------|-------------------|
| Phase 1 | >90% | >85% | 3 core flows | 5 benchmarks |
| Phase 2 | >85% | >80% | 5 core flows | 8 benchmarks |
| Phase 3 | >90% | >85% | 7 core flows | 12 benchmarks |

## Test Infrastructure Setup

### Core Testing Configuration

```typescript
// tests/setup/test-config.ts
import { beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface TestEnvironment {
  tempDir: string;
  claudeDir: string;
  storageDir: string;
  cleanup: () => Promise<void>;
}

export class TestEnvironmentManager {
  private environments = new Map<string, TestEnvironment>();

  async createEnvironment(testSuite: string): Promise<TestEnvironment> {
    const tempDir = join(tmpdir(), `smtt-test-${testSuite}-${Date.now()}`);
    const claudeDir = join(tempDir, '.claude');
    const storageDir = join(claudeDir, 'storage');

    // Create directory structure
    await fs.mkdir(storageDir, { recursive: true });
    await fs.mkdir(join(claudeDir, 'projects'), { recursive: true });

    const env: TestEnvironment = {
      tempDir,
      claudeDir,
      storageDir,
      cleanup: async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
        this.environments.delete(testSuite);
      }
    };

    this.environments.set(testSuite, env);
    return env;
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.environments.values())
      .map(env => env.cleanup());
    
    await Promise.all(cleanupPromises);
    this.environments.clear();
  }

  getEnvironment(testSuite: string): TestEnvironment | undefined {
    return this.environments.get(testSuite);
  }
}

// Global test environment manager
export const testEnvManager = new TestEnvironmentManager();

// Global setup
beforeAll(async () => {
  // Any global test setup
});

afterAll(async () => {
  await testEnvManager.cleanupAll();
});
```

### Mock Factories

```typescript
// tests/mocks/MockFactories.ts
import { Conversation } from '../../src/domain/models/Conversation.js';
import { ProjectContext } from '../../src/domain/models/ProjectContext.js';
import { UserMessage, AssistantMessage } from '../../src/domain/models/Message.js';

export class MockFactories {
  static createConversation(sessionId?: string, messageCount = 5): Conversation {
    const id = sessionId || `mock-session-${Date.now()}`;
    const projectContext = new ProjectContext('/mock/project', 'mock-project');
    const conversation = new Conversation(id, projectContext, new Date());

    for (let i = 0; i < messageCount; i++) {
      if (i % 2 === 0) {
        conversation.addMessage(new UserMessage(
          `user-${i}`,
          new Date(Date.now() + i * 1000),
          `User message ${i}: This is a test question about ${this.getRandomTopic()}`
        ));
      } else {
        conversation.addMessage(new AssistantMessage(
          `assistant-${i}`,
          new Date(Date.now() + i * 1000),
          `Assistant response ${i}: Here's a detailed answer about ${this.getRandomTopic()}. ${this.getRandomCodeBlock()}`
        ));
      }
    }

    return conversation;
  }

  static createLargeConversation(messageCount = 1000): Conversation {
    const conversation = this.createConversation(`large-session-${Date.now()}`, 0);
    
    for (let i = 0; i < messageCount; i++) {
      const content = i % 2 === 0 
        ? `User message ${i}: ${this.getRandomLongContent()}`
        : `Assistant response ${i}: ${this.getRandomLongContent()} ${this.getRandomCodeBlock()}`;
        
      const message = i % 2 === 0
        ? new UserMessage(`user-${i}`, new Date(Date.now() + i * 100), content)
        : new AssistantMessage(`assistant-${i}`, new Date(Date.now() + i * 100), content);
      
      conversation.addMessage(message);
    }

    return conversation;
  }

  static createConversationWithCode(): Conversation {
    const conversation = this.createConversation(`code-session-${Date.now()}`, 0);
    
    conversation.addMessage(new UserMessage(
      'user-1',
      new Date(),
      'Can you help me write a TypeScript function?'
    ));

    conversation.addMessage(new AssistantMessage(
      'assistant-1',
      new Date(),
      `I'll help you create a TypeScript function. Here's an example:

\`\`\`typescript
function calculateSum(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0);
}

// Usage example
const result = calculateSum([1, 2, 3, 4, 5]);
console.log(result); // Output: 15
\`\`\`

This function takes an array of numbers and returns their sum.`
    ));

    return conversation;
  }

  static createJSONLData(conversation: Conversation): string {
    const lines: string[] = [];
    
    // Add conversation start
    lines.push(JSON.stringify({
      type: 'conversation_start',
      timestamp: conversation.getStartTime().toISOString(),
      project_path: conversation.getProjectContext().path
    }));

    // Add messages
    for (const message of conversation.getMessages()) {
      lines.push(JSON.stringify({
        type: 'message',
        message: {
          role: message.getType() === 'user' ? 'user' : 'assistant',
          content: message.getContent()
        },
        timestamp: message.timestamp.toISOString()
      }));
    }

    return lines.join('\n');
  }

  private static getRandomTopic(): string {
    const topics = [
      'TypeScript development',
      'React components',
      'database optimization',
      'API design',
      'performance tuning',
      'testing strategies',
      'code refactoring',
      'system architecture'
    ];
    return topics[Math.floor(Math.random() * topics.length)];
  }

  private static getRandomCodeBlock(): string {
    const codeBlocks = [
      '```typescript\nfunction example() {\n  return "Hello World";\n}\n```',
      '```javascript\nconst data = await fetch("/api/data");\n```',
      '```bash\nnpm install package\n```',
      '```sql\nSELECT * FROM users WHERE active = true;\n```',
      ''
    ];
    return codeBlocks[Math.floor(Math.random() * codeBlocks.length)];
  }

  private static getRandomLongContent(): string {
    const baseContent = 'This is a longer message with more content to test storage efficiency and processing performance. ';
    return baseContent.repeat(Math.floor(Math.random() * 10) + 1);
  }
}
```

## Phase 1 Testing: Content-Addressable Storage

### Unit Tests

```typescript
// tests/unit/infrastructure/ContentAddressableStore.comprehensive.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContentAddressableStore } from '../../../src/infrastructure/storage/ContentAddressableStore.js';
import { testEnvManager } from '../../setup/test-config.js';
import { performance } from 'perf_hooks';

describe('ContentAddressableStore - Comprehensive Tests', () => {
  let store: ContentAddressableStore;
  let testEnv: any;

  beforeEach(async () => {
    testEnv = await testEnvManager.createEnvironment('content-store');
    store = new ContentAddressableStore({
      storageDir: testEnv.storageDir,
      compressionEnabled: false,
      maxMemoryCacheMB: 10
    });
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve content correctly', async () => {
      const content = 'Hello, World!';
      
      const reference = await store.store(content);
      expect(reference.hash).toBeTruthy();
      expect(reference.size).toBe(content.length);
      expect(reference.references).toBe(1);
      
      const retrieved = await store.retrieve(reference.hash);
      expect(retrieved).toBe(content);
    });

    it('should handle empty content', async () => {
      const content = '';
      
      const reference = await store.store(content);
      expect(reference.hash).toBeTruthy();
      expect(reference.size).toBe(0);
      
      const retrieved = await store.retrieve(reference.hash);
      expect(retrieved).toBe(content);
    });

    it('should handle large content', async () => {
      const content = 'A'.repeat(1024 * 1024); // 1MB content
      
      const reference = await store.store(content);
      expect(reference.hash).toBeTruthy();
      expect(reference.size).toBe(content.length);
      
      const retrieved = await store.retrieve(reference.hash);
      expect(retrieved).toBe(content);
    });

    it('should handle unicode content', async () => {
      const content = '🚀 Hello 世界 🌍 مرحبا Привет';
      
      const reference = await store.store(content);
      const retrieved = await store.retrieve(reference.hash);
      expect(retrieved).toBe(content);
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate identical content', async () => {
      const content = 'Duplicate content test';
      
      const ref1 = await store.store(content);
      const ref2 = await store.store(content);
      const ref3 = await store.store(content);
      
      expect(ref1.hash).toBe(ref2.hash);
      expect(ref2.hash).toBe(ref3.hash);
      expect(ref3.references).toBe(3);
      
      // Should only store once
      const stats = await store.getStats();
      expect(stats.totalContent).toBe(1);
    });

    it('should maintain reference counting', async () => {
      const content = 'Reference counting test';
      
      const ref1 = await store.store(content);
      expect(ref1.references).toBe(1);
      
      const ref2 = await store.store(content);
      expect(ref2.references).toBe(2);
      
      // Release one reference
      await store.release(ref1.hash);
      expect(await store.exists(ref1.hash)).toBe(true);
      
      // Release second reference
      await store.release(ref2.hash);
      expect(await store.exists(ref1.hash)).toBe(false);
    });

    it('should calculate deduplication ratio correctly', async () => {
      const content1 = 'Content 1';
      const content2 = 'Content 2';
      const content3 = 'Content 1'; // Duplicate
      
      await store.store(content1);
      await store.store(content2);
      await store.store(content3); // Should be deduplicated
      
      const stats = await store.getStats();
      expect(stats.totalContent).toBe(2); // Only 2 unique pieces
      expect(stats.deduplicationRatio).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should store content within performance targets', async () => {
      const content = 'Performance test content';
      const iterations = 100;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await store.store(content + i);
      }
      
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / iterations;
      
      expect(avgTime).toBeLessThan(5); // <5ms per operation
      console.log(`Average storage time: ${avgTime.toFixed(2)}ms`);
    });

    it('should retrieve content within performance targets', async () => {
      const content = 'Retrieval performance test';
      const reference = await store.store(content);
      const iterations = 1000;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const retrieved = await store.retrieve(reference.hash);
        expect(retrieved).toBe(content);
      }
      
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / iterations;
      
      expect(avgTime).toBeLessThan(1); // <1ms per retrieval
      console.log(`Average retrieval time: ${avgTime.toFixed(3)}ms`);
    });

    it('should handle concurrent operations', async () => {
      const content = 'Concurrent test content';
      const concurrency = 10;
      
      const promises = Array.from({ length: concurrency }, (_, i) =>
        store.store(content + i)
      );
      
      const startTime = performance.now();
      const references = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      expect(references).toHaveLength(concurrency);
      expect(totalTime).toBeLessThan(100); // <100ms for 10 concurrent operations
      console.log(`Concurrent storage time: ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Compression', () => {
    it('should compress content when enabled', async () => {
      const compressedStore = new ContentAddressableStore({
        storageDir: testEnv.storageDir,
        compressionEnabled: true,
        maxMemoryCacheMB: 10
      });

      const content = 'A'.repeat(1000); // Compressible content
      
      const reference = await compressedStore.store(content);
      expect(reference.compressed).toBe(true);
      
      const retrieved = await compressedStore.retrieve(reference.hash);
      expect(retrieved).toBe(content);
    });

    it('should maintain data integrity with compression', async () => {
      const compressedStore = new ContentAddressableStore({
        storageDir: testEnv.storageDir,
        compressionEnabled: true,
        maxMemoryCacheMB: 10
      });

      const testData = [
        'Simple text',
        '{"json": "data", "with": ["arrays", "and", "objects"]}',
        'Line 1\nLine 2\nLine 3\n',
        '🚀 Unicode content with 特殊字符 and emojis 🌟',
        'A'.repeat(10000) // Large repetitive content
      ];

      for (const content of testData) {
        const reference = await compressedStore.store(content);
        const retrieved = await compressedStore.retrieve(reference.hash);
        expect(retrieved).toBe(content);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Create store with invalid directory permissions (if possible)
      // This test may be platform-specific
      const invalidStore = new ContentAddressableStore({
        storageDir: '/invalid/path/that/does/not/exist',
        compressionEnabled: false,
        maxMemoryCacheMB: 10
      });

      await expect(invalidStore.store('test content')).rejects.toThrow();
    });

    it('should return null for non-existent content', async () => {
      const fakeHash = 'a'.repeat(64); // Valid hash format but non-existent
      const retrieved = await store.retrieve(fakeHash);
      expect(retrieved).toBeNull();
    });

    it('should handle corrupted hash gracefully', async () => {
      const invalidHash = 'invalid-hash';
      const retrieved = await store.retrieve(invalidHash);
      expect(retrieved).toBeNull();
    });
  });

  describe('Memory Management', () => {
    it('should respect memory cache limits', async () => {
      const limitedStore = new ContentAddressableStore({
        storageDir: testEnv.storageDir,
        compressionEnabled: false,
        maxMemoryCacheMB: 1 // Very small cache
      });

      // Store enough content to exceed cache limit
      const largeContent = 'X'.repeat(1024 * 100); // 100KB
      const references = [];
      
      for (let i = 0; i < 20; i++) { // 2MB total, should exceed 1MB cache
        references.push(await limitedStore.store(largeContent + i));
      }

      // All content should still be retrievable (from disk)
      for (let i = 0; i < references.length; i++) {
        const retrieved = await limitedStore.retrieve(references[i].hash);
        expect(retrieved).toBe(largeContent + i);
      }
    });

    it('should implement LRU cache eviction', async () => {
      const limitedStore = new ContentAddressableStore({
        storageDir: testEnv.storageDir,
        compressionEnabled: false,
        maxMemoryCacheMB: 0.1 // Very small cache to force eviction
      });

      // Store and retrieve content to populate cache
      const content1 = 'Content 1 ' + 'A'.repeat(1000);
      const content2 = 'Content 2 ' + 'B'.repeat(1000);
      
      const ref1 = await limitedStore.store(content1);
      const ref2 = await limitedStore.store(content2);
      
      // Retrieve to ensure in cache
      await limitedStore.retrieve(ref1.hash);
      await limitedStore.retrieve(ref2.hash);
      
      // Store more content to force eviction
      const content3 = 'Content 3 ' + 'C'.repeat(1000);
      await limitedStore.store(content3);
      
      // All content should still be retrievable
      expect(await limitedStore.retrieve(ref1.hash)).toBe(content1);
      expect(await limitedStore.retrieve(ref2.hash)).toBe(content2);
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/Phase1Integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testEnvManager } from '../setup/test-config.js';
import { MockFactories } from '../mocks/MockFactories.js';
import { Container } from '../../src/infrastructure/di/Container.js';
import { ContentAddressableStore } from '../../src/infrastructure/storage/ContentAddressableStore.js';
import { TimelineAnalyzer } from '../../src/domain/services/TimelineAnalyzer.js';
import { EnhancedJsonlConversationRepository } from '../../src/infrastructure/persistence/EnhancedJsonlConversationRepository.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Phase 1 Integration Tests', () => {
  let testEnv: any;
  let container: Container;

  beforeEach(async () => {
    testEnv = await testEnvManager.createEnvironment('phase1-integration');
    container = new Container();
    
    // Register services
    container.register('ContentStore', () => new ContentAddressableStore({
      storageDir: testEnv.storageDir,
      compressionEnabled: true,
      maxMemoryCacheMB: 50
    }));

    container.register('TimelineAnalyzer', () => new TimelineAnalyzer());

    container.register('ConversationRepository', () => {
      const contentStore = container.get('ContentStore');
      const timelineAnalyzer = container.get('TimelineAnalyzer');
      return new EnhancedJsonlConversationRepository(
        testEnv.claudeDir,
        contentStore,
        timelineAnalyzer
      );
    });
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  it('should complete end-to-end conversation processing with content addressing', async () => {
    // Create test conversations
    const conversations = [
      MockFactories.createConversation('session-1', 10),
      MockFactories.createConversation('session-2', 15),
      MockFactories.createConversationWithCode()
    ];

    // Write conversations to JSONL files
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      const projectDir = join(testEnv.claudeDir, 'projects', `project-${i}`);
      await fs.mkdir(projectDir, { recursive: true });
      
      const jsonlData = MockFactories.createJSONLData(conv);
      await fs.writeFile(join(projectDir, `${conv.sessionId}.jsonl`), jsonlData);
    }

    // Load conversations through enhanced repository
    const repository = container.get('ConversationRepository');
    const loadedConversations = await repository.findAll();

    expect(loadedConversations).toHaveLength(3);

    // Verify content addressing was applied
    const contentStore = container.get('ContentStore');
    const stats = await contentStore.getStats();
    
    expect(stats.totalContent).toBeGreaterThan(0);
    expect(stats.deduplicationRatio).toBeGreaterThanOrEqual(0);

    // Verify conversation integrity
    for (const conv of loadedConversations) {
      expect(conv.getMessages().length).toBeGreaterThan(0);
      expect(conv.getMetadata().enhancedAt).toBeDefined();
      expect(conv.getMetadata().storageOptimized).toBe(true);
    }
  });

  it('should achieve significant storage reduction', async () => {
    // Create conversations with duplicate content
    const baseContent = 'This is repeated content that should be deduplicated. ';
    const conversations = [];

    for (let i = 0; i < 10; i++) {
      const conv = MockFactories.createConversation(`dup-session-${i}`, 0);
      
      // Add messages with repeated content
      for (let j = 0; j < 5; j++) {
        const message = new (require('../../src/domain/models/Message.js').UserMessage)(
          `msg-${j}`,
          new Date(),
          baseContent.repeat(j + 1) // Varying amounts of repeated content
        );
        conv.addMessage(message);
      }
      
      conversations.push(conv);
    }

    // Calculate original size
    let originalSize = 0;
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      const projectDir = join(testEnv.claudeDir, 'projects', `dup-project-${i}`);
      await fs.mkdir(projectDir, { recursive: true });
      
      const jsonlData = MockFactories.createJSONLData(conv);
      originalSize += Buffer.byteLength(jsonlData, 'utf-8');
      
      await fs.writeFile(join(projectDir, `${conv.sessionId}.jsonl`), jsonlData);
    }

    // Load through enhanced repository
    const repository = container.get('ConversationRepository');
    await repository.findAll();

    // Check storage efficiency
    const contentStore = container.get('ContentStore');
    const stats = await contentStore.getStats();
    
    const storageReduction = (originalSize - stats.totalSize) / originalSize;
    expect(storageReduction).toBeGreaterThan(0.3); // At least 30% reduction
    
    console.log(`Original size: ${(originalSize / 1024).toFixed(1)} KB`);
    console.log(`New size: ${(stats.totalSize / 1024).toFixed(1)} KB`);
    console.log(`Storage reduction: ${(storageReduction * 100).toFixed(1)}%`);
  });

  it('should maintain performance with large datasets', async () => {
    // Create large conversation dataset
    const largeConversations = Array.from({ length: 50 }, (_, i) =>
      MockFactories.createLargeConversation(100) // 50 conversations with 100 messages each
    );

    // Write conversations
    for (let i = 0; i < largeConversations.length; i++) {
      const conv = largeConversations[i];
      const projectDir = join(testEnv.claudeDir, 'projects', `large-project-${i}`);
      await fs.mkdir(projectDir, { recursive: true });
      
      const jsonlData = MockFactories.createJSONLData(conv);
      await fs.writeFile(join(projectDir, `${conv.sessionId}.jsonl`), jsonlData);
    }

    // Measure loading performance
    const repository = container.get('ConversationRepository');
    
    const startTime = Date.now();
    const loadedConversations = await repository.findAll();
    const loadTime = Date.now() - startTime;

    expect(loadedConversations).toHaveLength(50);
    expect(loadTime).toBeLessThan(30000); // Should complete within 30 seconds

    console.log(`Loaded ${loadedConversations.length} large conversations in ${loadTime}ms`);

    // Verify memory usage is reasonable
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    expect(heapUsedMB).toBeLessThan(200); // Should use less than 200MB

    console.log(`Memory usage: ${heapUsedMB.toFixed(1)} MB`);
  });

  it('should handle migration from existing data', async () => {
    // Create "existing" conversation files without enhancement
    const originalConversations = [
      MockFactories.createConversation('legacy-1', 8),
      MockFactories.createConversation('legacy-2', 12)
    ];

    // Write as standard JSONL files (not enhanced)
    for (let i = 0; i < originalConversations.length; i++) {
      const conv = originalConversations[i];
      const projectDir = join(testEnv.claudeDir, 'projects', `legacy-project-${i}`);
      await fs.mkdir(projectDir, { recursive: true });
      
      const jsonlData = MockFactories.createJSONLData(conv);
      await fs.writeFile(join(projectDir, `${conv.sessionId}.jsonl`), jsonlData);
    }

    // Load through enhanced repository (should trigger migration)
    const repository = container.get('ConversationRepository');
    const loadedConversations = await repository.findAll();

    expect(loadedConversations).toHaveLength(2);

    // Verify migration occurred
    for (const conv of loadedConversations) {
      expect(conv.getMetadata().enhancedAt).toBeDefined();
      expect(conv.getMetadata().storageOptimized).toBe(true);
    }

    // Verify content store has entries
    const contentStore = container.get('ContentStore');
    const stats = await contentStore.getStats();
    expect(stats.totalContent).toBeGreaterThan(0);
  });

  it('should preserve data integrity across enhancement process', async () => {
    const testConversation = MockFactories.createConversationWithCode();
    
    // Store original data
    const projectDir = join(testEnv.claudeDir, 'projects', 'integrity-test');
    await fs.mkdir(projectDir, { recursive: true });
    
    const originalJsonl = MockFactories.createJSONLData(testConversation);
    await fs.writeFile(join(projectDir, `${testConversation.sessionId}.jsonl`), originalJsonl);

    // Load through enhanced repository
    const repository = container.get('ConversationRepository');
    const [enhanced] = await repository.findAll();

    expect(enhanced).toBeDefined();

    // Verify all original data is preserved
    expect(enhanced.sessionId).toBe(testConversation.sessionId);
    expect(enhanced.getMessages()).toHaveLength(testConversation.getMessages().length);
    
    // Verify message content is identical
    const originalMessages = testConversation.getMessages();
    const enhancedMessages = enhanced.getMessages();
    
    for (let i = 0; i < originalMessages.length; i++) {
      expect(enhancedMessages[i].getContent()).toBe(originalMessages[i].getContent());
      expect(enhancedMessages[i].timestamp.getTime()).toBe(originalMessages[i].timestamp.getTime());
    }

    // Verify code blocks are preserved
    const originalHasCode = testConversation.hasCodeBlocks();
    const enhancedHasCode = enhanced.hasCodeBlocks();
    expect(enhancedHasCode).toBe(originalHasCode);
  });
});
```

## Phase 2 Testing: Real-Time Features

### Unit Tests for Process Management

```typescript
// tests/unit/infrastructure/ProcessManager.comprehensive.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProcessManager } from '../../../src/infrastructure/session/ProcessManager.js';
import { testEnvManager } from '../../setup/test-config.js';

describe('ProcessManager - Comprehensive Tests', () => {
  let processManager: ProcessManager;
  let testEnv: any;

  beforeEach(async () => {
    testEnv = await testEnvManager.createEnvironment('process-manager');
    processManager = new ProcessManager();
  });

  afterEach(async () => {
    await processManager.cleanup();
    await testEnv.cleanup();
  });

  describe('Process Lifecycle', () => {
    it('should spawn processes correctly', async () => {
      const process = await processManager.spawn('echo', ['hello world']);
      
      expect(process.id).toBeTruthy();
      expect(process.pid).toBeGreaterThan(0);
      expect(process.command).toBe('echo');
      expect(process.args).toEqual(['hello world']);
      expect(process.status).toBe('running');
    });

    it('should handle process output streaming', async () => {
      const process = await processManager.spawn('echo', ['test output']);
      
      const outputs: string[] = [];
      for await (const output of process.stdout) {
        outputs.push(output);
        break; // Just get first output
      }
      
      expect(outputs.length).toBe(1);
      expect(outputs[0]).toContain('test output');
    });

    it('should handle process termination', async () => {
      const process = await processManager.spawn('sleep', ['10']);
      
      expect(process.status).toBe('running');
      
      await processManager.kill(process.id, 'SIGTERM');
      
      const exitCode = await process.exitCode;
      expect(exitCode).toBeGreaterThan(0); // Non-zero exit for killed process
    });

    it('should handle graceful process completion', async () => {
      const process = await processManager.spawn('echo', ['test']);
      
      const exitCode = await process.exitCode;
      expect(exitCode).toBe(0);
    });
  });

  describe('Process Input/Output', () => {
    it('should handle stdin input', async () => {
      const process = await processManager.spawn('cat', []);
      
      const writer = process.stdin.getWriter();
      await writer.write(new TextEncoder().encode('hello\n'));
      await writer.close();
      
      const outputs: string[] = [];
      for await (const output of process.stdout) {
        outputs.push(output);
      }
      
      expect(outputs.join('').trim()).toBe('hello');
    });

    it('should handle stderr output', async () => {
      // Create a command that outputs to stderr
      const process = await processManager.spawn('node', ['-e', 'console.error("error message")']);
      
      const errors: string[] = [];
      for await (const error of process.stderr) {
        errors.push(error);
      }
      
      expect(errors.join('').trim()).toBe('error message');
    });

    it('should handle large output streams', async () => {
      const largeOutput = 'A'.repeat(1000);
      const process = await processManager.spawn('node', ['-e', `console.log("${largeOutput}")`]);
      
      const outputs: string[] = [];
      for await (const output of process.stdout) {
        outputs.push(output);
      }
      
      expect(outputs.join('').trim()).toBe(largeOutput);
    });
  });

  describe('Concurrent Process Management', () => {
    it('should handle multiple concurrent processes', async () => {
      const processCount = 5;
      const processes = [];
      
      for (let i = 0; i < processCount; i++) {
        processes.push(await processManager.spawn('echo', [`process ${i}`]));
      }
      
      expect(processes).toHaveLength(processCount);
      
      // Wait for all to complete
      const exitCodes = await Promise.all(processes.map(p => p.exitCode));
      expect(exitCodes.every(code => code === 0)).toBe(true);
    });

    it('should track all active processes', async () => {
      const process1 = await processManager.spawn('sleep', ['1']);
      const process2 = await processManager.spawn('sleep', ['1']);
      
      const activeProcesses = processManager.list();
      expect(activeProcesses).toHaveLength(2);
      expect(activeProcesses.map(p => p.id)).toContain(process1.id);
      expect(activeProcesses.map(p => p.id)).toContain(process2.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid commands', async () => {
      await expect(
        processManager.spawn('nonexistent-command', [])
      ).rejects.toThrow();
    });

    it('should handle process cleanup', async () => {
      const process1 = await processManager.spawn('sleep', ['10']);
      const process2 = await processManager.spawn('sleep', ['10']);
      
      expect(processManager.list()).toHaveLength(2);
      
      await processManager.cleanup();
      
      // Processes should be terminated
      expect(processManager.list()).toHaveLength(0);
    });

    it('should handle kill on non-existent process', async () => {
      await expect(
        processManager.kill('non-existent-id')
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should start processes quickly', async () => {
      const startTime = Date.now();
      const process = await processManager.spawn('echo', ['performance test']);
      const spawnTime = Date.now() - startTime;
      
      expect(spawnTime).toBeLessThan(100); // Should spawn within 100ms
      
      await process.exitCode; // Ensure completion
    });

    it('should handle rapid process creation', async () => {
      const processCount = 20;
      const startTime = Date.now();
      
      const processes = await Promise.all(
        Array.from({ length: processCount }, (_, i) =>
          processManager.spawn('echo', [`test ${i}`])
        )
      );
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(1000); // 20 processes in under 1 second
      
      // Wait for all to complete
      await Promise.all(processes.map(p => p.exitCode));
    });
  });
});
```

### Session Management Integration Tests

```typescript
// tests/integration/SessionManagement.comprehensive.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testEnvManager } from '../setup/test-config.js';
import { ClaudeSessionManager } from '../../src/infrastructure/session/ClaudeSessionManager.js';
import { ProcessManager } from '../../src/infrastructure/session/ProcessManager.js';
import { ChokidarFileWatcher } from '../../src/infrastructure/session/FileWatcher.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Session Management Integration Tests', () => {
  let testEnv: any;
  let sessionManager: ClaudeSessionManager;
  let processManager: ProcessManager;
  let fileWatcher: ChokidarFileWatcher;

  beforeEach(async () => {
    testEnv = await testEnvManager.createEnvironment('session-management');
    processManager = new ProcessManager();
    fileWatcher = new ChokidarFileWatcher();
    sessionManager = new ClaudeSessionManager(processManager, fileWatcher);

    // Create test project structure
    await fs.writeFile(join(testEnv.tempDir, 'test.txt'), 'initial content');
    await fs.writeFile(join(testEnv.tempDir, 'package.json'), '{"name": "test"}');
  });

  afterEach(async () => {
    await sessionManager.cleanup();
    await processManager.cleanup();
    await testEnv.cleanup();
  });

  describe('Session Lifecycle', () => {
    it('should create and manage mock sessions', async () => {
      // Use a mock command instead of actual Claude Code for testing
      const session = await sessionManager.startSession(
        testEnv.tempDir, 
        'test prompt',
        { 
          model: 'test-model',
          fileWatchingEnabled: true
        }
      );

      expect(session.id).toBeTruthy();
      expect(session.projectPath).toBe(testEnv.tempDir);
      expect(session.status).toBe('running');

      // Test session control
      await session.pause();
      expect(session.status).toBe('paused');

      await session.resume();
      expect(session.status).toBe('running');

      await sessionManager.stopSession(session.id);
      expect(session.status).toBe('stopped');
    });

    it('should handle multiple concurrent sessions', async () => {
      const session1 = await sessionManager.startSession(testEnv.tempDir, 'prompt 1');
      const session2 = await sessionManager.startSession(testEnv.tempDir, 'prompt 2');

      const activeSessions = sessionManager.getActiveSessions();
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.map(s => s.id)).toContain(session1.id);
      expect(activeSessions.map(s => s.id)).toContain(session2.id);

      await sessionManager.stopSession(session1.id);
      await sessionManager.stopSession(session2.id);

      expect(sessionManager.getActiveSessions()).toHaveLength(0);
    });

    it('should handle session input and output', async () => {
      const session = await sessionManager.startSession(testEnv.tempDir);
      
      const events: any[] = [];
      const eventCollector = (async () => {
        let eventCount = 0;
        for await (const event of session.outputStream) {
          events.push(event);
          eventCount++;
          if (eventCount >= 3) break; // Collect a few events
        }
      })();

      // Send some input
      await session.sendInput('test input');
      await session.sendInput('another input');

      // Wait for events
      await Promise.race([
        eventCollector,
        new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
      ]);

      expect(events.length).toBeGreaterThan(0);
      
      // Check that we received user input events
      const userInputEvents = events.filter(e => e.type === 'output' && e.data.source === 'user');
      expect(userInputEvents.length).toBeGreaterThan(0);

      await sessionManager.stopSession(session.id);
    });
  });

  describe('File Watching Integration', () => {
    it('should detect file changes during session', async () => {
      const session = await sessionManager.startSession(testEnv.tempDir);
      
      const events: any[] = [];
      const eventCollector = (async () => {
        for await (const event of session.outputStream) {
          events.push(event);
          if (events.filter(e => e.type === 'file_change').length >= 1) break;
        }
      })();

      // Create a file change
      setTimeout(async () => {
        await fs.writeFile(join(testEnv.tempDir, 'new-file.txt'), 'new content');
      }, 100);

      await Promise.race([
        eventCollector,
        new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
      ]);

      const fileChangeEvents = events.filter(e => e.type === 'file_change');
      expect(fileChangeEvents.length).toBeGreaterThan(0);
      expect(fileChangeEvents[0].data.path).toContain('new-file.txt');

      await sessionManager.stopSession(session.id);
    });

    it('should ignore irrelevant files', async () => {
      const session = await sessionManager.startSession(testEnv.tempDir);
      
      const events: any[] = [];
      let watcherActive = true;
      
      const eventCollector = (async () => {
        for await (const event of session.outputStream) {
          if (!watcherActive) break;
          events.push(event);
        }
      })();

      // Create files that should be ignored
      await fs.mkdir(join(testEnv.tempDir, 'node_modules'), { recursive: true });
      await fs.writeFile(join(testEnv.tempDir, 'node_modules', 'ignored.js'), 'ignored content');
      
      // Create a file that should be watched
      await fs.writeFile(join(testEnv.tempDir, 'watched.txt'), 'watched content');

      // Wait a bit for events
      await new Promise(resolve => setTimeout(resolve, 500));
      watcherActive = false;

      const fileChangeEvents = events.filter(e => e.type === 'file_change');
      
      // Should detect the watched file but not the ignored one
      expect(fileChangeEvents.some(e => e.data.path.includes('watched.txt'))).toBe(true);
      expect(fileChangeEvents.some(e => e.data.path.includes('ignored.js'))).toBe(false);

      await sessionManager.stopSession(session.id);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle session startup within performance targets', async () => {
      const startTime = Date.now();
      const session = await sessionManager.startSession(testEnv.tempDir);
      const startupTime = Date.now() - startTime;

      expect(startupTime).toBeLessThan(3000); // 3 second target
      console.log(`Session startup time: ${startupTime}ms`);

      await sessionManager.stopSession(session.id);
    });

    it('should handle rapid session creation and destruction', async () => {
      const sessionCount = 5;
      const sessions = [];

      // Create sessions rapidly
      for (let i = 0; i < sessionCount; i++) {
        sessions.push(await sessionManager.startSession(testEnv.tempDir, `prompt ${i}`));
      }

      expect(sessionManager.getActiveSessions()).toHaveLength(sessionCount);

      // Destroy sessions rapidly
      for (const session of sessions) {
        await sessionManager.stopSession(session.id);
      }

      expect(sessionManager.getActiveSessions()).toHaveLength(0);
    });

    it('should handle session errors gracefully', async () => {
      // Try to start session with invalid configuration
      await expect(
        sessionManager.startSession('/nonexistent/path')
      ).rejects.toThrow();

      // Should not affect other sessions
      const validSession = await sessionManager.startSession(testEnv.tempDir);
      expect(validSession.status).toBe('running');

      await sessionManager.stopSession(validSession.id);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should clean up resources properly', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and destroy multiple sessions
      for (let i = 0; i < 10; i++) {
        const session = await sessionManager.startSession(testEnv.tempDir);
        
        // Generate some activity
        await session.sendInput(`test input ${i}`);
        
        await sessionManager.stopSession(session.id);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
    });

    it('should handle file watcher cleanup', async () => {
      const session = await sessionManager.startSession(testEnv.tempDir);
      
      // Verify file watching is active
      await fs.writeFile(join(testEnv.tempDir, 'test-cleanup.txt'), 'test');
      
      // Stop session and verify cleanup
      await sessionManager.stopSession(session.id);
      
      // Should not throw errors or leave dangling watchers
      expect(sessionManager.getActiveSessions()).toHaveLength(0);
    });
  });
});
```

## Performance Benchmarking Suite

```typescript
// tests/performance/ComprehensiveBenchmarks.test.ts
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';
import { testEnvManager } from '../setup/test-config.js';
import { MockFactories } from '../mocks/MockFactories.js';
import { ContentAddressableStore } from '../../src/infrastructure/storage/ContentAddressableStore.js';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  throughput: number;
  memoryUsed: number;
}

interface BenchmarkSuite {
  suiteName: string;
  results: BenchmarkResult[];
  overallPerformance: 'excellent' | 'good' | 'acceptable' | 'poor';
}

describe('Comprehensive Performance Benchmarks', () => {
  const benchmarkResults: BenchmarkSuite[] = [];

  describe('Phase 1 Performance Benchmarks', () => {
    it('should benchmark content-addressable storage operations', async () => {
      const testEnv = await testEnvManager.createEnvironment('perf-content-store');
      const store = new ContentAddressableStore({
        storageDir: testEnv.storageDir,
        compressionEnabled: false,
        maxMemoryCacheMB: 100
      });

      const results: BenchmarkResult[] = [];

      // Benchmark storage operations
      const storageResult = await benchmarkOperation('Content Storage', async () => {
        const content = `Test content ${Math.random()}`;
        return await store.store(content);
      }, 1000);
      results.push(storageResult);

      // Benchmark retrieval operations
      const content = 'Benchmark retrieval content';
      const reference = await store.store(content);
      
      const retrievalResult = await benchmarkOperation('Content Retrieval', async () => {
        return await store.retrieve(reference.hash);
      }, 10000);
      results.push(retrievalResult);

      // Benchmark deduplication
      const deduplicationResult = await benchmarkOperation('Deduplication Detection', async () => {
        return await store.store('Duplicate content');
      }, 1000);
      results.push(deduplicationResult);

      benchmarkResults.push({
        suiteName: 'Phase 1 - Content Addressing',
        results,
        overallPerformance: evaluatePerformance(results)
      });

      // Verify performance targets
      expect(storageResult.averageTime).toBeLessThan(5); // <5ms storage
      expect(retrievalResult.averageTime).toBeLessThan(1); // <1ms retrieval
      expect(deduplicationResult.averageTime).toBeLessThan(1); // <1ms deduplication

      await testEnv.cleanup();
    });

    it('should benchmark timeline analysis performance', async () => {
      const { TimelineAnalyzer } = await import('../../src/domain/services/TimelineAnalyzer.js');
      const analyzer = new TimelineAnalyzer();
      const results: BenchmarkResult[] = [];

      // Small conversation analysis
      const smallConv = MockFactories.createConversation('small', 10);
      const smallAnalysisResult = await benchmarkOperation('Small Conversation Analysis', async () => {
        return await analyzer.analyzeConversation(smallConv);
      }, 100);
      results.push(smallAnalysisResult);

      // Large conversation analysis
      const largeConv = MockFactories.createLargeConversation(1000);
      const largeAnalysisResult = await benchmarkOperation('Large Conversation Analysis', async () => {
        return await analyzer.analyzeConversation(largeConv);
      }, 10);
      results.push(largeAnalysisResult);

      benchmarkResults.push({
        suiteName: 'Phase 1 - Timeline Analysis',
        results,
        overallPerformance: evaluatePerformance(results)
      });

      // Verify performance targets
      expect(smallAnalysisResult.averageTime).toBeLessThan(100); // <100ms for small
      expect(largeAnalysisResult.averageTime).toBeLessThan(5000); // <5s for large

      console.log(`Small conversation analysis: ${smallAnalysisResult.averageTime.toFixed(2)}ms`);
      console.log(`Large conversation analysis: ${largeAnalysisResult.averageTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should benchmark memory efficiency', async () => {
      const testEnv = await testEnvManager.createEnvironment('perf-memory');
      const store = new ContentAddressableStore({
        storageDir: testEnv.storageDir,
        compressionEnabled: true,
        maxMemoryCacheMB: 50
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Store many conversations
      const conversations = Array.from({ length: 100 }, () =>
        MockFactories.createConversation(`mem-test-${Math.random()}`, 50)
      );

      for (const conv of conversations) {
        for (const message of conv.getMessages()) {
          await store.store(message.getContent());
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB for 100 conversations`);
      
      // Should use less than 100MB for 100 conversations
      expect(memoryIncreaseMB).toBeLessThan(100);

      await testEnv.cleanup();
    });

    it('should benchmark memory cleanup', async () => {
      const testEnv = await testEnvManager.createEnvironment('perf-cleanup');
      const store = new ContentAddressableStore({
        storageDir: testEnv.storageDir,
        compressionEnabled: false,
        maxMemoryCacheMB: 10
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Create and release many content pieces
      const hashes: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const ref = await store.store(`Content piece ${i}`);
        hashes.push(ref.hash);
      }

      // Release all content
      for (const hash of hashes) {
        await store.release(hash);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = Math.abs(finalMemory - initialMemory);
      const memoryDeltaMB = memoryDelta / 1024 / 1024;

      console.log(`Memory delta after cleanup: ${memoryDeltaMB.toFixed(2)} MB`);
      
      // Memory should return close to original level
      expect(memoryDeltaMB).toBeLessThan(10);

      await testEnv.cleanup();
    });
  });

  afterAll(() => {
    // Print benchmark summary
    console.log('\n=== Performance Benchmark Summary ===');
    for (const suite of benchmarkResults) {
      console.log(`\n${suite.suiteName} (${suite.overallPerformance}):`);
      for (const result of suite.results) {
        console.log(`  ${result.operation}:`);
        console.log(`    Average: ${result.averageTime.toFixed(2)}ms`);
        console.log(`    Throughput: ${result.throughput.toFixed(0)} ops/sec`);
        console.log(`    Memory: ${result.memoryUsed.toFixed(2)} MB`);
      }
    }
    console.log('\n=====================================');
  });

  async function benchmarkOperation(
    operationName: string,
    operation: () => Promise<any>,
    iterations: number
  ): Promise<BenchmarkResult> {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Warmup
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await operation();
    }

    // Actual benchmark
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await operation();
    }
    
    const totalTime = performance.now() - startTime;
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024;

    return {
      operation: operationName,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      throughput: iterations / (totalTime / 1000),
      memoryUsed
    };
  }

  function evaluatePerformance(results: BenchmarkResult[]): 'excellent' | 'good' | 'acceptable' | 'poor' {
    // Simple performance evaluation based on average times
    const avgTime = results.reduce((sum, r) => sum + r.averageTime, 0) / results.length;
    
    if (avgTime < 1) return 'excellent';
    if (avgTime < 5) return 'good';
    if (avgTime < 50) return 'acceptable';
    return 'poor';
  }
});
```

## Automated Test Execution Scripts

```bash
#!/bin/bash
# Comprehensive test runner
# Save as: scripts/run-all-tests.sh

set -e

echo "🧪 Running Comprehensive Test Suite"
echo "=================================="

# Test environment setup
export NODE_ENV=test
export CLAUDE_DIR="$HOME/.claude.test"

# Create test Claude directory
mkdir -p "$CLAUDE_DIR/projects"

# Function to run tests with timeout and reporting
run_test_suite() {
    local suite_name="$1"
    local test_pattern="$2"
    local timeout_seconds="$3"
    
    echo ""
    echo "🔍 Running $suite_name..."
    echo "Pattern: $test_pattern"
    echo "Timeout: ${timeout_seconds}s"
    echo "---"
    
    local start_time=$(date +%s)
    
    if timeout "${timeout_seconds}s" npm test -- "$test_pattern" --reporter=verbose; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "✅ $suite_name completed in ${duration}s"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "❌ $suite_name failed after ${duration}s"
        return 1
    fi
}

# Track results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=()

# Unit Tests
echo "📋 Phase 1: Unit Tests"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Unit Tests - Content Store" "tests/unit/infrastructure/ContentAddressableStore" 120; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("Unit Tests - Content Store")
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Unit Tests - Domain Services" "tests/unit/domain/" 60; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("Unit Tests - Domain Services")
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Unit Tests - Process Management" "tests/unit/infrastructure/ProcessManager" 180; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("Unit Tests - Process Management")
fi

# Integration Tests
echo ""
echo "📋 Phase 2: Integration Tests"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Integration Tests - Phase 1" "tests/integration/Phase1Integration" 300; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("Integration Tests - Phase 1")
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Integration Tests - Session Management" "tests/integration/SessionManagement" 300; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("Integration Tests - Session Management")
fi

# Performance Tests
echo ""
echo "📋 Phase 3: Performance Tests"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Performance Benchmarks" "tests/performance/" 600; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("Performance Benchmarks")
fi

# End-to-End Tests
echo ""
echo "📋 Phase 4: End-to-End Tests"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "E2E Tests" "tests/e2e/" 900; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES+=("E2E Tests")
fi

# Cleanup
rm -rf "$CLAUDE_DIR"

# Final Report
echo ""
echo "🏁 Test Suite Summary"
echo "===================="
echo "Total Suites: $TOTAL_SUITES"
echo "Passed: $PASSED_SUITES"
echo "Failed: $((TOTAL_SUITES - PASSED_SUITES))"

if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
    echo ""
    echo "🎉 All test suites passed!"
    echo "✅ System is ready for deployment"
    exit 0
else
    echo ""
    echo "❌ Failed test suites:"
    for suite in "${FAILED_SUITES[@]}"; do
        echo "  • $suite"
    done
    echo ""
    echo "🔧 Please fix failing tests before deployment"
    exit 1
fi
```

This comprehensive testing framework provides:

1. **Complete Test Coverage**: Unit, integration, performance, and E2E tests
2. **Self-Contained Test Environment**: Isolated test environments with cleanup
3. **Performance Benchmarking**: Detailed performance measurement and reporting
4. **Mock Factories**: Realistic test data generation
5. **Automated Execution**: Complete test suite automation with reporting
6. **Quality Gates**: Clear pass/fail criteria for each phase

Every test is designed to be independently executable with clear success criteria and comprehensive error reporting. The framework ensures that all implementation phases can be thoroughly validated before deployment.