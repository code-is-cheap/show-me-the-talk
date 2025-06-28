# Getting Started with Show Me The Talk

> Transform your Claude Code conversations into shareable insights

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Claude Code with some conversation history
- Basic familiarity with command line

### Installation

```bash
# Clone or download the project
cd show-me-the-talk

# Install dependencies
npm install

# Build the project
npm run build
```

### Your First Export

```bash
# Export all conversations to a simple markdown file
node dist/presentation/cli/cli.js -o my-conversations.md

# Check the result
head -20 my-conversations.md
```

That's it! You now have a readable summary of your Claude Code conversations.

## 📁 Understanding Your Claude Data

Claude Code stores conversations in `~/.claude/projects/` with this structure:

```
~/.claude/
├── projects/
│   ├── -project-name-1/
│   │   └── session-id.jsonl
│   ├── -project-name-2/
│   │   └── another-session.jsonl
│   └── ...
```

Show Me The Talk automatically discovers and parses all these files.

## 🎯 Basic Usage Patterns

### 1. Simple Export (Default)

```bash
# Creates conversations.md in current directory
node dist/presentation/cli/cli.js
```

**Output**: Simplified markdown with Q&A pairs, tool interactions summarized.

### 2. Export with Metadata

```bash
# Include conversation metrics and statistics
node dist/presentation/cli/cli.js -o detailed.md -m
```

**Output**: Same content plus conversation counts, duration, project breakdown.

### 3. JSON Export for Processing

```bash
# Machine-readable format for further analysis
node dist/presentation/cli/cli.js -f json -o data.json -m
```

**Output**: Structured JSON with all conversation data and metadata.

### 4. Specific Project Export

```bash
# Export only conversations from one project
node dist/presentation/cli/cli.js -p "my-project-name" -o project.md
```

**Output**: Filtered conversations from the specified project only.

## 📊 What Gets Exported?

### Included ✅
- **Questions you asked** Claude
- **Claude's responses** and explanations
- **Tool interactions** (summarized as "[Viewed: file.ts]")
- **Project context** and session information
- **Timestamps** and conversation flow
- **Conversation categories** (debugging, architecture, etc.)

### Filtered Out ❌
- Raw code changes (focuses on the conversation)
- System messages and internal data
- Personal file paths (can be configured)
- Tool implementation details

## 🎨 Output Examples

### Simple Format
```markdown
## Session: abc123
**Project**: /my/project  
**Duration**: 15 minutes

### Q: How do I implement error handling in TypeScript?

**A**: For robust error handling in TypeScript, I recommend...

[Viewed: src/utils/errors.ts]

### Q: Can you help me refactor this function?

**A**: I can see several opportunities for improvement...
```

### JSON Format
```json
{
  "exportDate": "2024-01-15T10:30:00Z",
  "conversations": [{
    "sessionId": "abc123",
    "projectPath": "/my/project", 
    "messageCount": 12,
    "duration": 900000,
    "messages": [...]
  }],
  "metrics": {
    "totalConversations": 5,
    "averageMessagesPerConversation": 8.4
  }
}
```

## 🔧 Common Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--format` | `-f` | Output format | `-f json` |
| `--output` | `-o` | Output file | `-o talks.md` |
| `--metadata` | `-m` | Include stats | `-m` |
| `--session` | `-s` | Specific session | `-s abc123` |
| `--project` | `-p` | Specific project | `-p myproject` |
| `--help` | `-h` | Show help | `-h` |

## ✅ Verify Your Setup

Run this test to ensure everything works:

```bash
# Test command that should always work
node dist/presentation/cli/cli.js --help

# Test with your data (creates test-export.md)
node dist/presentation/cli/cli.js -o test-export.md

# Check the result
ls -la test-export.md
head -10 test-export.md
```

## 🎯 Next Steps

Once you have the basics working:

1. **[Learn CLI commands](./cli-usage.md)** - Explore all available options
2. **[Understanding formats](./export-formats.md)** - Choose the right output format
3. **[See examples](../examples/basic-usage.md)** - Real-world usage patterns
4. **[API usage](../api/README.md)** - Use as a library in your code

## ❓ Troubleshooting

### "No conversations found"
- Check that `~/.claude/projects/` exists and has `.jsonl` files
- Verify Claude Code has been used and has saved conversations

### "Invalid time value" errors
- Some conversation files may have corrupted timestamps
- The tool will skip these and continue with valid files
- Check console output for which files are being skipped

### "Module not found" errors
- Run `npm run build` to ensure TypeScript is compiled
- Check that you're in the project root directory

### Permission errors
- Ensure you have read access to `~/.claude/` directory
- Try with a different output location if needed

---

*Ready to share your AI collaboration stories? Let's export those conversations! 🚀*