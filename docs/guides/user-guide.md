# Show Me The Talk - User Guide

## 📖 Overview

Show Me The Talk is a powerful tool for exporting and analyzing your Claude Code conversations. Transform your AI collaboration sessions into beautiful, readable formats with rich metadata and intelligent categorization.

> **"Code is cheap, show me the talk"** - Export your AI collaboration experiences!

## 🚀 Quick Start

### Installation
```bash
npm install -g show-me-the-talk
```

### Basic Usage
```bash
# Export all conversations as enhanced markdown
show-me-the-talk

# Export as beautiful HTML with metadata
show-me-the-talk --format html --metadata --output my-conversations.html

# Export specific project
show-me-the-talk --project my-app --format markdown --output project-summary.md
```

## 🎯 Features

### ✨ Export Formats

#### 📄 Enhanced Markdown
- **Emoji indicators** for different message types
- **Syntax highlighting** for code blocks
- **Structured metadata** and conversation metrics
- **Tool usage tracking** with visual indicators

#### 🌐 Beautiful HTML
- **Responsive design** that works on all devices
- **Interactive navigation** and conversation timeline
- **Professional styling** with modern CSS
- **Syntax highlighting** for code snippets
- **Export metrics dashboard** with charts and statistics

#### 📊 JSON Export
- **Complete data structure** preservation
- **Machine-readable format** for further processing
- **API integration** ready
- **Comprehensive metadata** included

#### 📝 Simplified Markdown
- **Clean, readable format** focused on content
- **Question-answer pairs** clearly separated
- **Minimal formatting** for easy reading
- **Tool interactions** simplified to essential information

### 🔍 Intelligent Analysis

#### 🙋 Question Classification
- **Learning**: Exploring concepts and understanding ideas
- **Implementation**: Building features and solving problems  
- **Debugging**: Troubleshooting and fixing issues
- **Review**: Code review and optimization discussions
- **General**: Miscellaneous conversations

#### 🤖 Response Analysis  
- **Quality scoring** based on depth and usefulness
- **Content type detection** (code-focused, explanatory, mixed)
- **Tool usage patterns** and impact assessment
- **Complexity metrics** for technical discussions

#### 💻 Code Block Intelligence
- **Purpose classification**: Implementation, testing, configuration
- **Language detection** and appropriate highlighting
- **Complexity analysis** from simple snippets to full applications
- **Usage context** understanding

### 📊 Rich Metadata

#### 📈 Conversation Metrics
- **Total conversations** and message counts
- **Average session duration** and message frequency
- **Project distribution** and activity patterns
- **Date range analysis** and temporal trends

#### 🏷️ Categorization
- **Automatic tagging** by conversation type
- **Project-based organization** 
- **Temporal grouping** by date ranges
- **Complexity-based filtering**

## 🛠️ Command Line Interface

### Basic Options
```bash
show-me-the-talk [options]
```

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--format` | `-f` | Export format: json, markdown, simple, html | simple |
| `--output` | `-o` | Output file path | conversations.md |
| `--claude-dir` | `-d` | Claude directory path | ~/.claude |
| `--session` | `-s` | Export specific session ID | - |
| `--project` | `-p` | Export conversations for specific project | - |
| `--metadata` | `-m` | Include conversation metrics | false |
| `--tui` | `-t` | Launch interactive Terminal UI | false |
| `--version` | `-v` | Show version number | - |
| `--help` | `-h` | Show help message | - |

### 📚 Examples

#### Export All Conversations
```bash
# Simple markdown (default)
show-me-the-talk

# Enhanced markdown with metadata
show-me-the-talk --format markdown --metadata

# Beautiful HTML export
show-me-the-talk --format html --output conversations.html
```

#### Project-Specific Exports
```bash
# Export specific project
show-me-the-talk --project my-web-app --output project-analysis.md

# Project export with full metadata
show-me-the-talk --project my-api --format html --metadata --output api-development.html
```

#### Session-Specific Exports
```bash
# Export specific conversation
show-me-the-talk --session abc123-def456 --output session.md

# Detailed session export with metadata
show-me-the-talk --session abc123-def456 --format html --metadata --output detailed-session.html
```

#### Custom Directory
```bash
# Use custom Claude directory
show-me-the-talk --claude-dir /path/to/custom/.claude --format json --output backup.json
```

## 📤 Export Format Details

### 🎨 HTML Export Features

#### Visual Design
- **Modern, clean layout** with professional typography
- **Responsive grid system** that adapts to screen size
- **Color-coded message types** for easy identification
- **Syntax highlighting** using Prism.js color schemes
- **Interactive elements** for better navigation

#### Content Organization
- **Conversation cards** with metadata headers
- **Collapsible sections** for better readability
- **Tool usage indicators** with visual badges
- **Timestamp formatting** in user-friendly format
- **Message grouping** by conversation flow

#### Technical Features
- **XSS protection** with proper HTML escaping
- **Code block formatting** with language detection
- **Emoji support** for enhanced visual communication
- **Print-friendly styles** for physical documentation
- **Accessibility features** for screen readers

### 📝 Enhanced Markdown Features

#### Visual Indicators
- **🙋 User questions** clearly marked with emoji
- **🤖 Assistant responses** with distinct formatting
- **🔧 Tool usage** highlighted with tool names
- **💬 Token usage** displayed for analysis
- **📊 Metrics sections** with structured data

#### Content Structure
- **Hierarchical headers** for easy navigation
- **Code block formatting** with language hints
- **Metadata tables** for conversation statistics
- **Project summaries** with key insights
- **Duration tracking** and session information

### 🔧 JSON Export Structure
```json
{
  "exportDate": "2024-01-01T00:00:00.000Z",
  "format": "json",
  "conversations": [
    {
      "sessionId": "abc123",
      "projectPath": "/path/to/project",
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-01-01T01:00:00.000Z",
      "duration": 3600000,
      "messageCount": 10,
      "messages": [...]
    }
  ],
  "metrics": {
    "totalConversations": 5,
    "totalMessages": 50,
    "averageMessagesPerConversation": 10.0,
    "projectCounts": {...},
    "dateRange": {...}
  }
}
```

## 🎛️ Programmatic Usage

### Basic Library Usage
```typescript
import { ShowMeTheTalk } from 'show-me-the-talk';

const showMeTheTalk = new ShowMeTheTalk('/path/to/.claude');

// Export all conversations
const result = await showMeTheTalk.export({
  format: 'html',
  outputPath: './conversations.html',
  includeMetadata: true
});

console.log(`Exported ${result.conversationCount} conversations`);
```

### Advanced Configuration
```typescript
import { ShowMeTheTalk, ExportConfiguration } from 'show-me-the-talk';

const config = ExportConfiguration.builder()
  .withTimestamps(true)
  .withMetadata(true)
  .withComplexityInfo(true)
  .withHtmlStyling('modern')
  .build();

const showMeTheTalk = new ShowMeTheTalk('/path/to/.claude', config);

// Export with custom configuration
const result = await showMeTheTalk.export({
  format: 'html',
  outputPath: './detailed-export.html',
  includeMetadata: true,
  simplifyToolInteractions: false
});
```

### Getting Metrics
```typescript
// Get conversation metrics
const metrics = await showMeTheTalk.getMetrics();
console.log(`Total conversations: ${metrics.totalConversations}`);
console.log(`Average duration: ${metrics.averageDurationMs}ms`);

// Get categorized conversations
const categorized = await showMeTheTalk.getCategorizedConversations();
console.log(`Learning conversations: ${categorized.learning.length}`);
console.log(`Implementation conversations: ${categorized.implementation.length}`);
```

## 🔍 Filtering and Search

### Project-Based Filtering
```typescript
// Get conversations for specific project
const projectConversations = await showMeTheTalk.getProjectConversations('my-project');

// Export project-specific conversations
await showMeTheTalk.export({
  format: 'markdown',
  outputPath: './project-conversations.md',
  projectPath: 'my-project'
});
```

### Session-Based Access
```typescript
// Get specific conversation
const conversation = await showMeTheTalk.getConversation('session-id');

// Export specific session
await showMeTheTalk.export({
  format: 'html',
  outputPath: './session.html',
  sessionId: 'session-id'
});
```

## 🎯 Use Cases

### 📚 Documentation Generation
- **Project documentation** from development conversations
- **Learning materials** from educational discussions
- **API documentation** from implementation conversations
- **Troubleshooting guides** from debugging sessions

### 📊 Analysis and Insights
- **Development patterns** analysis across projects
- **Learning progress** tracking over time
- **Tool usage statistics** and efficiency metrics
- **Collaboration effectiveness** measurements

### 🎨 Presentation and Sharing
- **Beautiful HTML exports** for sharing with team members
- **Professional documentation** for stakeholders
- **Learning portfolios** for educational purposes
- **Archive creation** for long-term storage

### 🔧 Integration and Automation
- **CI/CD integration** for automated documentation
- **Webhook processing** for real-time exports
- **API integration** with other development tools
- **Custom processing** with JSON exports

## 🚨 Troubleshooting

### Common Issues

#### 🔍 No Conversations Found
```bash
❌ Found 0 conversation(s)
```
**Solutions:**
- Ensure Claude Code has been run and conversations exist
- Check the Claude directory path: `~/.claude/projects/`
- Verify directory permissions are readable
- Use `--claude-dir` to specify custom path

#### 📁 Directory Not Found
```bash
❌ Claude directory not found: /path/to/.claude
```
**Solutions:**
- Run Claude Code at least once to create the directory
- Use `--claude-dir` with correct path
- Check that the directory exists and is accessible

#### 💾 Export Failed
```bash
❌ Export failed: EACCES: permission denied
```
**Solutions:**
- Check output directory write permissions
- Use different output path with `--output`
- Ensure sufficient disk space available

#### 🔧 Module Resolution Errors
```bash
Cannot find module 'ink'
```
**Solutions:**
- Run `npm install` to ensure dependencies are installed
- TUI mode is temporarily disabled, use regular CLI
- Use `--format html` for rich visual output instead

### Performance Tips

#### 🚀 Large Datasets
- Use specific project filtering: `--project my-project`
- Export in JSON format for fastest processing
- Consider session-specific exports for huge datasets

#### 💻 Memory Usage
- Close other applications when processing large exports
- Use SSD storage for better I/O performance
- Monitor system resources during large exports

## 🛡️ Security and Privacy

### Data Safety
- **Local processing only** - no data sent to external servers
- **XSS protection** in HTML exports
- **Path sanitization** for secure file operations
- **Input validation** for all user inputs

### Privacy Considerations
- **Conversation content** remains on your local machine
- **No analytics** or tracking of usage
- **Secure file handling** with proper permissions
- **Clean error messages** without sensitive data exposure

## 📞 Support and Contributing

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Comprehensive guides and examples
- **Community**: Share experiences and get help from other users

### Contributing
- **Feature requests**: Suggest new export formats or features
- **Bug reports**: Help improve reliability and performance
- **Code contributions**: Submit pull requests for enhancements
- **Documentation**: Improve guides and examples

---

**Happy exporting! 🎉**

Transform your Claude Code conversations into beautiful, insightful documentation that showcases your AI collaboration journey.