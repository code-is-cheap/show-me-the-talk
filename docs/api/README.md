# API Reference

> Programmatic interface for the Show Me The Talk library

## 🚀 Overview

Show Me The Talk provides a clean, TypeScript-first API for parsing and exporting Claude Code conversations. The library follows Domain-Driven Design principles with a simple facade for easy integration.

## 📦 Installation & Setup

```typescript
import { ShowMeTheTalk } from 'show-me-the-talk';

// Create instance with default Claude directory
const smtt = new ShowMeTheTalk();

// Or specify custom Claude directory
const smtt = new ShowMeTheTalk('/custom/claude/path');
```

## 🎯 Core API

### ShowMeTheTalk Class

The main facade providing all functionality.

#### Constructor

```typescript
constructor(claudeDir: string = '~/.claude')
```

**Parameters:**
- `claudeDir` (optional): Path to Claude directory. Defaults to `~/.claude`

**Example:**
```typescript
const smtt = new ShowMeTheTalk('/Users/name/.claude');
```

#### Methods

##### getAllConversations()

Retrieve all parsed conversations.

```typescript
async getAllConversations(): Promise<ConversationDto[]>
```

**Returns:** Array of conversation data transfer objects

**Example:**
```typescript
const conversations = await smtt.getAllConversations();
console.log(`Found ${conversations.length} conversations`);

conversations.forEach(conv => {
  console.log(`Session: ${conv.sessionId}`);
  console.log(`Project: ${conv.projectPath}`);
  console.log(`Messages: ${conv.messageCount}`);
});
```

##### getConversation()

Get a specific conversation by session ID.

```typescript
async getConversation(sessionId: string): Promise<ConversationDto | null>
```

**Parameters:**
- `sessionId`: Unique session identifier

**Returns:** Conversation data or null if not found

**Example:**
```typescript
const conversation = await smtt.getConversation('abc123');
if (conversation) {
  console.log(`Found conversation with ${conversation.messageCount} messages`);
}
```

##### getProjectConversations()

Get all conversations for a specific project.

```typescript
async getProjectConversations(projectPath: string): Promise<ConversationDto[]>
```

**Parameters:**
- `projectPath`: Project identifier (usually encoded directory name)

**Returns:** Array of conversations from the specified project

**Example:**
```typescript
const projectTalks = await smtt.getProjectConversations('my-project');
console.log(`Project has ${projectTalks.length} conversations`);
```

##### export()

Export conversations to file in specified format.

```typescript
async export(options: ExportOptions): Promise<ExportResult>
```

**Parameters:**
- `options`: Export configuration object

**Returns:** Export result with success status and metadata

**Example:**
```typescript
const result = await smtt.export({
  format: 'json',
  outputPath: 'conversations.json',
  includeMetadata: true,
  simplifyToolInteractions: true
});

if (result.success) {
  console.log(`Exported ${result.conversationCount} conversations to ${result.outputPath}`);
} else {
  console.error(`Export failed: ${result.error}`);
}
```

##### getMetrics()

Calculate conversation statistics and metrics.

```typescript
async getMetrics(): Promise<ConversationMetrics>
```

**Returns:** Comprehensive conversation metrics

**Example:**
```typescript
const metrics = await smtt.getMetrics();
console.log(`Total conversations: ${metrics.totalConversations}`);
console.log(`Average messages per conversation: ${metrics.averageMessagesPerConversation}`);
console.log(`Projects: ${Object.keys(metrics.projectCounts).length}`);
```

##### getCategorizedConversations()

Get conversations grouped by category.

```typescript
async getCategorizedConversations(): Promise<ConversationCategories>
```

**Returns:** Conversations organized by type (debugging, architecture, etc.)

**Example:**
```typescript
const categorized = await smtt.getCategorizedConversations();
console.log(`Debugging conversations: ${categorized.debugging.length}`);
console.log(`Architecture discussions: ${categorized.architecture.length}`);
console.log(`Learning sessions: ${categorized.learning.length}`);
```

## 📋 Type Definitions

### ExportOptions

Configuration for export operations.

```typescript
interface ExportOptions {
  format: 'json' | 'markdown' | 'simple';
  outputPath: string;
  sessionId?: string;           // Export specific session only
  projectPath?: string;         // Export specific project only
  includeMetadata?: boolean;    // Include metrics in output
  simplifyToolInteractions?: boolean; // Summarize tool usage
}
```

### ExportResult

Result of export operation.

```typescript
interface ExportResult {
  success: boolean;
  outputPath: string;
  conversationCount: number;
  error?: string;
}
```

### ConversationDto

Data transfer object for conversations.

```typescript
interface ConversationDto {
  sessionId: string;
  projectPath: string;
  startTime: string;            // ISO date string
  endTime?: string;             // ISO date string
  messageCount: number;
  duration: number;             // Milliseconds
  messages: MessageDto[];
}
```

### MessageDto

Data transfer object for messages.

```typescript
interface MessageDto {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;            // ISO date string
  parentId?: string;
  metadata?: any;               // Tool usage, token counts, etc.
}
```

### ConversationMetrics

Statistical information about conversations.

```typescript
interface ConversationMetrics {
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  averageDurationMs: number;
  projectCounts: Record<string, number>;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}
```

### ConversationCategories

Conversations grouped by type.

```typescript
interface ConversationCategories {
  debugging: ConversationDto[];
  architecture: ConversationDto[];
  implementation: ConversationDto[];
  refactoring: ConversationDto[];
  learning: ConversationDto[];
  other: ConversationDto[];
}
```

## 🎨 Usage Examples

### Basic Data Analysis

```typescript
import { ShowMeTheTalk } from 'show-me-the-talk';

async function analyzeConversations() {
  const smtt = new ShowMeTheTalk();
  
  // Get overview
  const metrics = await smtt.getMetrics();
  console.log('📊 Conversation Overview:');
  console.log(`  Total conversations: ${metrics.totalConversations}`);
  console.log(`  Total messages: ${metrics.totalMessages}`);
  console.log(`  Average duration: ${Math.round(metrics.averageDurationMs / 60000)} minutes`);
  
  // Analyze by category
  const categorized = await smtt.getCategorizedConversations();
  console.log('\n🏷️ By Category:');
  Object.entries(categorized).forEach(([category, conversations]) => {
    console.log(`  ${category}: ${conversations.length} conversations`);
  });
  
  // Find most active projects
  console.log('\n📁 Top Projects:');
  const sortedProjects = Object.entries(metrics.projectCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  sortedProjects.forEach(([project, count]) => {
    console.log(`  ${project}: ${count} conversations`);
  });
}

analyzeConversations().catch(console.error);
```

### Custom Export Processing

```typescript
import { ShowMeTheTalk } from 'show-me-the-talk';

async function createCustomReport() {
  const smtt = new ShowMeTheTalk();
  
  // Get conversations from last month
  const allConversations = await smtt.getAllConversations();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const recentConversations = allConversations.filter(conv => {
    const startTime = new Date(conv.startTime);
    return startTime > lastMonth;
  });
  
  // Export recent conversations
  const result = await smtt.export({
    format: 'markdown',
    outputPath: 'recent-conversations.md',
    includeMetadata: true
  });
  
  // Create summary
  const summary = {
    period: 'Last 30 days',
    totalConversations: recentConversations.length,
    totalMessages: recentConversations.reduce((sum, conv) => sum + conv.messageCount, 0),
    projects: [...new Set(recentConversations.map(conv => conv.projectPath))],
    exportedTo: result.outputPath
  };
  
  console.log('📈 Monthly Report:', JSON.stringify(summary, null, 2));
}

createCustomReport().catch(console.error);
```

### Integration with Documentation

```typescript
import { ShowMeTheTalk } from 'show-me-the-talk';
import { writeFileSync } from 'fs';

async function generateProjectDocs(projectName: string) {
  const smtt = new ShowMeTheTalk();
  
  // Get project conversations
  const conversations = await smtt.getProjectConversations(projectName);
  
  if (conversations.length === 0) {
    console.log(`No conversations found for project: ${projectName}`);
    return;
  }
  
  // Categorize for documentation
  const categorized = await smtt.getCategorizedConversations();
  const projectCategories = Object.fromEntries(
    Object.entries(categorized).map(([category, convs]) => [
      category,
      convs.filter(conv => conv.projectPath.includes(projectName))
    ])
  );
  
  // Generate table of contents
  const toc = Object.entries(projectCategories)
    .filter(([, convs]) => convs.length > 0)
    .map(([category, convs]) => `- [${category}](#${category}) (${convs.length} conversations)`)
    .join('\n');
  
  // Create documentation
  const documentation = `
# AI Conversations - ${projectName}

## Overview
This document contains ${conversations.length} AI conversations from the ${projectName} project.

## Table of Contents
${toc}

---

*Generated by Show Me The Talk*
`;
  
  writeFileSync(`${projectName}-ai-docs.md`, documentation);
  
  // Export detailed conversations
  await smtt.export({
    format: 'markdown',
    outputPath: `${projectName}-conversations.md`,
    projectPath: projectName,
    includeMetadata: true
  });
  
  console.log(`✅ Generated documentation for ${projectName}`);
}

generateProjectDocs('my-project').catch(console.error);
```

### Error Handling

```typescript
import { ShowMeTheTalk } from 'show-me-the-talk';

async function robustExport() {
  try {
    const smtt = new ShowMeTheTalk();
    
    // Validate Claude directory exists
    const conversations = await smtt.getAllConversations();
    if (conversations.length === 0) {
      console.warn('No conversations found. Check Claude directory path.');
      return;
    }
    
    // Attempt export with error handling
    const result = await smtt.export({
      format: 'json',
      outputPath: 'backup-conversations.json',
      includeMetadata: true
    });
    
    if (!result.success) {
      console.error(`Export failed: ${result.error}`);
      // Could implement retry logic, alternative paths, etc.
      return;
    }
    
    console.log(`✅ Successfully exported ${result.conversationCount} conversations`);
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Unexpected error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
  }
}

robustExport();
```

## 🔧 Advanced Usage

### Custom Data Processing

```typescript
async function processConversations() {
  const smtt = new ShowMeTheTalk();
  const conversations = await smtt.getAllConversations();
  
  // Process conversations with custom logic
  const insights = conversations.map(conv => ({
    sessionId: conv.sessionId,
    project: conv.projectPath,
    complexity: conv.messageCount > 20 ? 'high' : 'low',
    hasErrorHandling: conv.messages.some(msg => 
      msg.content.toLowerCase().includes('error') ||
      msg.content.toLowerCase().includes('exception')
    ),
    topics: extractTopics(conv.messages),
    duration: conv.duration
  }));
  
  return insights;
}

function extractTopics(messages: MessageDto[]): string[] {
  const topics = new Set<string>();
  const topicKeywords = {
    'typescript': ['typescript', 'ts', 'type'],
    'testing': ['test', 'spec', 'jest', 'vitest'],
    'architecture': ['architecture', 'design', 'pattern'],
    'debugging': ['debug', 'error', 'bug', 'fix']
  };
  
  messages.forEach(msg => {
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => 
        msg.content.toLowerCase().includes(keyword)
      )) {
        topics.add(topic);
      }
    });
  });
  
  return Array.from(topics);
}
```

---

*Build powerful integrations with the Show Me The Talk API! 🛠️*