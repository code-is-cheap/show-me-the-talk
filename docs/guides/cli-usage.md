# CLI Usage Guide

> Complete reference for the Show Me The Talk command-line interface

## 🎯 Overview

The CLI provides a simple yet powerful interface to export Claude Code conversations. All commands follow the pattern:

```bash
node dist/presentation/cli/cli.js [options]
```

## 📖 Command Reference

### Basic Syntax

```bash
show-me-the-talk [options]
# or when running from source:
node dist/presentation/cli/cli.js [options]
```

### Global Options

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--format` | `-f` | string | `simple` | Export format: `json`, `markdown`, `simple` |
| `--output` | `-o` | string | `conversations.md` | Output file path |
| `--claude-dir` | `-d` | string | `~/.claude` | Claude directory path |
| `--session` | `-s` | string | - | Export specific session ID |
| `--project` | `-p` | string | - | Export conversations for specific project |
| `--metadata` | `-m` | boolean | `false` | Include conversation metrics |
| `--help` | `-h` | boolean | `false` | Show help message |

## 🎨 Export Formats

### Simple Format (`-f simple`, default)
Clean, readable markdown focused on Q&A pairs.

```bash
node dist/presentation/cli/cli.js -f simple -o conversations.md
```

**Best for**: Sharing, reading, documentation

### JSON Format (`-f json`)
Structured data with full conversation details.

```bash
node dist/presentation/cli/cli.js -f json -o data.json -m
```

**Best for**: Data analysis, integration with other tools

### Markdown Format (`-f markdown`)
Detailed markdown with complete conversation context.

```bash
node dist/presentation/cli/cli.js -f markdown -o detailed.md
```

**Best for**: Comprehensive documentation, archival

## 📝 Common Usage Patterns

### 1. Default Export
```bash
# Simplest possible export
node dist/presentation/cli/cli.js
# Creates: conversations.md (simple format)
```

### 2. Named Output File
```bash
# Custom filename
node dist/presentation/cli/cli.js -o my-ai-conversations.md
```

### 3. With Metadata
```bash
# Include statistics and metrics
node dist/presentation/cli/cli.js -o detailed.md -m
```

### 4. JSON for Analysis
```bash
# Machine-readable format
node dist/presentation/cli/cli.js -f json -o analysis.json -m
```

### 5. Specific Session
```bash
# Export just one conversation
node dist/presentation/cli/cli.js -s "session-id-here" -o session.md
```

### 6. Project-Specific Export
```bash
# Export conversations from one project only
node dist/presentation/cli/cli.js -p "my-project" -o project-talks.md -m
```

### 7. Custom Claude Directory
```bash
# Use different Claude installation
node dist/presentation/cli/cli.js -d "/custom/claude/path" -o custom.md
```

## 🎯 Advanced Examples

### Export All Formats for a Project
```bash
# Create comprehensive documentation
PROJECT="my-important-project"

# Simple format for sharing
node dist/presentation/cli/cli.js -p "$PROJECT" -f simple -o "${PROJECT}-simple.md"

# Detailed format for documentation
node dist/presentation/cli/cli.js -p "$PROJECT" -f markdown -o "${PROJECT}-detailed.md" -m

# JSON for analysis
node dist/presentation/cli/cli.js -p "$PROJECT" -f json -o "${PROJECT}-data.json" -m
```

### Batch Export by Session
```bash
# Export specific sessions (you'd get session IDs from JSON export first)
SESSIONS=("session-1" "session-2" "session-3")

for session in "${SESSIONS[@]}"; do
    node dist/presentation/cli/cli.js -s "$session" -o "session-${session}.md"
done
```

### Development Workflow
```bash
# Daily export for team sharing
DATE=$(date +%Y-%m-%d)
node dist/presentation/cli/cli.js -p "current-project" -o "daily-ai-insights-${DATE}.md" -m
```

## 🔍 Finding Session IDs and Project Names

### List All Sessions
```bash
# Export to JSON to see all available sessions
node dist/presentation/cli/cli.js -f json -o sessions.json -m
# Then search through the JSON for sessionId values
```

### Common Project Name Patterns
Projects are encoded from file paths. Common patterns:
- `/Users/user/project` → `-Users-user-project`
- `/workspace/my-app` → `-workspace-my-app`
- Spaces and special characters are encoded

### Using grep to Find Specific Content
```bash
# Export all conversations then search
node dist/presentation/cli/cli.js -o all.md
grep -n "TypeScript" all.md  # Find TypeScript discussions
grep -n "Session:" all.md    # List all sessions
```

## 📊 Understanding Output

### File Size Expectations
- **Simple format**: ~100-500KB for 10-20 conversations
- **JSON format**: ~1-5MB for 10-20 conversations (includes all metadata)
- **Markdown format**: ~200KB-1MB for 10-20 conversations

### Content Filtering
The tool automatically:
- ✅ Includes meaningful Q&A exchanges
- ✅ Summarizes tool interactions (e.g., "[Viewed: file.ts]")
- ❌ Excludes pure code dumps
- ❌ Filters out system messages
- ❌ Removes sensitive file paths (configurable)

## ⚠️ Error Handling and Troubleshooting

### Common Exit Codes
- `0`: Success
- `1`: Export failed (file permissions, invalid arguments, etc.)

### Verbose Output
All commands show progress information:
```
Reading from: /Users/user/.claude
Output format: simple
Writing to: conversations.md
Found 15 conversation(s)
Successfully exported to: conversations.md
```

### Handling Warnings
The tool may show warnings for:
- Invalid timestamps (files with corrupted dates)
- Empty conversations (files with no content)
- Inaccessible files (permission issues)

These warnings are non-fatal; the tool continues with valid files.

### Debug Mode
For troubleshooting, redirect output to see all messages:
```bash
node dist/presentation/cli/cli.js -o debug.md 2>&1 | tee debug.log
```

## 🎛️ Configuration and Customization

### Environment Variables
You can set default paths:
```bash
export CLAUDE_DIR="/custom/claude/path"
node dist/presentation/cli/cli.js  # Will use custom path
```

### Output Directory Structure
```bash
# Organize exports by date
mkdir -p exports/$(date +%Y-%m)
node dist/presentation/cli/cli.js -o "exports/$(date +%Y-%m)/conversations.md"
```

### Automated Exports
```bash
# Create a daily export script
cat > daily-export.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
OUTPUT_DIR="ai-conversations"
mkdir -p "$OUTPUT_DIR"

echo "Exporting Claude conversations for $DATE..."
node dist/presentation/cli/cli.js -o "$OUTPUT_DIR/conversations-$DATE.md" -m

echo "Export complete: $OUTPUT_DIR/conversations-$DATE.md"
EOF

chmod +x daily-export.sh
```

## 🔗 Integration with Other Tools

### With git
```bash
# Track conversation exports in git
git add conversations.md
git commit -m "docs: export latest AI conversations"
```

### With documentation sites
```bash
# Export for documentation site
node dist/presentation/cli/cli.js -f markdown -o docs/ai-conversations.md -m
```

### With analysis tools
```bash
# Export JSON for analysis
node dist/presentation/cli/cli.js -f json -o data.json -m
python analyze_conversations.py data.json  # Your analysis script
```

## 📋 Quick Reference

### Most Common Commands
```bash
# Basic export
node dist/presentation/cli/cli.js

# Export with metadata
node dist/presentation/cli/cli.js -o talks.md -m

# JSON export
node dist/presentation/cli/cli.js -f json -o data.json -m

# Project-specific
node dist/presentation/cli/cli.js -p "project-name" -o project.md

# Help
node dist/presentation/cli/cli.js --help
```

### File Naming Conventions
- Use descriptive names: `typescript-debugging-session.md`
- Include dates: `conversations-2024-01-15.md`
- Separate by project: `myapp-conversations.md`
- Use format suffix: `analysis-data.json`

---

*Master the CLI to efficiently export and share your Claude Code conversation insights! 🎯*