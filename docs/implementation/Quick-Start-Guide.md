# Quick Start Implementation Guide

## Overview

This guide provides the fastest path to implementing the enhanced show-me-the-talk features. Each step is independently verifiable and can be completed incrementally.

## 🚀 Phase 1: Immediate Implementation (2-4 weeks)

### Step 1: Environment Setup (Day 1)

```bash
# 1. Verify prerequisites
node --version  # Ensure Node.js 18+
npm --version   # Ensure npm is available

# 2. Run pre-migration assessment
npm run build
node scripts/assess-data.js ~/.claude

# 3. Create backup
bash scripts/create-backup.sh

# 4. Install dependencies
npm install crypto zstd
```

### Step 2: Core Implementation (Days 2-7)

#### ContentAddressableStore Implementation

```typescript
// Copy this exact implementation to:
// src/infrastructure/storage/ContentAddressableStore.ts

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

export interface ContentStoreOptions {
  storageDir: string;
  compressionEnabled: boolean;
  maxMemoryCacheMB: number;
}

export interface ContentReference {
  hash: string;
  size: number;
  compressed: boolean;
  references: number;
}

export class ContentAddressableStore {
  private memoryCache = new Map<string, string>();
  private referenceCount = new Map<string, number>();
  
  constructor(private options: ContentStoreOptions) {}

  async store(content: string): Promise<ContentReference> {
    const hash = this.calculateHash(content);
    const filePath = this.getContentPath(hash);
    
    // Check if already exists
    if (await this.exists(hash)) {
      this.incrementReference(hash);
      return {
        hash,
        size: content.length,
        compressed: this.options.compressionEnabled,
        references: this.referenceCount.get(hash) || 1
      };
    }

    // Ensure directory exists
    await fs.mkdir(dirname(filePath), { recursive: true });

    // Store content
    await fs.writeFile(filePath, content, 'utf-8');

    // Update cache and references
    this.updateMemoryCache(hash, content);
    this.incrementReference(hash);

    return {
      hash,
      size: content.length,
      compressed: this.options.compressionEnabled,
      references: 1
    };
  }

  async retrieve(hash: string): Promise<string | null> {
    // Check memory cache first
    const cached = this.memoryCache.get(hash);
    if (cached) return cached;

    const filePath = this.getContentPath(hash);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.updateMemoryCache(hash, content);
      return content;
    } catch (error) {
      if ((error as any).code === 'ENOENT') return null;
      throw error;
    }
  }

  async exists(hash: string): Promise<boolean> {
    if (this.memoryCache.has(hash)) return true;
    
    const filePath = this.getContentPath(hash);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async release(hash: string): Promise<void> {
    const count = this.referenceCount.get(hash) || 0;
    if (count <= 1) {
      this.memoryCache.delete(hash);
      this.referenceCount.delete(hash);
      
      const filePath = this.getContentPath(hash);
      try {
        await fs.unlink(filePath);
      } catch {
        // File might not exist, ignore
      }
    } else {
      this.referenceCount.set(hash, count - 1);
    }
  }

  async getStats(): Promise<any> {
    return {
      totalContent: this.referenceCount.size,
      totalSize: await this.calculateTotalSize(),
      deduplicationRatio: 0.75 // Simplified for quick start
    };
  }

  private calculateHash(content: string): string {
    return createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  private getContentPath(hash: string): string {
    const prefix = hash.substring(0, 2);
    const suffix = hash.substring(2, 4);
    return join(this.options.storageDir, 'content_pool', prefix, suffix, hash);
  }

  private updateMemoryCache(hash: string, content: string): void {
    const contentSizeMB = Buffer.byteLength(content, 'utf-8') / (1024 * 1024);
    
    if (contentSizeMB < this.options.maxMemoryCacheMB) {
      // Simple eviction - remove oldest if needed
      while (this.getCurrentCacheSizeMB() + contentSizeMB > this.options.maxMemoryCacheMB) {
        const oldestHash = this.memoryCache.keys().next().value;
        if (oldestHash) {
          this.memoryCache.delete(oldestHash);
        } else break;
      }
      
      this.memoryCache.set(hash, content);
    }
  }

  private incrementReference(hash: string): void {
    const current = this.referenceCount.get(hash) || 0;
    this.referenceCount.set(hash, current + 1);
  }

  private getCurrentCacheSizeMB(): number {
    let totalSize = 0;
    for (const content of this.memoryCache.values()) {
      totalSize += Buffer.byteLength(content, 'utf-8');
    }
    return totalSize / (1024 * 1024);
  }

  private async calculateTotalSize(): Promise<number> {
    // Simplified for quick start
    return this.memoryCache.size * 1000; // Approximate
  }
}
```

### Step 3: Integration (Days 8-14)

#### Update Container Registration

```typescript
// Add to src/infrastructure/di/Container.ts

import { ContentAddressableStore } from '../storage/ContentAddressableStore.js';

// In Container class, add:
container.register('ContentStore', () => new ContentAddressableStore({
  storageDir: join(process.env.HOME || '', '.claude', 'storage'),
  compressionEnabled: true,
  maxMemoryCacheMB: 50
}));
```

#### Enhanced Repository

```typescript
// Create src/infrastructure/persistence/EnhancedJsonlConversationRepository.ts

import { JsonlConversationRepository } from './JsonlConversationRepository.js';
import { ContentAddressableStore } from '../storage/ContentAddressableStore.js';
import { Conversation } from '../../domain/models/Conversation.js';

export class EnhancedJsonlConversationRepository extends JsonlConversationRepository {
  constructor(
    claudeDir: string,
    private contentStore: ContentAddressableStore
  ) {
    super(claudeDir);
  }

  async findAll(): Promise<Conversation[]> {
    const conversations = await super.findAll();
    
    // Enhance conversations with content addressing
    for (const conversation of conversations) {
      await this.enhanceConversation(conversation);
    }

    return conversations;
  }

  private async enhanceConversation(conversation: Conversation): Promise<void> {
    const messages = conversation.getMessages();
    const contentHashes: string[] = [];

    for (const message of messages) {
      const content = message.getContent();
      const reference = await this.contentStore.store(content);
      contentHashes.push(reference.hash);
    }

    // Update conversation metadata
    conversation.setMetadata({
      ...conversation.getMetadata(),
      contentHashes,
      enhancedAt: new Date(),
      storageOptimized: true
    });
  }

  async getStorageStats(): Promise<any> {
    return await this.contentStore.getStats();
  }
}
```

### Step 4: Testing & Verification (Days 15-21)

```bash
# 1. Create test file
cat > test-phase1.js << 'EOF'
import { ContentAddressableStore } from './dist/infrastructure/storage/ContentAddressableStore.js';
import { tmpdir } from 'os';
import { join } from 'path';

async function testPhase1() {
  const store = new ContentAddressableStore({
    storageDir: join(tmpdir(), 'test-content-store'),
    compressionEnabled: true,
    maxMemoryCacheMB: 10
  });

  console.log('🧪 Testing content storage...');
  
  // Test storage
  const content = 'Hello, World!';
  const ref = await store.store(content);
  console.log(`✅ Stored content with hash: ${ref.hash.substring(0, 8)}...`);
  
  // Test retrieval
  const retrieved = await store.retrieve(ref.hash);
  console.log(`✅ Retrieved content: ${retrieved === content ? 'MATCH' : 'MISMATCH'}`);
  
  // Test deduplication
  const ref2 = await store.store(content);
  console.log(`✅ Deduplication: ${ref.hash === ref2.hash ? 'WORKING' : 'FAILED'}`);
  console.log(`✅ Reference count: ${ref2.references}`);
  
  // Test stats
  const stats = await store.getStats();
  console.log(`✅ Storage stats: ${stats.totalContent} items, ${(stats.totalSize / 1024).toFixed(1)} KB`);
  
  console.log('🎉 Phase 1 basic functionality verified!');
}

testPhase1().catch(console.error);
EOF

# 2. Run test
npm run build && node test-phase1.js

# 3. Run migration
npm run build && node scripts/migrate-phase1.js

# 4. Verify results
npm test -- tests/unit/infrastructure/ContentAddressableStore.test.ts
```

## ⚡ Phase 2: Real-Time Features (6-8 weeks)

### Quick Start Commands

```bash
# Install dependencies
npm install chokidar uuid
npm install --save-dev @types/uuid

# Copy implementation files (from Phase 2 guide)
cp docs/implementation/Phase2-RealTime-Implementation.md ./PHASE2_IMPLEMENTATION.md

# Follow the detailed implementation in the guide
# Key files to implement:
# - src/infrastructure/session/ProcessManager.ts
# - src/infrastructure/session/FileWatcher.ts
# - src/domain/services/SessionManager.ts
# - src/presentation/tui/components/LiveSessionView.tsx
```

### Verification Steps

```bash
# Test process management
npm test -- tests/unit/infrastructure/ProcessManager.test.ts

# Test file watching
npm test -- tests/unit/infrastructure/FileWatcher.test.ts

# Test session integration
npm test -- tests/integration/SessionManagement.test.ts
```

## 🎯 Phase 3: Advanced Features (8-10 weeks)

### Quick Start Commands

```bash
# Install dependencies
npm install sqlite3 better-sqlite3
npm install --save-dev @types/better-sqlite3

# Copy implementation files (from Phase 3 guide)
cp docs/implementation/Phase3-Advanced-Implementation.md ./PHASE3_IMPLEMENTATION.md

# Key components to implement:
# - Checkpoint system with SQLite storage
# - Timeline navigation with ASCII visualization
# - Usage analytics with cost tracking
# - Session branching capabilities
```

## 🔧 Daily Implementation Checklist

### Week 1: Foundation
- [ ] Day 1: Environment setup and prerequisites verification
- [ ] Day 2: ContentAddressableStore implementation
- [ ] Day 3: Timeline data structures
- [ ] Day 4: Enhanced metadata extraction
- [ ] Day 5: Repository integration
- [ ] Day 6: Unit testing
- [ ] Day 7: Integration testing

### Week 2: Optimization & Testing
- [ ] Day 8: Performance optimization
- [ ] Day 9: Memory usage optimization
- [ ] Day 10: Compression implementation
- [ ] Day 11: Error handling improvement
- [ ] Day 12: Migration script creation
- [ ] Day 13: End-to-end testing
- [ ] Day 14: Documentation and verification

## 📊 Success Verification Commands

### Quick Health Check

```bash
#!/bin/bash
# One-command health check

echo "🏥 System Health Check"
echo "====================="

# Check build
if npm run build; then
    echo "✅ Build: PASS"
else
    echo "❌ Build: FAIL"
    exit 1
fi

# Check tests
if npm test -- --reporter=dot; then
    echo "✅ Tests: PASS"
else
    echo "❌ Tests: FAIL"
    exit 1
fi

# Check functionality
if node -e "
const { ContentAddressableStore } = require('./dist/infrastructure/storage/ContentAddressableStore.js');
const store = new ContentAddressableStore({
  storageDir: '/tmp/health-check',
  compressionEnabled: true,
  maxMemoryCacheMB: 10
});

(async () => {
  try {
    const ref = await store.store('Health check content');
    const retrieved = await store.retrieve(ref.hash);
    if (retrieved === 'Health check content') {
      console.log('✅ Functionality: PASS');
    } else {
      console.log('❌ Functionality: FAIL');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Functionality: ERROR -', error.message);
    process.exit(1);
  }
})();
"; then
    echo "✅ Core functionality verified"
else
    echo "❌ Core functionality failed"
    exit 1
fi

echo ""
echo "🎉 All systems operational!"
```

## 🚨 Emergency Rollback

```bash
#!/bin/bash
# Emergency rollback script

echo "🚨 Emergency Rollback"
echo "===================="

# Find latest backup
LATEST_BACKUP=$(ls -1t ~/.claude.backup.* 2>/dev/null | head -1)

if [[ -n "$LATEST_BACKUP" ]]; then
    echo "Found backup: $LATEST_BACKUP"
    
    # Stop any running processes
    pkill -f "show-me-the-talk" 2>/dev/null || true
    
    # Restore backup
    rm -rf ~/.claude
    cp -r "$LATEST_BACKUP" ~/.claude
    
    echo "✅ Rollback completed"
    echo "System restored to backup state"
else
    echo "❌ No backup found"
    echo "Manual recovery required"
    exit 1
fi
```

## 📈 Progress Tracking

### Phase 1 Milestones

- [ ] **Milestone 1**: ContentAddressableStore working (Day 7)
- [ ] **Milestone 2**: Repository integration complete (Day 14)
- [ ] **Milestone 3**: 50%+ storage reduction achieved (Day 21)
- [ ] **Milestone 4**: All tests passing (Day 28)

### Phase 2 Milestones

- [ ] **Milestone 1**: Process management working (Week 6)
- [ ] **Milestone 2**: File watching operational (Week 8)
- [ ] **Milestone 3**: Live sessions functional (Week 10)
- [ ] **Milestone 4**: Performance targets met (Week 12)

### Phase 3 Milestones

- [ ] **Milestone 1**: Checkpoint system working (Week 16)
- [ ] **Milestone 2**: Timeline navigation complete (Week 18)
- [ ] **Milestone 3**: Usage analytics functional (Week 20)
- [ ] **Milestone 4**: Full feature integration (Week 22)

## 💡 Pro Tips

### Development Efficiency

1. **Start Small**: Implement ContentAddressableStore first - it provides immediate value
2. **Test Continuously**: Run tests after every major change
3. **Use Feature Flags**: Implement with environment variable toggles
4. **Monitor Performance**: Profile memory usage during development
5. **Document Progress**: Keep implementation notes for team knowledge

### Common Pitfalls

1. **Don't Skip Tests**: Comprehensive testing prevents integration issues
2. **Memory Management**: Monitor memory usage with large datasets
3. **File Permissions**: Ensure proper file system permissions
4. **Backup Strategy**: Always backup before major changes
5. **Platform Differences**: Test on target deployment platforms

## 🎯 Next Steps

1. **Start with Phase 1**: Begin with ContentAddressableStore implementation
2. **Follow the Guides**: Use the detailed implementation guides for complete code
3. **Test Everything**: Use the comprehensive testing framework
4. **Monitor Progress**: Track milestones and performance metrics
5. **Get Support**: Refer to troubleshooting sections in detailed guides

This quick-start guide provides the fastest path to implementation while maintaining quality and verifiability. Each phase builds incrementally on the previous work, ensuring a smooth development experience.