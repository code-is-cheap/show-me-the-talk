# Basic Usage Examples

> Real-world examples of using Show Me The Talk for common scenarios

## 🎯 Quick Start Examples

### 1. Export All Conversations

**Scenario**: You want to export all your Claude Code conversations for documentation.

```bash
# Export to simple markdown format
node dist/presentation/cli/cli.js -o all-conversations.md

# Check the result
head -20 all-conversations.md
```

**Expected Output**:
```markdown
# Claude Code Conversations (Simplified)

Exported on: 2024-01-15T10:30:00Z

## /Users/username/projects/my-app

Session: abc123-def456

### Q: How do I implement error handling in TypeScript?

**A**: For robust error handling in TypeScript, I recommend using...

[Viewed: src/utils/errors.ts]
[Edit: src/utils/errors.ts]

### Q: Can you help me optimize this function?
```

### 2. Export with Metadata for Analysis

**Scenario**: You want to include statistics about your AI collaboration patterns.

```bash
# Export with comprehensive metadata
node dist/presentation/cli/cli.js -o analysis.md -m
```

**Expected Output** (additional sections):
```markdown
# Conversation Metrics

- **Total Conversations**: 15
- **Total Messages**: 247
- **Average Messages per Conversation**: 16.5
- **Average Duration**: 23 minutes
- **Date Range**: 2024-01-01 to 2024-01-15

## Project Breakdown

| Project | Conversations | Messages |
|---------|---------------|----------|
| my-app  | 8            | 134      |
| library | 4            | 67       |
| docs    | 3            | 46       |
```

### 3. Export Specific Project

**Scenario**: You're documenting a specific project and want only those conversations.

```bash
# Find project name first (from JSON export)
node dist/presentation/cli/cli.js -f json -o temp.json | grep projectPath

# Export specific project
node dist/presentation/cli/cli.js -p "my-app" -o my-app-conversations.md -m
```

## 📊 Data Analysis Examples

### 4. JSON Export for Data Science

**Scenario**: You want to analyze your conversation patterns programmatically.

```bash
# Export comprehensive JSON data
node dist/presentation/cli/cli.js -f json -o data.json -m
```

**Use the JSON data**:
```python
import json
import pandas as pd
from datetime import datetime

# Load conversation data
with open('data.json', 'r') as f:
    data = json.load(f)

# Convert to DataFrame for analysis
conversations = pd.DataFrame(data['conversations'])
conversations['startTime'] = pd.to_datetime(conversations['startTime'])
conversations['duration_minutes'] = conversations['duration'] / 60000

# Analyze conversation patterns
print("Conversation Statistics:")
print(f"Average duration: {conversations['duration_minutes'].mean():.1f} minutes")
print(f"Most active day: {conversations['startTime'].dt.day_name().mode()[0]}")

# Project activity
project_stats = conversations.groupby('projectPath').agg({
    'messageCount': ['count', 'sum', 'mean'],
    'duration_minutes': ['sum', 'mean']
}).round(1)

print("\nProject Activity:")
print(project_stats)
```

### 5. Filter by Time Period

**Scenario**: You want conversations from the last month only.

```typescript
import { ShowMeTheTalk } from 'show-me-the-talk';

async function getRecentConversations() {
  const smtt = new ShowMeTheTalk();
  const allConversations = await smtt.getAllConversations();
  
  // Filter last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentConversations = allConversations.filter(conv => {
    const startTime = new Date(conv.startTime);
    return startTime > thirtyDaysAgo;
  });
  
  console.log(`Found ${recentConversations.length} conversations in the last 30 days`);
  
  // Export recent conversations
  await smtt.export({
    format: 'markdown',
    outputPath: 'recent-conversations.md',
    includeMetadata: true
  });
}
```

## 🎭 Presentation Examples

### 6. Create Team Documentation

**Scenario**: Share AI collaboration insights with your team.

```bash
# Create team-friendly documentation
node dist/presentation/cli/cli.js -f markdown -o team-ai-sessions.md -m

# Add to your docs directory
mv team-ai-sessions.md docs/ai-collaboration.md
```

**Add context with custom header**:
```bash
cat > docs/ai-collaboration.md << 'EOF'
# AI Collaboration Sessions

This document contains insights from our team's Claude Code sessions, focusing on problem-solving approaches and AI collaboration techniques.

## Key Learnings
- How we approach complex debugging sessions
- Effective prompting strategies we've discovered
- Architecture decisions made with AI assistance

---

EOF

# Append the exported content
node dist/presentation/cli/cli.js -f markdown -o temp.md -m
cat temp.md >> docs/ai-collaboration.md
rm temp.md
```

### 7. Blog Post Generation

**Scenario**: Create content for a blog post about AI-assisted development.

```typescript
import { ShowMeTheTalk } from 'show-me-the-talk';

async function generateBlogContent() {
  const smtt = new ShowMeTheTalk();
  
  // Get categorized conversations
  const categorized = await smtt.getCategorizedConversations();
  
  // Focus on learning sessions for blog content
  const learningInsights = categorized.learning.slice(0, 3); // Top 3
  
  let blogContent = `# My Journey with AI-Assisted Development

Over the past month, I've been using Claude Code to accelerate my development workflow. Here are some key insights from ${learningInsights.length} learning sessions:

`;

  // Generate content for each learning session
  learningInsights.forEach((conv, index) => {
    blogContent += `
## Insight ${index + 1}: ${conv.projectPath.split('/').pop()}

**Duration**: ${Math.round(conv.duration / 60000)} minutes  
**Messages**: ${conv.messageCount}

This session focused on... [manually add context]

`;
  });

  // Export detailed conversations for reference
  await smtt.export({
    format: 'simple',
    outputPath: 'blog-reference.md',
    includeMetadata: false
  });

  console.log('Blog content template generated!');
  console.log('Reference material: blog-reference.md');
}
```

## 🔍 Discovery and Exploration

### 8. Find Interesting Conversations

**Scenario**: Discover your most complex or interesting AI collaboration sessions.

```typescript
import { ShowMeTheTalk } from 'show-me-the-talk';

async function findInterestingConversations() {
  const smtt = new ShowMeTheTalk();
  const conversations = await smtt.getAllConversations();
  
  // Find complex conversations (many messages)
  const complex = conversations
    .filter(conv => conv.messageCount > 20)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5);
  
  console.log('🧠 Most Complex Conversations:');
  complex.forEach(conv => {
    console.log(`  Session: ${conv.sessionId.slice(0, 8)}...`);
    console.log(`  Project: ${conv.projectPath}`);
    console.log(`  Messages: ${conv.messageCount}`);
    console.log(`  Duration: ${Math.round(conv.duration / 60000)}min`);
    console.log('');
  });
  
  // Find long conversations (time-wise)
  const lengthy = conversations
    .filter(conv => conv.duration > 30 * 60 * 1000) // 30 minutes
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);
  
  console.log('⏰ Longest Conversations:');
  lengthy.forEach(conv => {
    console.log(`  Session: ${conv.sessionId.slice(0, 8)}...`);
    console.log(`  Duration: ${Math.round(conv.duration / 60000)} minutes`);
    console.log(`  Messages: ${conv.messageCount}`);
    console.log('');
  });
  
  // Export these interesting conversations
  const interestingSessionIds = [
    ...complex.map(c => c.sessionId),
    ...lengthy.map(c => c.sessionId)
  ];
  
  for (const sessionId of interestingSessionIds.slice(0, 3)) {
    await smtt.export({
      format: 'markdown',
      outputPath: `interesting-${sessionId.slice(0, 8)}.md`,
      sessionId: sessionId,
      includeMetadata: true
    });
  }
}
```

### 9. Project Comparison

**Scenario**: Compare AI usage across different projects.

```typescript
async function compareProjects() {
  const smtt = new ShowMeTheTalk();
  const metrics = await smtt.getMetrics();
  const categorized = await smtt.getCategorizedConversations();
  
  // Analyze by project
  const projectAnalysis = Object.entries(metrics.projectCounts)
    .map(([project, count]) => {
      const projectConversations = Object.values(categorized)
        .flat()
        .filter(conv => conv.projectPath === project);
      
      const totalMessages = projectConversations.reduce(
        (sum, conv) => sum + conv.messageCount, 0
      );
      
      const averageDuration = projectConversations.reduce(
        (sum, conv) => sum + conv.duration, 0
      ) / projectConversations.length / 60000; // minutes
      
      const categories = Object.entries(categorized)
        .reduce((acc, [category, convs]) => {
          acc[category] = convs.filter(conv => conv.projectPath === project).length;
          return acc;
        }, {} as Record<string, number>);
      
      return {
        project: project.split('/').pop() || project,
        conversations: count,
        totalMessages,
        avgDuration: Math.round(averageDuration),
        categories
      };
    })
    .sort((a, b) => b.conversations - a.conversations);
  
  console.log('📊 Project Comparison:');
  console.table(projectAnalysis);
  
  // Export detailed analysis
  const analysisContent = `# Project AI Usage Analysis

Generated on: ${new Date().toISOString()}

${projectAnalysis.map(proj => `
## ${proj.project}

- **Conversations**: ${proj.conversations}
- **Total Messages**: ${proj.totalMessages}  
- **Avg Duration**: ${proj.avgDuration} minutes
- **Primary Categories**: ${Object.entries(proj.categories)
    .filter(([, count]) => count > 0)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([cat, count]) => `${cat} (${count})`)
    .join(', ')}
`).join('')}

---
*Generated by Show Me The Talk*
`;

  require('fs').writeFileSync('project-analysis.md', analysisContent);
  console.log('📄 Detailed analysis saved to: project-analysis.md');
}
```

## 🛠️ Integration Examples

### 10. Daily Export Automation

**Scenario**: Automatically export new conversations daily.

```bash
#!/bin/bash
# daily-export.sh

DATE=$(date +%Y-%m-%d)
OUTPUT_DIR="ai-exports"
mkdir -p "$OUTPUT_DIR"

echo "🤖 Daily AI Conversation Export - $DATE"

# Export today's conversations (you'd need custom filtering)
node dist/presentation/cli/cli.js -o "$OUTPUT_DIR/conversations-$DATE.md" -m

# Backup to JSON as well
node dist/presentation/cli/cli.js -f json -o "$OUTPUT_DIR/conversations-$DATE.json" -m

# Add to git if in a repository
if [ -d .git ]; then
    git add "$OUTPUT_DIR/"
    git commit -m "docs: daily AI conversation export $DATE" || echo "No new conversations to commit"
fi

echo "✅ Export complete: $OUTPUT_DIR/conversations-$DATE.md"
```

### 11. Integration with Documentation Site

**Scenario**: Include AI conversations in your documentation site.

```javascript
// docs-integration.js
const { ShowMeTheTalk } = require('./dist/ShowMeTheTalk');
const fs = require('fs');
const path = require('path');

async function updateDocumentation() {
  const smtt = new ShowMeTheTalk();
  
  // Export conversations for documentation
  await smtt.export({
    format: 'markdown',
    outputPath: 'docs/ai-conversations.md',
    includeMetadata: true
  });
  
  // Create navigation entry
  const navEntry = `
- [AI Conversations](ai-conversations.md) - Insights from Claude Code sessions
`;
  
  // Update sidebar or navigation (example for VuePress/GitBook style)
  const sidebarPath = 'docs/.vuepress/config.js';
  if (fs.existsSync(sidebarPath)) {
    console.log('📚 Documentation updated with AI conversations');
    console.log('💡 Remember to add navigation link manually');
  }
  
  console.log('✅ AI conversations exported to docs/');
}

updateDocumentation().catch(console.error);
```

## 🎯 Tips for Effective Usage

### Best Practices

1. **Regular Exports**: Export weekly to track your AI collaboration evolution
2. **Project-Specific Exports**: Keep project conversations separate for focused insights
3. **Include Metadata**: Always use `-m` flag for comprehensive analysis
4. **Use Descriptive Filenames**: Include dates and project names in output files
5. **Combine Formats**: Use JSON for analysis, Markdown for sharing

### Common Patterns

```bash
# Weekly team update
node dist/presentation/cli/cli.js -o "weekly-ai-insights-$(date +%Y-week-%U).md" -m

# Project documentation
node dist/presentation/cli/cli.js -p "$PROJECT_NAME" -f markdown -o "docs/ai-sessions.md" -m

# Data analysis
node dist/presentation/cli/cli.js -f json -o "analysis/conversations.json" -m

# Quick sharing
node dist/presentation/cli/cli.js -f simple -o "shared/latest-conversations.md"
```

---

*Transform your Claude Code sessions into valuable insights and documentation! 📖*