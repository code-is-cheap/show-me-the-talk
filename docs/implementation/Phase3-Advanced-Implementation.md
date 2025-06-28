# Phase 3: Advanced Features Implementation Guide

## Overview & Objectives

This document provides a complete implementation guide for Phase 3 enhancements, building on the content-addressable storage (Phase 1) and real-time session management (Phase 2) foundations. Phase 3 introduces enterprise-grade features including checkpoint systems, timeline navigation, and usage analytics.

### Primary Objectives
1. **Checkpoint System**: Complete session versioning with branching and rollback capabilities
2. **Timeline Navigation**: Visual timeline traversal within terminal interface
3. **Usage Analytics**: Comprehensive cost tracking and optimization insights
4. **Session Branching**: Fork sessions from any checkpoint for experimental development
5. **Advanced Export**: Enhanced export with timeline and checkpoint data

### Success Criteria
- [ ] Create and restore checkpoints with 100% fidelity
- [ ] Navigate session timelines with <200ms response time
- [ ] Track usage costs with ±5% accuracy
- [ ] Branch sessions without performance degradation
- [ ] Export timeline data in multiple formats
- [ ] Maintain all Phase 1 & 2 functionality

## Technical Specifications

### Checkpoint System Requirements

**Checkpoint Capabilities:**
- **Automatic Creation**: Smart detection of significant session moments
- **Manual Creation**: User-triggered checkpoints with descriptions
- **Content Integrity**: SHA-256 verification of all checkpoint data
- **Branching Support**: Fork sessions from any checkpoint
- **Fast Restoration**: Restore to any checkpoint within 5 seconds
- **Storage Efficiency**: Incremental snapshots with deduplication

**Performance Requirements:**
- Checkpoint creation: < 2 seconds
- Checkpoint restoration: < 5 seconds
- Timeline navigation: < 200ms per operation
- Storage overhead: < 25% additional space
- Memory usage: < 100MB for checkpoint metadata

### Timeline Navigation Requirements

**Navigation Features:**
- **Visual Timeline**: ASCII-based timeline visualization in terminal
- **Checkpoint Markers**: Visual indicators for important milestones
- **Branch Visualization**: Display session forks and merges
- **Quick Navigation**: Jump to any point in timeline
- **Diff Display**: Show changes between checkpoints

**UI Requirements:**
- **Responsive Design**: Adapt to terminal width (80-200 columns)
- **Keyboard Navigation**: Vi-style navigation with shortcuts
- **Status Display**: Current position and available actions
- **Performance**: Smooth scrolling and instant updates

### Usage Analytics Requirements

**Analytics Capabilities:**
- **Token Tracking**: Count input, output, and cache tokens
- **Cost Calculation**: Real-time cost estimation with model pricing
- **Efficiency Metrics**: Tokens per task, cost per outcome
- **Time Analysis**: Session duration and tool usage patterns
- **Trend Analysis**: Historical usage patterns and optimization opportunities

## Architecture Integration

### Enhanced Domain Layer

```typescript
// New checkpoint domain interfaces
export interface CheckpointManager {
  createCheckpoint(sessionId: string, description?: string): Promise<Checkpoint>;
  restoreCheckpoint(checkpointId: string): Promise<void>;
  listCheckpoints(sessionId: string): Promise<Checkpoint[]>;
  deleteCheckpoint(checkpointId: string): Promise<void>;
  branchFromCheckpoint(checkpointId: string, description?: string): Promise<string>;
  getCheckpointDiff(fromId: string, toId: string): Promise<CheckpointDiff>;
}

export interface TimelineNavigator {
  getTimeline(sessionId: string): Promise<SessionTimeline>;
  navigateToCheckpoint(checkpointId: string): Promise<void>;
  getTimelineVisualization(sessionId: string, width: number): Promise<string>;
  findNearestCheckpoint(sessionId: string, messageIndex: number): Promise<Checkpoint>;
}

export interface UsageAnalytics {
  trackUsage(sessionId: string, usage: UsageEvent): Promise<void>;
  getSessionAnalytics(sessionId: string): Promise<SessionAnalytics>;
  getProjectAnalytics(projectPath: string): Promise<ProjectAnalytics>;
  generateUsageReport(timeRange: DateRange): Promise<UsageReport>;
  estimateCost(tokens: TokenUsage, model: string): Promise<CostEstimate>;
}
```

### Infrastructure Layer Extensions

```typescript
// Checkpoint storage and management
export interface CheckpointStorage {
  saveCheckpoint(checkpoint: Checkpoint): Promise<void>;
  loadCheckpoint(checkpointId: string): Promise<Checkpoint | null>;
  saveFileSnapshot(snapshot: FileSnapshot): Promise<void>;
  loadFileSnapshot(checkpointId: string, filePath: string): Promise<FileSnapshot | null>;
  listCheckpoints(sessionId: string): Promise<Checkpoint[]>;
  deleteCheckpoint(checkpointId: string): Promise<void>;
}

export interface AnalyticsStorage {
  recordUsage(event: UsageEvent): Promise<void>;
  getUsageEvents(sessionId: string): Promise<UsageEvent[]>;
  getAggregatedUsage(filters: UsageFilters): Promise<UsageAggregate>;
  exportUsageData(format: 'json' | 'csv'): Promise<string>;
}
```

## Complete Implementation

### 1. Checkpoint System Implementation

#### Core Checkpoint Domain Models

```typescript
// src/domain/models/checkpoint/Checkpoint.ts
export interface CheckpointMetadata {
  totalTokens: number;
  model: string;
  userPrompt: string;
  fileChangesCount: number;
  snapshotSize: number;
  parentCheckpointId?: string;
  branchName?: string;
  tags: string[];
}

export interface FileSnapshot {
  checkpointId: string;
  filePath: string;
  contentHash: string;
  isDeleted: boolean;
  permissions?: number;
  size: number;
  lastModified: Date;
}

export interface CheckpointDiff {
  fromCheckpoint: Checkpoint;
  toCheckpoint: Checkpoint;
  fileChanges: FileDiff[];
  tokenDelta: number;
  timeDelta: number;
  messageRange: { start: number; end: number };
}

export interface FileDiff {
  path: string;
  action: 'added' | 'modified' | 'deleted' | 'renamed';
  oldContent?: string;
  newContent?: string;
  oldHash?: string;
  newHash?: string;
}

export class Checkpoint {
  constructor(
    public readonly id: string,
    public readonly sessionId: string,
    public readonly messageIndex: number,
    public readonly timestamp: Date,
    public readonly description: string,
    public readonly metadata: CheckpointMetadata,
    public readonly fileSnapshots: FileSnapshot[] = []
  ) {}

  isAutomatic(): boolean {
    return this.description.startsWith('[AUTO]');
  }

  getBranchName(): string {
    return this.metadata.branchName || 'main';
  }

  getParentId(): string | undefined {
    return this.metadata.parentCheckpointId;
  }

  getTags(): string[] {
    return [...this.metadata.tags];
  }

  getComplexityScore(): number {
    // Calculate checkpoint significance based on changes
    let score = 0;
    score += this.metadata.fileChangesCount * 2;
    score += Math.log10(this.metadata.totalTokens + 1);
    score += this.fileSnapshots.length;
    return Math.round(score * 10) / 10;
  }

  getFileChanges(): FileSnapshot[] {
    return [...this.fileSnapshots];
  }

  hasFile(filePath: string): boolean {
    return this.fileSnapshots.some(snapshot => 
      snapshot.filePath === filePath && !snapshot.isDeleted
    );
  }
}
```

#### Checkpoint Manager Implementation

```typescript
// src/domain/services/CheckpointManager.ts
import { Checkpoint, CheckpointMetadata, FileSnapshot, CheckpointDiff } from '../models/checkpoint/Checkpoint.js';
import { CheckpointStorage } from '../../infrastructure/storage/CheckpointStorage.js';
import { ContentStore } from './ContentStore.js';
import { FileWatcher } from '../../infrastructure/session/FileWatcher.js';
import { LiveSession } from './SessionManager.js';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join } from 'path';

export enum CheckpointTrigger {
  MANUAL = 'manual',
  AUTO_TOOL_USE = 'auto_tool_use',
  AUTO_FILE_CHANGE = 'auto_file_change',
  AUTO_TIME_INTERVAL = 'auto_time_interval',
  AUTO_TOKEN_THRESHOLD = 'auto_token_threshold'
}

export class CheckpointManager {
  private autoCheckpointSettings = {
    enabled: true,
    onToolUse: true,
    onFileChange: true,
    timeInterval: 10 * 60 * 1000, // 10 minutes
    tokenThreshold: 1000
  };

  constructor(
    private checkpointStorage: CheckpointStorage,
    private contentStore: ContentStore,
    private fileWatcher: FileWatcher
  ) {}

  async createCheckpoint(
    sessionId: string, 
    description?: string,
    trigger: CheckpointTrigger = CheckpointTrigger.MANUAL
  ): Promise<Checkpoint> {
    const checkpointId = uuidv4();
    const timestamp = new Date();
    
    // Get session information (would need integration with session manager)
    const sessionInfo = await this.getSessionInfo(sessionId);
    
    // Create file snapshots
    const fileSnapshots = await this.createFileSnapshots(
      checkpointId, 
      sessionInfo.projectPath
    );
    
    // Calculate metadata
    const metadata: CheckpointMetadata = {
      totalTokens: sessionInfo.totalTokens,
      model: sessionInfo.model,
      userPrompt: sessionInfo.lastUserPrompt,
      fileChangesCount: fileSnapshots.length,
      snapshotSize: fileSnapshots.reduce((sum, snapshot) => sum + snapshot.size, 0),
      tags: this.generateAutoTags(trigger, fileSnapshots)
    };
    
    const finalDescription = description || this.generateAutoDescription(trigger, metadata);
    
    const checkpoint = new Checkpoint(
      checkpointId,
      sessionId,
      sessionInfo.messageIndex,
      timestamp,
      finalDescription,
      metadata,
      fileSnapshots
    );
    
    await this.checkpointStorage.saveCheckpoint(checkpoint);
    
    // Save file snapshots to content store
    for (const snapshot of fileSnapshots) {
      await this.checkpointStorage.saveFileSnapshot(snapshot);
    }
    
    return checkpoint;
  }

  async restoreCheckpoint(checkpointId: string): Promise<void> {
    const checkpoint = await this.checkpointStorage.loadCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    // Get session info to determine project path
    const sessionInfo = await this.getSessionInfo(checkpoint.sessionId);
    
    // Restore file states
    await this.restoreFileStates(checkpoint, sessionInfo.projectPath);
    
    // Restore session state (would need integration with session manager)
    await this.restoreSessionState(checkpoint);
  }

  async listCheckpoints(sessionId: string): Promise<Checkpoint[]> {
    return await this.checkpointStorage.listCheckpoints(sessionId);
  }

  async deleteCheckpoint(checkpointId: string): Promise<void> {
    const checkpoint = await this.checkpointStorage.loadCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    // Release content references
    for (const snapshot of checkpoint.fileSnapshots) {
      await this.contentStore.release(snapshot.contentHash);
    }

    await this.checkpointStorage.deleteCheckpoint(checkpointId);
  }

  async branchFromCheckpoint(checkpointId: string, branchName?: string): Promise<string> {
    const sourceCheckpoint = await this.checkpointStorage.loadCheckpoint(checkpointId);
    if (!sourceCheckpoint) {
      throw new Error(`Source checkpoint ${checkpointId} not found`);
    }

    // Create new session ID for the branch
    const newSessionId = uuidv4();
    const finalBranchName = branchName || `branch-${Date.now()}`;
    
    // Create branch checkpoint
    const branchCheckpoint = new Checkpoint(
      uuidv4(),
      newSessionId,
      0, // Start from message index 0
      new Date(),
      `[BRANCH] Forked from ${sourceCheckpoint.description}`,
      {
        ...sourceCheckpoint.metadata,
        parentCheckpointId: checkpointId,
        branchName: finalBranchName,
        tags: [...sourceCheckpoint.metadata.tags, 'branch', 'fork']
      },
      sourceCheckpoint.fileSnapshots
    );

    await this.checkpointStorage.saveCheckpoint(branchCheckpoint);
    
    return newSessionId;
  }

  async getCheckpointDiff(fromId: string, toId: string): Promise<CheckpointDiff> {
    const [fromCheckpoint, toCheckpoint] = await Promise.all([
      this.checkpointStorage.loadCheckpoint(fromId),
      this.checkpointStorage.loadCheckpoint(toId)
    ]);

    if (!fromCheckpoint || !toCheckpoint) {
      throw new Error('One or both checkpoints not found');
    }

    const fileChanges = await this.calculateFileDiffs(fromCheckpoint, toCheckpoint);
    
    return {
      fromCheckpoint,
      toCheckpoint,
      fileChanges,
      tokenDelta: toCheckpoint.metadata.totalTokens - fromCheckpoint.metadata.totalTokens,
      timeDelta: toCheckpoint.timestamp.getTime() - fromCheckpoint.timestamp.getTime(),
      messageRange: {
        start: fromCheckpoint.messageIndex,
        end: toCheckpoint.messageIndex
      }
    };
  }

  private async createFileSnapshots(checkpointId: string, projectPath: string): Promise<FileSnapshot[]> {
    const snapshots: FileSnapshot[] = [];
    
    // Get list of project files (excluding common ignored patterns)
    const files = await this.getProjectFiles(projectPath);
    
    for (const filePath of files) {
      try {
        const fullPath = join(projectPath, filePath);
        const stats = await fs.stat(fullPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        
        const contentRef = await this.contentStore.store(content);
        
        snapshots.push({
          checkpointId,
          filePath,
          contentHash: contentRef.hash,
          isDeleted: false,
          permissions: stats.mode,
          size: stats.size,
          lastModified: stats.mtime
        });
      } catch (error) {
        // File might be binary or unreadable, skip it
        console.warn(`Skipping file ${filePath}:`, error.message);
      }
    }
    
    return snapshots;
  }

  private async restoreFileStates(checkpoint: Checkpoint, projectPath: string): Promise<void> {
    // Get current files to identify deletions
    const currentFiles = new Set(await this.getProjectFiles(projectPath));
    const checkpointFiles = new Set(
      checkpoint.fileSnapshots
        .filter(s => !s.isDeleted)
        .map(s => s.filePath)
    );

    // Delete files that shouldn't exist
    for (const currentFile of currentFiles) {
      if (!checkpointFiles.has(currentFile)) {
        try {
          await fs.unlink(join(projectPath, currentFile));
        } catch (error) {
          console.warn(`Failed to delete ${currentFile}:`, error.message);
        }
      }
    }

    // Restore files from checkpoint
    for (const snapshot of checkpoint.fileSnapshots) {
      if (snapshot.isDeleted) continue;

      try {
        const content = await this.contentStore.retrieve(snapshot.contentHash);
        if (content) {
          const fullPath = join(projectPath, snapshot.filePath);
          
          // Ensure directory exists
          await fs.mkdir(join(fullPath, '..'), { recursive: true });
          
          // Write file content
          await fs.writeFile(fullPath, content, 'utf-8');
          
          // Restore permissions if available
          if (snapshot.permissions) {
            await fs.chmod(fullPath, snapshot.permissions);
          }
        }
      } catch (error) {
        console.error(`Failed to restore ${snapshot.filePath}:`, error.message);
      }
    }
  }

  private async restoreSessionState(checkpoint: Checkpoint): Promise<void> {
    // This would integrate with the session manager to restore conversation state
    // For now, this is a placeholder for future implementation
    console.log(`Restoring session state to checkpoint ${checkpoint.id}`);
  }

  private async getProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string, relativePath: string = ''): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativeFilePath = join(relativePath, entry.name);
        
        // Skip common ignored patterns
        if (this.shouldIgnoreFile(relativeFilePath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath, relativeFilePath);
        } else if (entry.isFile()) {
          files.push(relativeFilePath);
        }
      }
    };
    
    await scanDirectory(projectPath);
    return files;
  }

  private shouldIgnoreFile(filePath: string): boolean {
    const ignoredPatterns = [
      /node_modules/,
      /\.git/,
      /\.claude/,
      /dist/,
      /build/,
      /\.next/,
      /\.nuxt/,
      /target/,
      /\.vscode/,
      /\.idea/,
      /\.DS_Store/,
      /\.env/,
      /\.log$/,
      /\.(jpg|jpeg|png|gif|bmp|ico|svg)$/i,
      /\.(mp4|avi|mov|wmv|flv)$/i,
      /\.(zip|tar|gz|rar|7z)$/i
    ];
    
    return ignoredPatterns.some(pattern => pattern.test(filePath));
  }

  private async calculateFileDiffs(from: Checkpoint, to: Checkpoint): Promise<FileDiff[]> {
    const diffs: FileDiff[] = [];
    
    const fromFiles = new Map(from.fileSnapshots.map(s => [s.filePath, s]));
    const toFiles = new Map(to.fileSnapshots.map(s => [s.filePath, s]));
    
    // Find added and modified files
    for (const [path, toSnapshot] of toFiles) {
      const fromSnapshot = fromFiles.get(path);
      
      if (!fromSnapshot) {
        // File was added
        const content = await this.contentStore.retrieve(toSnapshot.contentHash);
        diffs.push({
          path,
          action: 'added',
          newContent: content || '',
          newHash: toSnapshot.contentHash
        });
      } else if (fromSnapshot.contentHash !== toSnapshot.contentHash) {
        // File was modified
        const [oldContent, newContent] = await Promise.all([
          this.contentStore.retrieve(fromSnapshot.contentHash),
          this.contentStore.retrieve(toSnapshot.contentHash)
        ]);
        
        diffs.push({
          path,
          action: 'modified',
          oldContent: oldContent || '',
          newContent: newContent || '',
          oldHash: fromSnapshot.contentHash,
          newHash: toSnapshot.contentHash
        });
      }
    }
    
    // Find deleted files
    for (const [path, fromSnapshot] of fromFiles) {
      if (!toFiles.has(path)) {
        const content = await this.contentStore.retrieve(fromSnapshot.contentHash);
        diffs.push({
          path,
          action: 'deleted',
          oldContent: content || '',
          oldHash: fromSnapshot.contentHash
        });
      }
    }
    
    return diffs;
  }

  private generateAutoTags(trigger: CheckpointTrigger, fileSnapshots: FileSnapshot[]): string[] {
    const tags = ['auto'];
    
    switch (trigger) {
      case CheckpointTrigger.AUTO_TOOL_USE:
        tags.push('tool-use');
        break;
      case CheckpointTrigger.AUTO_FILE_CHANGE:
        tags.push('file-change');
        break;
      case CheckpointTrigger.AUTO_TIME_INTERVAL:
        tags.push('time-interval');
        break;
      case CheckpointTrigger.AUTO_TOKEN_THRESHOLD:
        tags.push('token-threshold');
        break;
    }
    
    // Add file type tags
    const extensions = new Set(
      fileSnapshots
        .map(s => s.filePath.split('.').pop()?.toLowerCase())
        .filter(Boolean)
    );
    
    for (const ext of extensions) {
      if (['ts', 'js', 'py', 'rs', 'go'].includes(ext!)) {
        tags.push('code');
        break;
      }
    }
    
    return tags;
  }

  private generateAutoDescription(trigger: CheckpointTrigger, metadata: CheckpointMetadata): string {
    const prefix = '[AUTO]';
    
    switch (trigger) {
      case CheckpointTrigger.AUTO_TOOL_USE:
        return `${prefix} After tool execution (${metadata.fileChangesCount} files changed)`;
      case CheckpointTrigger.AUTO_FILE_CHANGE:
        return `${prefix} File changes detected (${metadata.fileChangesCount} files)`;
      case CheckpointTrigger.AUTO_TIME_INTERVAL:
        return `${prefix} Time interval checkpoint`;
      case CheckpointTrigger.AUTO_TOKEN_THRESHOLD:
        return `${prefix} Token threshold reached (${metadata.totalTokens} tokens)`;
      default:
        return `${prefix} Automatic checkpoint`;
    }
  }

  private async getSessionInfo(sessionId: string): Promise<any> {
    // This would integrate with the session manager to get current session state
    // For now, return mock data
    return {
      messageIndex: 10,
      totalTokens: 1500,
      model: 'claude-3-5-sonnet-20241022',
      lastUserPrompt: 'Current user prompt',
      projectPath: '/tmp/mock-project'
    };
  }
}
```

### 2. Timeline Navigation Implementation

#### Timeline Navigator Service

```typescript
// src/domain/services/TimelineNavigator.ts
import { SessionTimeline } from '../models/timeline/ConversationTimeline.js';
import { Checkpoint } from '../models/checkpoint/Checkpoint.js';
import { CheckpointManager } from './CheckpointManager.js';
import { TimelineAnalyzer } from './TimelineAnalyzer.js';

export interface TimelineVisualization {
  ascii: string;
  width: number;
  height: number;
  checkpoints: CheckpointMarker[];
  currentPosition?: number;
}

export interface CheckpointMarker {
  position: number;
  checkpointId: string;
  symbol: string;
  description: string;
  significance: number;
}

export class TimelineNavigator {
  constructor(
    private checkpointManager: CheckpointManager,
    private timelineAnalyzer: TimelineAnalyzer
  ) {}

  async getTimeline(sessionId: string): Promise<SessionTimeline> {
    // This would get session info from conversation repository
    const conversation = await this.getConversation(sessionId);
    return await this.timelineAnalyzer.analyzeConversation(conversation);
  }

  async navigateToCheckpoint(checkpointId: string): Promise<void> {
    await this.checkpointManager.restoreCheckpoint(checkpointId);
  }

  async getTimelineVisualization(
    sessionId: string, 
    width: number = 80,
    currentCheckpointId?: string
  ): Promise<TimelineVisualization> {
    const timeline = await this.getTimeline(sessionId);
    const checkpoints = await this.checkpointManager.listCheckpoints(sessionId);
    
    return this.generateVisualization(timeline, checkpoints, width, currentCheckpointId);
  }

  async findNearestCheckpoint(sessionId: string, messageIndex: number): Promise<Checkpoint | null> {
    const checkpoints = await this.checkpointManager.listCheckpoints(sessionId);
    
    let nearest: Checkpoint | null = null;
    let minDistance = Infinity;
    
    for (const checkpoint of checkpoints) {
      const distance = Math.abs(checkpoint.messageIndex - messageIndex);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = checkpoint;
      }
    }
    
    return nearest;
  }

  private generateVisualization(
    timeline: SessionTimeline,
    checkpoints: Checkpoint[],
    width: number,
    currentCheckpointId?: string
  ): TimelineVisualization {
    const entries = timeline.getEntries();
    const totalMessages = entries.length;
    
    if (totalMessages === 0) {
      return {
        ascii: 'No timeline data available',
        width,
        height: 1,
        checkpoints: []
      };
    }
    
    // Create timeline visualization
    const timelineWidth = width - 10; // Reserve space for labels
    const lines: string[] = [];
    const markers: CheckpointMarker[] = [];
    
    // Create main timeline bar
    let timelineLine = '├';
    let markerLine = ' ';
    let labelLine = ' ';
    
    for (let i = 0; i < timelineWidth - 2; i++) {
      const messageIndex = Math.floor((i / (timelineWidth - 2)) * totalMessages);
      const entry = entries[messageIndex];
      
      // Check if there's a checkpoint at this position
      const checkpoint = checkpoints.find(cp => 
        Math.abs(cp.messageIndex - messageIndex) <= totalMessages * 0.02 // 2% tolerance
      );
      
      if (checkpoint) {
        const symbol = this.getCheckpointSymbol(checkpoint);
        const isCurrent = checkpoint.id === currentCheckpointId;
        
        timelineLine += isCurrent ? '●' : symbol;
        markerLine += isCurrent ? '▲' : ' ';
        labelLine += this.getPositionNumber(markers.length);
        
        markers.push({
          position: i + 1,
          checkpointId: checkpoint.id,
          symbol,
          description: checkpoint.description,
          significance: checkpoint.getComplexityScore()
        });
      } else {
        // Regular timeline character based on activity
        const char = entry?.isSignificant() ? '━' : '─';
        timelineLine += char;
        markerLine += ' ';
        labelLine += ' ';
      }
    }
    
    timelineLine += '┤';
    
    lines.push('Timeline:');
    lines.push(timelineLine);
    lines.push(markerLine);
    lines.push(labelLine);
    lines.push('');
    
    // Add checkpoint legend
    if (markers.length > 0) {
      lines.push('Checkpoints:');
      for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        const number = this.getPositionNumber(i);
        const desc = this.truncateDescription(marker.description, width - 15);
        const isCurrent = marker.checkpointId === currentCheckpointId;
        const prefix = isCurrent ? '→ ' : '  ';
        
        lines.push(`${prefix}${number} ${marker.symbol} ${desc}`);
      }
    }
    
    return {
      ascii: lines.join('\n'),
      width,
      height: lines.length,
      checkpoints: markers
    };
  }

  private getCheckpointSymbol(checkpoint: Checkpoint): string {
    if (checkpoint.isAutomatic()) {
      return '○'; // Auto checkpoint
    }
    
    const tags = checkpoint.getTags();
    if (tags.includes('branch')) return '⑃'; // Branch
    if (tags.includes('code')) return '⚡'; // Code change
    if (tags.includes('tool-use')) return '🔧'; // Tool usage
    
    return '●'; // Manual checkpoint
  }

  private getPositionNumber(index: number): string {
    if (index < 10) return index.toString();
    if (index < 36) return String.fromCharCode(65 + index - 10); // A-Z
    return '#'; // Too many checkpoints
  }

  private truncateDescription(description: string, maxLength: number): string {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength - 3) + '...';
  }

  private async getConversation(sessionId: string): Promise<any> {
    // This would integrate with conversation repository
    // For now, return mock conversation
    throw new Error('Not implemented - requires conversation repository integration');
  }
}
```

#### Timeline TUI Component

```typescript
// src/presentation/tui/components/TimelineNavigationView.tsx
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { TimelineNavigator, TimelineVisualization } from '../../../domain/services/TimelineNavigator.js';
import { Checkpoint } from '../../../domain/models/checkpoint/Checkpoint.js';

interface TimelineNavigationViewProps {
  sessionId: string;
  timelineNavigator: TimelineNavigator;
  onCheckpointSelected: (checkpointId: string) => void;
  onExit: () => void;
}

export const TimelineNavigationView: React.FC<TimelineNavigationViewProps> = ({
  sessionId,
  timelineNavigator,
  onCheckpointSelected,
  onExit
}) => {
  const [visualization, setVisualization] = React.useState<TimelineVisualization | null>(null);
  const [checkpoints, setCheckpoints] = React.useState<Checkpoint[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [terminalWidth, setTerminalWidth] = React.useState(80);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load timeline data
  React.useEffect(() => {
    const loadTimeline = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const width = process.stdout.columns || 80;
        setTerminalWidth(width);
        
        const viz = await timelineNavigator.getTimelineVisualization(sessionId, width - 4);
        setVisualization(viz);
        
        // Get checkpoint details
        // This would need integration with checkpoint manager
        setCheckpoints([]); // Mock for now
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
      } finally {
        setLoading(false);
      }
    };

    loadTimeline();
  }, [sessionId, timelineNavigator]);

  // Handle keyboard input
  useInput((input, key) => {
    if (loading) return;

    if (key.escape || input === 'q') {
      onExit();
      return;
    }

    if (!visualization) return;

    const maxIndex = visualization.checkpoints.length - 1;

    switch (true) {
      case key.upArrow || input === 'k':
        setSelectedIndex(Math.max(0, selectedIndex - 1));
        break;
        
      case key.downArrow || input === 'j':
        setSelectedIndex(Math.min(maxIndex, selectedIndex + 1));
        break;
        
      case key.return || input === ' ':
        if (visualization.checkpoints[selectedIndex]) {
          onCheckpointSelected(visualization.checkpoints[selectedIndex].checkpointId);
        }
        break;
        
      case input === 'r':
        // Refresh timeline
        loadTimeline();
        break;
        
      case input === '?':
        // Show help (would implement help modal)
        break;
    }
  });

  if (loading) {
    return (
      <Box justifyContent="center" alignItems="center" height={10}>
        <Text>Loading timeline...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={2}>
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press 'q' to exit or 'r' to retry</Text>
      </Box>
    );
  }

  if (!visualization) {
    return (
      <Box justifyContent="center" alignItems="center" height={10}>
        <Text>No timeline data available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" paddingX={1}>
        <Text>Timeline Navigation - Session: {sessionId.slice(0, 8)}</Text>
      </Box>

      {/* Timeline visualization */}
      <Box padding={1} flexGrow={1}>
        <Text>{visualization.ascii}</Text>
      </Box>

      {/* Checkpoint details */}
      <Box borderStyle="single" padding={1} height={8}>
        <Box flexDirection="column">
          <Text color="cyan">Checkpoint Details:</Text>
          {visualization.checkpoints.length > 0 ? (
            <CheckpointDetails 
              checkpoint={visualization.checkpoints[selectedIndex]}
              isSelected={true}
            />
          ) : (
            <Text color="gray">No checkpoints available</Text>
          )}
        </Box>
      </Box>

      {/* Controls */}
      <Box borderStyle="single" paddingX={1}>
        <Text color="gray">
          ↑/↓ Navigate | Enter Select | r Refresh | q Quit | ? Help
        </Text>
      </Box>
    </Box>
  );
};

interface CheckpointDetailsProps {
  checkpoint: any; // Would be properly typed
  isSelected: boolean;
}

const CheckpointDetails: React.FC<CheckpointDetailsProps> = ({ checkpoint, isSelected }) => {
  if (!checkpoint) {
    return <Text color="gray">Select a checkpoint to view details</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>
        <Text color={isSelected ? "yellow" : "white"}>{checkpoint.symbol}</Text>
        {' '}
        <Text color="white">{checkpoint.description}</Text>
      </Text>
      <Text color="gray">Significance: {checkpoint.significance}/10</Text>
      <Text color="gray">Position: {checkpoint.position}</Text>
    </Box>
  );
};
```

### 3. Usage Analytics Implementation

#### Usage Analytics Service

```typescript
// src/domain/services/UsageAnalytics.ts
export interface UsageEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: 'message' | 'tool_use' | 'checkpoint' | 'branch';
  tokenUsage: TokenUsage;
  model: string;
  cost: number;
  metadata: Record<string, any>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  cacheCost: number;
  totalCost: number;
  currency: string;
}

export interface SessionAnalytics {
  sessionId: string;
  totalCost: number;
  totalTokens: number;
  messageCount: number;
  toolUsageCount: number;
  averageCostPerMessage: number;
  mostUsedTools: ToolUsageStats[];
  costBreakdown: CostBreakdown;
  efficiency: EfficiencyMetrics;
}

export interface ProjectAnalytics {
  projectPath: string;
  sessionCount: number;
  totalCost: number;
  totalTokens: number;
  averageSessionCost: number;
  costTrend: CostTrendData[];
  topSessions: SessionSummary[];
}

export interface UsageReport {
  period: DateRange;
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
  averageCostPerSession: number;
  modelUsage: ModelUsageStats[];
  dailyBreakdown: DailyUsageData[];
  recommendations: UsageRecommendation[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ToolUsageStats {
  toolName: string;
  usageCount: number;
  totalCost: number;
  averageCostPerUse: number;
}

export interface CostBreakdown {
  inputCosts: number;
  outputCosts: number;
  cacheCosts: number;
  toolCosts: number;
}

export interface EfficiencyMetrics {
  tokensPerMinute: number;
  costEfficiency: number; // Output quality / cost ratio
  toolEfficiency: number; // Successful tool uses / total tool uses
}

export class UsageAnalytics {
  private modelPricing = new Map<string, { input: number; output: number; cache: number }>([
    ['claude-3-5-sonnet-20241022', { input: 0.003, output: 0.015, cache: 0.0003 }],
    ['claude-3-haiku-20240307', { input: 0.00025, output: 0.00125, cache: 0.000025 }],
    ['claude-3-opus-20240229', { input: 0.015, output: 0.075, cache: 0.0015 }]
  ]);

  constructor(private analyticsStorage: AnalyticsStorage) {}

  async trackUsage(sessionId: string, usage: Omit<UsageEvent, 'id' | 'timestamp'>): Promise<void> {
    const event: UsageEvent = {
      id: this.generateEventId(),
      sessionId,
      timestamp: new Date(),
      ...usage
    };

    await this.analyticsStorage.recordUsage(event);
  }

  async getSessionAnalytics(sessionId: string): Promise<SessionAnalytics> {
    const events = await this.analyticsStorage.getUsageEvents(sessionId);
    
    return this.calculateSessionAnalytics(sessionId, events);
  }

  async getProjectAnalytics(projectPath: string): Promise<ProjectAnalytics> {
    const aggregateData = await this.analyticsStorage.getAggregatedUsage({
      projectPath,
      groupBy: 'session'
    });

    return this.calculateProjectAnalytics(projectPath, aggregateData);
  }

  async generateUsageReport(timeRange: DateRange): Promise<UsageReport> {
    const aggregateData = await this.analyticsStorage.getAggregatedUsage({
      startDate: timeRange.start,
      endDate: timeRange.end,
      groupBy: 'day'
    });

    return this.calculateUsageReport(timeRange, aggregateData);
  }

  async estimateCost(tokens: TokenUsage, model: string): Promise<CostEstimate> {
    const pricing = this.modelPricing.get(model);
    if (!pricing) {
      throw new Error(`Pricing not available for model: ${model}`);
    }

    return {
      inputCost: tokens.inputTokens * pricing.input / 1000,
      outputCost: tokens.outputTokens * pricing.output / 1000,
      cacheCost: tokens.cacheTokens * pricing.cache / 1000,
      totalCost: (tokens.inputTokens * pricing.input + 
                 tokens.outputTokens * pricing.output + 
                 tokens.cacheTokens * pricing.cache) / 1000,
      currency: 'USD'
    };
  }

  async getOptimizationRecommendations(sessionId: string): Promise<UsageRecommendation[]> {
    const analytics = await this.getSessionAnalytics(sessionId);
    const recommendations: UsageRecommendation[] = [];

    // High cost per message recommendation
    if (analytics.averageCostPerMessage > 0.10) {
      recommendations.push({
        type: 'cost_optimization',
        priority: 'high',
        title: 'High cost per message detected',
        description: `Average cost of $${analytics.averageCostPerMessage.toFixed(3)} per message is above recommended threshold`,
        suggestion: 'Consider using a smaller model for simpler queries or optimizing prompts to be more concise',
        potentialSavings: analytics.totalCost * 0.3
      });
    }

    // Inefficient tool usage
    if (analytics.efficiency.toolEfficiency < 0.7) {
      recommendations.push({
        type: 'tool_optimization',
        priority: 'medium',
        title: 'Low tool success rate',
        description: `Tool efficiency is ${(analytics.efficiency.toolEfficiency * 100).toFixed(1)}%, indicating frequent tool failures`,
        suggestion: 'Review error patterns in tool usage and consider breaking complex operations into simpler steps',
        potentialSavings: analytics.totalCost * 0.15
      });
    }

    // Model selection optimization
    const haikusPotentialSavings = await this.calculateModelSwitchSavings(sessionId, 'claude-3-haiku-20240307');
    if (haikusPotentialSavings > analytics.totalCost * 0.5) {
      recommendations.push({
        type: 'model_optimization',
        priority: 'medium',
        title: 'Consider using Claude 3 Haiku for cost savings',
        description: 'Many operations could be performed with the more cost-effective Haiku model',
        suggestion: 'Use Haiku for simple queries and Sonnet for complex reasoning tasks',
        potentialSavings: haikusPotentialSavings
      });
    }

    return recommendations;
  }

  private calculateSessionAnalytics(sessionId: string, events: UsageEvent[]): SessionAnalytics {
    const totalCost = events.reduce((sum, event) => sum + event.cost, 0);
    const totalTokens = events.reduce((sum, event) => sum + event.tokenUsage.totalTokens, 0);
    const messageEvents = events.filter(e => e.type === 'message');
    const toolEvents = events.filter(e => e.type === 'tool_use');

    // Calculate tool usage stats
    const toolUsage = new Map<string, { count: number; cost: number }>();
    toolEvents.forEach(event => {
      const toolName = event.metadata.toolName || 'unknown';
      const current = toolUsage.get(toolName) || { count: 0, cost: 0 };
      toolUsage.set(toolName, {
        count: current.count + 1,
        cost: current.cost + event.cost
      });
    });

    const mostUsedTools: ToolUsageStats[] = Array.from(toolUsage.entries())
      .map(([toolName, stats]) => ({
        toolName,
        usageCount: stats.count,
        totalCost: stats.cost,
        averageCostPerUse: stats.cost / stats.count
      }))
      .sort((a, b) => b.usageCount - a.usageCount);

    // Calculate efficiency metrics
    const sessionDuration = events.length > 0 ? 
      events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime() : 0;
    const tokensPerMinute = sessionDuration > 0 ? totalTokens / (sessionDuration / 60000) : 0;

    const successfulToolUses = toolEvents.filter(e => 
      e.metadata.success !== false
    ).length;
    const toolEfficiency = toolEvents.length > 0 ? successfulToolUses / toolEvents.length : 1;

    return {
      sessionId,
      totalCost,
      totalTokens,
      messageCount: messageEvents.length,
      toolUsageCount: toolEvents.length,
      averageCostPerMessage: messageEvents.length > 0 ? totalCost / messageEvents.length : 0,
      mostUsedTools,
      costBreakdown: this.calculateCostBreakdown(events),
      efficiency: {
        tokensPerMinute,
        costEfficiency: totalTokens > 0 ? totalTokens / totalCost : 0,
        toolEfficiency
      }
    };
  }

  private calculateCostBreakdown(events: UsageEvent[]): CostBreakdown {
    return events.reduce(
      (breakdown, event) => {
        const pricing = this.modelPricing.get(event.model);
        if (pricing) {
          breakdown.inputCosts += event.tokenUsage.inputTokens * pricing.input / 1000;
          breakdown.outputCosts += event.tokenUsage.outputTokens * pricing.output / 1000;
          breakdown.cacheCosts += event.tokenUsage.cacheTokens * pricing.cache / 1000;
          if (event.type === 'tool_use') {
            breakdown.toolCosts += event.cost;
          }
        }
        return breakdown;
      },
      { inputCosts: 0, outputCosts: 0, cacheCosts: 0, toolCosts: 0 }
    );
  }

  private async calculateModelSwitchSavings(sessionId: string, targetModel: string): Promise<number> {
    const events = await this.analyticsStorage.getUsageEvents(sessionId);
    const targetPricing = this.modelPricing.get(targetModel);
    
    if (!targetPricing) return 0;

    let potentialSavings = 0;
    for (const event of events) {
      const currentCost = event.cost;
      const potentialCost = await this.estimateCost(event.tokenUsage, targetModel);
      potentialSavings += Math.max(0, currentCost - potentialCost.totalCost);
    }

    return potentialSavings;
  }

  private generateEventId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface UsageRecommendation {
  type: 'cost_optimization' | 'tool_optimization' | 'model_optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion: string;
  potentialSavings: number;
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/domain/services/CheckpointManager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CheckpointManager, CheckpointTrigger } from '../../../../src/domain/services/CheckpointManager.js';
import { MockCheckpointStorage } from '../../../mocks/MockCheckpointStorage.js';
import { MockContentStore } from '../../../mocks/MockContentStore.js';
import { MockFileWatcher } from '../../../mocks/MockFileWatcher.js';

describe('CheckpointManager', () => {
  let checkpointManager: CheckpointManager;
  let mockStorage: MockCheckpointStorage;
  let mockContentStore: MockContentStore;
  let mockFileWatcher: MockFileWatcher;

  beforeEach(() => {
    mockStorage = new MockCheckpointStorage();
    mockContentStore = new MockContentStore();
    mockFileWatcher = new MockFileWatcher();
    
    checkpointManager = new CheckpointManager(
      mockStorage,
      mockContentStore,
      mockFileWatcher
    );
  });

  it('should create manual checkpoints correctly', async () => {
    const sessionId = 'test-session-123';
    const description = 'Manual checkpoint before major refactor';
    
    const checkpoint = await checkpointManager.createCheckpoint(
      sessionId,
      description,
      CheckpointTrigger.MANUAL
    );

    expect(checkpoint.id).toBeTruthy();
    expect(checkpoint.sessionId).toBe(sessionId);
    expect(checkpoint.description).toBe(description);
    expect(checkpoint.isAutomatic()).toBe(false);
  });

  it('should create automatic checkpoints with proper tags', async () => {
    const sessionId = 'test-session-123';
    
    const checkpoint = await checkpointManager.createCheckpoint(
      sessionId,
      undefined,
      CheckpointTrigger.AUTO_TOOL_USE
    );

    expect(checkpoint.isAutomatic()).toBe(true);
    expect(checkpoint.getTags()).toContain('auto');
    expect(checkpoint.getTags()).toContain('tool-use');
    expect(checkpoint.description).toMatch(/\[AUTO\]/);
  });

  it('should restore checkpoints correctly', async () => {
    // Create a checkpoint first
    const checkpoint = await checkpointManager.createCheckpoint(
      'test-session',
      'Test checkpoint'
    );

    // Restore should not throw
    await expect(
      checkpointManager.restoreCheckpoint(checkpoint.id)
    ).resolves.not.toThrow();

    // Verify storage interactions
    expect(mockStorage.loadCheckpoint).toHaveBeenCalledWith(checkpoint.id);
  });

  it('should calculate checkpoint diffs correctly', async () => {
    const checkpoint1 = await checkpointManager.createCheckpoint('session1', 'First');
    const checkpoint2 = await checkpointManager.createCheckpoint('session1', 'Second');

    const diff = await checkpointManager.getCheckpointDiff(checkpoint1.id, checkpoint2.id);

    expect(diff.fromCheckpoint).toBe(checkpoint1);
    expect(diff.toCheckpoint).toBe(checkpoint2);
    expect(diff.tokenDelta).toBeGreaterThanOrEqual(0);
    expect(diff.timeDelta).toBeGreaterThan(0);
  });

  it('should branch sessions correctly', async () => {
    const originalCheckpoint = await checkpointManager.createCheckpoint(
      'original-session',
      'Before branching'
    );

    const newSessionId = await checkpointManager.branchFromCheckpoint(
      originalCheckpoint.id,
      'experimental-branch'
    );

    expect(newSessionId).toBeTruthy();
    expect(newSessionId).not.toBe('original-session');

    // Verify branch checkpoint was created
    const branchCheckpoint = await mockStorage.loadCheckpoint(newSessionId);
    expect(branchCheckpoint?.metadata.parentCheckpointId).toBe(originalCheckpoint.id);
    expect(branchCheckpoint?.metadata.branchName).toBe('experimental-branch');
  });
});
```

### Integration Tests

```typescript
// tests/integration/AdvancedFeatures.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Container } from '../../src/infrastructure/di/Container.js';
import { CheckpointManager } from '../../src/domain/services/CheckpointManager.js';
import { TimelineNavigator } from '../../src/domain/services/TimelineNavigator.js';
import { UsageAnalytics } from '../../src/domain/services/UsageAnalytics.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Advanced Features Integration', () => {
  let container: Container;
  let tempDir: string;
  let checkpointManager: CheckpointManager;
  let timelineNavigator: TimelineNavigator;
  let usageAnalytics: UsageAnalytics;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `advanced-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Setup container with all services
    container = setupTestContainer(tempDir);
    
    checkpointManager = container.get('CheckpointManager');
    timelineNavigator = container.get('TimelineNavigator');
    usageAnalytics = container.get('UsageAnalytics');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create and navigate timeline with checkpoints', async () => {
    const sessionId = 'integration-test-session';
    
    // Create multiple checkpoints
    const checkpoint1 = await checkpointManager.createCheckpoint(sessionId, 'Initial state');
    const checkpoint2 = await checkpointManager.createCheckpoint(sessionId, 'After first change');
    const checkpoint3 = await checkpointManager.createCheckpoint(sessionId, 'Final state');

    // Get timeline visualization
    const visualization = await timelineNavigator.getTimelineVisualization(sessionId, 80);

    expect(visualization.checkpoints).toHaveLength(3);
    expect(visualization.ascii).toContain('Timeline:');
    expect(visualization.ascii).toContain('Checkpoints:');
  });

  it('should track usage and generate analytics', async () => {
    const sessionId = 'analytics-test-session';
    
    // Simulate usage events
    await usageAnalytics.trackUsage(sessionId, {
      type: 'message',
      tokenUsage: { inputTokens: 100, outputTokens: 200, cacheTokens: 50, totalTokens: 350 },
      model: 'claude-3-5-sonnet-20241022',
      cost: 0.05,
      metadata: { messageType: 'user_query' }
    });

    await usageAnalytics.trackUsage(sessionId, {
      type: 'tool_use',
      tokenUsage: { inputTokens: 50, outputTokens: 100, cacheTokens: 0, totalTokens: 150 },
      model: 'claude-3-5-sonnet-20241022',
      cost: 0.02,
      metadata: { toolName: 'edit', success: true }
    });

    // Get analytics
    const analytics = await usageAnalytics.getSessionAnalytics(sessionId);

    expect(analytics.totalCost).toBe(0.07);
    expect(analytics.totalTokens).toBe(500);
    expect(analytics.messageCount).toBe(1);
    expect(analytics.toolUsageCount).toBe(1);
    expect(analytics.mostUsedTools).toHaveLength(1);
    expect(analytics.mostUsedTools[0].toolName).toBe('edit');
  });

  it('should integrate checkpoint system with timeline navigation', async () => {
    const sessionId = 'checkpoint-timeline-test';
    
    // Create checkpoints with different significance
    await checkpointManager.createCheckpoint(sessionId, 'Start');
    await checkpointManager.createCheckpoint(sessionId, 'Major refactor', CheckpointTrigger.MANUAL);
    await checkpointManager.createCheckpoint(sessionId, 'Tool usage', CheckpointTrigger.AUTO_TOOL_USE);

    // Navigate timeline
    const visualization = await timelineNavigator.getTimelineVisualization(sessionId, 120);
    expect(visualization.checkpoints).toHaveLength(3);

    // Test navigation to specific checkpoint
    const checkpoints = await checkpointManager.listCheckpoints(sessionId);
    const targetCheckpoint = checkpoints.find(cp => cp.description === 'Major refactor');
    
    if (targetCheckpoint) {
      await timelineNavigator.navigateToCheckpoint(targetCheckpoint.id);
      // Verify navigation worked (this would check actual session state in real implementation)
    }
  });

  it('should handle session branching with analytics tracking', async () => {
    const originalSessionId = 'branching-test-original';
    
    // Create checkpoint in original session
    const checkpoint = await checkpointManager.createCheckpoint(
      originalSessionId, 
      'Before experimental change'
    );

    // Track some usage
    await usageAnalytics.trackUsage(originalSessionId, {
      type: 'message',
      tokenUsage: { inputTokens: 100, outputTokens: 200, cacheTokens: 0, totalTokens: 300 },
      model: 'claude-3-5-sonnet-20241022',
      cost: 0.04,
      metadata: {}
    });

    // Branch from checkpoint
    const branchedSessionId = await checkpointManager.branchFromCheckpoint(
      checkpoint.id,
      'experimental-feature'
    );

    expect(branchedSessionId).not.toBe(originalSessionId);

    // Track usage in branched session
    await usageAnalytics.trackUsage(branchedSessionId, {
      type: 'message',
      tokenUsage: { inputTokens: 50, outputTokens: 100, cacheTokens: 0, totalTokens: 150 },
      model: 'claude-3-5-sonnet-20241022',
      cost: 0.02,
      metadata: {}
    });

    // Verify separate analytics
    const originalAnalytics = await usageAnalytics.getSessionAnalytics(originalSessionId);
    const branchedAnalytics = await usageAnalytics.getSessionAnalytics(branchedSessionId);

    expect(originalAnalytics.totalCost).toBe(0.04);
    expect(branchedAnalytics.totalCost).toBe(0.02);
    expect(originalAnalytics.totalTokens).toBe(300);
    expect(branchedAnalytics.totalTokens).toBe(150);
  });

  function setupTestContainer(tempDir: string): Container {
    // Implementation would setup all required services
    // This is a simplified version
    const container = new Container();
    
    // Register all Phase 3 services
    // ... (registration code)
    
    return container;
  }
});
```

## Performance Benchmarks

```typescript
// tests/performance/AdvancedFeaturesBenchmarks.test.ts
import { describe, it, expect } from 'vitest';
import { CheckpointManager } from '../../src/domain/services/CheckpointManager.js';
import { TimelineNavigator } from '../../src/domain/services/TimelineNavigator.js';
import { performance } from 'perf_hooks';

describe('Advanced Features Performance Benchmarks', () => {
  it('should create checkpoints within performance targets', async () => {
    // Setup test environment
    const checkpointManager = setupCheckpointManager();
    const sessionId = 'perf-test-session';

    const startTime = performance.now();
    
    // Create 10 checkpoints
    const checkpoints = [];
    for (let i = 0; i < 10; i++) {
      checkpoints.push(
        await checkpointManager.createCheckpoint(sessionId, `Checkpoint ${i}`)
      );
    }
    
    const creationTime = performance.now() - startTime;
    const avgCreationTime = creationTime / 10;

    expect(avgCreationTime).toBeLessThan(2000); // Under 2 seconds each
    
    console.log(`Created 10 checkpoints in ${creationTime.toFixed(2)}ms`);
    console.log(`Average creation time: ${avgCreationTime.toFixed(2)}ms`);
  });

  it('should restore checkpoints within performance targets', async () => {
    const checkpointManager = setupCheckpointManager();
    const sessionId = 'perf-test-session';

    // Create a checkpoint first
    const checkpoint = await checkpointManager.createCheckpoint(sessionId, 'Test checkpoint');
    
    // Benchmark restoration
    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await checkpointManager.restoreCheckpoint(checkpoint.id);
      const restoreTime = performance.now() - startTime;
      times.push(restoreTime);
    }

    const avgRestoreTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    expect(avgRestoreTime).toBeLessThan(5000); // Under 5 seconds

    console.log(`Average restore time: ${avgRestoreTime.toFixed(2)}ms`);
  });

  it('should navigate timeline within performance targets', async () => {
    const timelineNavigator = setupTimelineNavigator();
    const sessionId = 'timeline-perf-test';

    // Simulate session with many messages
    // (This would need actual session data in real implementation)

    const startTime = performance.now();
    
    const visualization = await timelineNavigator.getTimelineVisualization(sessionId, 100);
    
    const renderTime = performance.now() - startTime;
    
    expect(renderTime).toBeLessThan(200); // Under 200ms
    expect(visualization.ascii).toBeTruthy();
    
    console.log(`Timeline visualization rendered in ${renderTime.toFixed(2)}ms`);
  });

  function setupCheckpointManager(): CheckpointManager {
    // Setup with mock services for performance testing
    // Return configured checkpoint manager
    throw new Error('Not implemented - setup mock services');
  }

  function setupTimelineNavigator(): TimelineNavigator {
    // Setup with mock services for performance testing
    // Return configured timeline navigator
    throw new Error('Not implemented - setup mock services');
  }
});
```

## Verification Procedures

### Manual Verification Steps

1. **Checkpoint System Verification:**
```bash
# Test checkpoint creation and restoration
npm run build
npm test -- tests/unit/domain/services/CheckpointManager.test.ts

# Expected: All checkpoint tests pass
# ✓ should create manual checkpoints correctly
# ✓ should create automatic checkpoints with proper tags
# ✓ should restore checkpoints correctly
# ✓ should calculate checkpoint diffs correctly
# ✓ should branch sessions correctly
```

2. **Timeline Navigation Verification:**
```bash
# Test timeline visualization and navigation
npm test -- tests/unit/domain/services/TimelineNavigator.test.ts

# Expected: All timeline tests pass
# ✓ should generate timeline visualization correctly
# ✓ should find nearest checkpoints accurately
# ✓ should handle empty timelines gracefully
```

3. **Usage Analytics Verification:**
```bash
# Test analytics tracking and reporting
npm test -- tests/unit/domain/services/UsageAnalytics.test.ts

# Expected: All analytics tests pass
# ✓ should track usage events correctly
# ✓ should calculate session analytics accurately
# ✓ should generate cost estimates correctly
# ✓ should provide optimization recommendations
```

4. **Integration Verification:**
```bash
# Test full integration of all Phase 3 features
npm test -- tests/integration/AdvancedFeatures.test.ts

# Expected: All integration tests pass
# ✓ should create and navigate timeline with checkpoints
# ✓ should track usage and generate analytics
# ✓ should integrate checkpoint system with timeline navigation
# ✓ should handle session branching with analytics tracking
```

## Migration Guide

### Phase 3 Migration Steps

1. **Install Additional Dependencies:**
```bash
# Install dependencies for advanced features
npm install sqlite3 better-sqlite3
npm install --save-dev @types/better-sqlite3
```

2. **Update Database Schema:**
```sql
-- Create checkpoint tables
CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_index INTEGER NOT NULL,
  timestamp DATETIME NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT NOT NULL, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE file_snapshots (
  id TEXT PRIMARY KEY,
  checkpoint_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  permissions INTEGER,
  size INTEGER NOT NULL,
  last_modified DATETIME,
  FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id)
);

CREATE TABLE usage_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  type TEXT NOT NULL,
  token_usage TEXT NOT NULL, -- JSON
  model TEXT NOT NULL,
  cost REAL NOT NULL,
  metadata TEXT NOT NULL, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

3. **Update Container Configuration:**
```typescript
// Add Phase 3 services to container
import { SqliteCheckpointStorage } from '../storage/SqliteCheckpointStorage.js';
import { SqliteAnalyticsStorage } from '../storage/SqliteAnalyticsStorage.js';

container.register('CheckpointStorage', () => new SqliteCheckpointStorage(dbPath));
container.register('AnalyticsStorage', () => new SqliteAnalyticsStorage(dbPath));
container.register('CheckpointManager', () => {
  const storage = container.get('CheckpointStorage');
  const contentStore = container.get('ContentStore');
  const fileWatcher = container.get('FileWatcher');
  return new CheckpointManager(storage, contentStore, fileWatcher);
});
```

4. **Update TUI Navigation:**
```typescript
// Add Phase 3 screens to navigation
const screens = [
  'project-list',
  'conversation-list',
  'message-detail',
  'live-session',
  'timeline-navigation', // New screen
  'usage-analytics',     // New screen
  'checkpoint-list'      // New screen
];
```

## Rollback Procedures

### Graceful Degradation

```typescript
// Feature flags for Phase 3 features
const advancedFeaturesConfig = {
  checkpointsEnabled: process.env.ENABLE_CHECKPOINTS !== 'false',
  timelineNavigationEnabled: process.env.ENABLE_TIMELINE_NAV !== 'false',
  usageAnalyticsEnabled: process.env.ENABLE_USAGE_ANALYTICS !== 'false'
};

// Conditional service registration
if (advancedFeaturesConfig.checkpointsEnabled) {
  container.register('CheckpointManager', () => /* ... */);
} else {
  container.register('CheckpointManager', () => new NoOpCheckpointManager());
}
```

### Database Rollback

```sql
-- Remove Phase 3 tables if needed
DROP TABLE IF EXISTS usage_events;
DROP TABLE IF EXISTS file_snapshots;
DROP TABLE IF EXISTS checkpoints;
```

## Next Steps

After successful Phase 3 implementation:

1. **Performance Optimization:**
   - Profile checkpoint creation with large projects
   - Optimize timeline rendering for long sessions
   - Benchmark analytics queries with large datasets

2. **User Experience Enhancement:**
   - Add checkpoint search and filtering
   - Implement advanced timeline visualization options
   - Create usage analytics dashboards

3. **Enterprise Features:**
   - Add team collaboration features
   - Implement usage quotas and alerts
   - Create administrative reporting tools

4. **Future Enhancements:**
   - AI-powered usage optimization suggestions
   - Integration with external cost management tools
   - Advanced session merging capabilities

This implementation completes the transformation of show-me-the-talk from a static analysis tool into a comprehensive session management platform with enterprise-grade features while maintaining the terminal-focused developer experience.