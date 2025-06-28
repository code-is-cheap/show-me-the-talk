# Export Formats Guide

> Understanding the different output formats available in Show Me The Talk

## 🎨 Format Overview

Show Me The Talk supports three main export formats, each optimized for different use cases:

| Format | Best For | Size | Human Readable | Machine Readable |
|--------|----------|------|----------------|------------------|
| **Simple** | Sharing, documentation | Small | ⭐⭐⭐ | ⭐ |
| **Markdown** | Comprehensive docs | Medium | ⭐⭐⭐ | ⭐⭐ |
| **JSON** | Data analysis, integration | Large | ⭐ | ⭐⭐⭐ |

## 📝 Simple Format (Default)

Clean, focused markdown that emphasizes the conversation content over technical details.

### Usage
```bash
node dist/presentation/cli/cli.js -f simple -o conversations.md
# or (simple is default)
node dist/presentation/cli/cli.js -o conversations.md
```

### Structure
```markdown
# Claude Code Conversations (Simplified)

Exported on: 2024-01-15T10:30:00Z

## /Users/username/projects/my-app

Session: abc123-def456

### Q: How do I handle async errors in TypeScript?

**A**: For robust async error handling in TypeScript, I recommend...

[Viewed: src/utils/errors.ts]
[Edit: src/utils/errors.ts]

### Q: Can you help optimize this function?

**A**: I can see several opportunities for improvement...
```

### Features
- ✅ **Q&A Focus**: Highlights questions and answers
- ✅ **Tool Summaries**: "[Viewed: file.ts]" instead of full content
- ✅ **Clean Reading**: Optimized for human consumption
- ✅ **Small Size**: Minimal metadata
- ❌ **Limited Metadata**: No detailed timestamps or token counts

### When to Use
- Sharing with team members
- Creating documentation
- Blog posts or articles
- Quick reviews of conversations

## 📄 Markdown Format

Comprehensive markdown with full conversation details and context.

### Usage
```bash
node dist/presentation/cli/cli.js -f markdown -o detailed.md
```

### Structure
```markdown
# Claude Code Conversations

Exported on: 2024-01-15T10:30:00Z

Total conversations: 5
Total messages: 67
Average duration: 18 minutes

---

## Session: abc123-def456

**Project**: /Users/username/projects/my-app  
**Start Time**: 2024-01-15T09:15:00Z  
**End Time**: 2024-01-15T09:33:00Z  
**Duration**: 18 minutes  
**Messages**: 14

### Message 1 - User (09:15:23)

How do I handle async errors in TypeScript?

### Message 2 - Assistant (09:15:45)

For robust async error handling in TypeScript, I recommend using a combination of try-catch blocks and proper error types...

**Model**: claude-3-opus  
**Token Usage**: 45 input, 127 output

### Message 3 - User (09:16:12)

[Tool Result: Read - src/utils/errors.ts]
```

### Features
- ✅ **Complete Context**: All message details
- ✅ **Full Timestamps**: Precise timing information
- ✅ **Tool Details**: Complete tool interaction logs
- ✅ **Token Counts**: Usage statistics
- ✅ **Model Info**: Which Claude model was used
- ❌ **Verbose**: Can be overwhelming for quick reading

### When to Use
- Comprehensive documentation
- Detailed analysis
- Archival purposes
- Debugging conversation issues

## 🔧 JSON Format

Machine-readable structured data with complete conversation information.

### Usage
```bash
node dist/presentation/cli/cli.js -f json -o data.json -m
```

### Structure
```json
{
  "exportDate": "2024-01-15T10:30:00Z",
  "format": "json",
  "conversations": [
    {
      "sessionId": "abc123-def456",
      "projectPath": "/Users/username/projects/my-app",
      "startTime": "2024-01-15T09:15:00Z",
      "endTime": "2024-01-15T09:33:00Z",
      "messageCount": 14,
      "duration": 1080000,
      "messages": [
        {
          "id": "msg-001",
          "type": "user",
          "content": "How do I handle async errors in TypeScript?",
          "timestamp": "2024-01-15T09:15:23Z",
          "parentId": null,
          "metadata": null
        },
        {
          "id": "msg-002", 
          "type": "assistant",
          "content": "For robust async error handling...",
          "timestamp": "2024-01-15T09:15:45Z",
          "parentId": "msg-001",
          "metadata": {
            "model": "claude-3-opus",
            "usage": {
              "inputTokens": 45,
              "outputTokens": 127,
              "totalTokens": 172
            },
            "toolUses": []
          }
        }
      ]
    }
  ],
  "metrics": {
    "totalConversations": 5,
    "totalMessages": 67,
    "averageMessagesPerConversation": 13.4,
    "averageDurationMs": 1080000,
    "projectCounts": {
      "/Users/username/projects/my-app": 3,
      "/Users/username/projects/library": 2
    },
    "dateRange": {
      "earliest": "2024-01-10T14:20:00Z",
      "latest": "2024-01-15T09:33:00Z"
    }
  }
}
```

### Features
- ✅ **Complete Data**: Everything preserved
- ✅ **Structured**: Easy to parse programmatically
- ✅ **Metrics**: Comprehensive statistics (with `-m` flag)
- ✅ **Extensible**: Easy to add new fields
- ❌ **Not Human Friendly**: Requires tools to read
- ❌ **Large Files**: Can be several MB for many conversations

### When to Use
- Data analysis and visualization
- Integration with other tools
- Backup and archival
- Building dashboards
- Feeding into AI/ML pipelines

## 🎯 Choosing the Right Format

### Decision Matrix

| Use Case | Recommended Format | Why |
|----------|-------------------|-----|
| Share with team | Simple | Easy to read, focused content |
| Blog post | Simple | Clean, quote-friendly |
| Documentation site | Markdown | Complete but readable |
| Data analysis | JSON | Structured, queryable |
| Backup | JSON | Complete data preservation |
| Quick review | Simple | Fast scanning |
| Detailed audit | Markdown | Full context |
| Dashboard | JSON | Programmatic access |

### Size Comparison

For 10 conversations (~150 messages):
- **Simple**: ~50-100 KB
- **Markdown**: ~100-300 KB  
- **JSON**: ~500KB-2MB (with metadata)

## 🔧 Format-Specific Options

### Metadata Flag (`-m`)

The metadata flag affects different formats differently:

#### Simple Format + Metadata
```markdown
# Claude Code Conversations (Simplified)

## Conversation Metrics

- **Total Conversations**: 5
- **Total Messages**: 67
- **Average Duration**: 18 minutes
- **Date Range**: Jan 10 - Jan 15, 2024

## Project Breakdown

| Project | Conversations | Messages |
|---------|---------------|----------|
| my-app  | 3            | 45       |
| library | 2            | 22       |

---

[Regular simple format content follows...]
```

#### Markdown Format + Metadata
- Adds detailed statistics section at top
- Includes token usage for each message
- Shows model information
- Project breakdown tables

#### JSON Format + Metadata
- Always includes `metrics` object
- Complete statistical analysis
- Project counts and date ranges

### Tool Interaction Handling

#### Simple Format
```markdown
[Viewed: src/components/Button.tsx]
[Edit: src/components/Button.tsx]
[Created: tests/Button.test.ts]
```

#### Markdown Format
```markdown
### Tool Interaction: Read File
**File**: src/components/Button.tsx  
**Tool ID**: tool_abc123  
**Status**: Success

[File content shown in conversation...]
```

#### JSON Format
```json
{
  "toolUses": [
    {
      "id": "tool_abc123",
      "name": "Read",
      "input": {
        "file_path": "src/components/Button.tsx"
      }
    }
  ]
}
```

## 🎨 Customization Examples

### Custom Processing

```typescript
// Example: Extract only learning conversations
const smtt = new ShowMeTheTalk();
const categorized = await smtt.getCategorizedConversations();

// Export only learning sessions
await smtt.export({
  format: 'simple',
  outputPath: 'learning-sessions.md',
  includeMetadata: false
});

// Then filter the output programmatically...
```

### Batch Export
```bash
# Export all formats for comprehensive documentation
PROJECT="my-project"

node dist/presentation/cli/cli.js -p "$PROJECT" -f simple -o "${PROJECT}-simple.md"
node dist/presentation/cli/cli.js -p "$PROJECT" -f markdown -o "${PROJECT}-detailed.md" -m
node dist/presentation/cli/cli.js -p "$PROJECT" -f json -o "${PROJECT}-data.json" -m
```

### Pipeline Integration
```bash
# Export JSON for analysis pipeline
node dist/presentation/cli/cli.js -f json -o conversations.json -m

# Process with jq
jq '.conversations[] | select(.messageCount > 10)' conversations.json > complex-conversations.json

# Convert back to readable format
# [Your custom processing script here]
```

## 🔍 Format Examples with Real Data

### Sample Simple Output
```markdown
### Q: I'm getting a TypeScript error when trying to use async/await with Promise.all

**A**: This error typically occurs when TypeScript can't infer the return type of your Promise.all call. Let me help you fix this...

[Viewed: src/utils/api.ts]

The issue is in your type annotations. Here's the corrected version...

### Q: How can I make this more type-safe?

**A**: Great question! We can improve type safety by using generics and proper return type annotations...
```

### Sample JSON Output (Excerpt)
```json
{
  "sessionId": "real-session-123",
  "projectPath": "/Users/dev/typescript-api",
  "messageCount": 8,
  "duration": 720000,
  "messages": [
    {
      "type": "user",
      "content": "I'm getting a TypeScript error when trying to use async/await with Promise.all",
      "timestamp": "2024-01-15T10:15:00Z"
    },
    {
      "type": "assistant", 
      "content": "This error typically occurs when TypeScript can't infer...",
      "metadata": {
        "model": "claude-3-opus",
        "usage": { "inputTokens": 23, "outputTokens": 156 }
      }
    }
  ]
}
```

---

*Choose the right format for your use case and make the most of your Claude Code conversation exports! 🎯*