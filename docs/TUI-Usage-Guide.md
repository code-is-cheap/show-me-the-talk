# TUI Usage Guide

## Requirements

The Terminal UI (TUI) requires a proper TTY environment to function correctly. This means:

1. **Terminal Environment**: You must run the TUI in a real terminal emulator (not in VS Code output panel, not in CI/CD pipelines)
2. **Interactive Shell**: The terminal must support interactive input (stdin in raw mode)
3. **ANSI Support**: Your terminal must support ANSI escape sequences for colors and cursor positioning

## How to Run the TUI

### Option 1: Using the compiled version
```bash
# First build the project
npm run build

# Then run the TUI
./dist/bin/show-me-the-talk.js --tui
# or
npx show-me-the-talk --tui
```

### Option 2: Using development mode
```bash
npm run dev -- --tui
```

### Option 3: Using the test script
```bash
./test-real-tui.sh
```

## TUI Features

The TUI provides a professional terminal interface with:

1. **Project Selection Screen**
   - Navigate through your Claude projects
   - See conversation counts per project
   - Use j/k or arrow keys to navigate

2. **Conversation List Screen**
   - Browse all conversations in a project
   - View conversation metadata (duration, tokens, dates)
   - Search and filter conversations
   - Use vim-like navigation

3. **Message View Screen**
   - Read individual messages in a conversation
   - See code blocks with syntax highlighting
   - View tool interactions
   - Navigate between messages

4. **Export Screen**
   - Select export format (JSON, Markdown, HTML, Simple)
   - Configure export options
   - Export directly from the TUI

## Keyboard Shortcuts

### Global
- `q` or `Ctrl+C`: Quit
- `ESC`: Go back
- `h`: Help screen

### Navigation
- `j` / `↓`: Move down
- `k` / `↑`: Move up
- `g`: Go to first item
- `G`: Go to last item
- `Enter`: Select item

### Search
- `/`: Start search
- `n`: Next search result
- `N`: Previous search result

### Export
- `e`: Open export menu
- `1-4`: Select export format

## Troubleshooting

### "Not running in a TTY environment"

This error means you're trying to run the TUI in a non-interactive environment. Solutions:

1. Run in a real terminal (Terminal.app, iTerm, etc.)
2. Don't use VS Code's output panel
3. Ensure your shell is interactive (`echo $-` should include 'i')

### Display Issues

If the TUI looks garbled or broken:

1. Check terminal size: minimum 80x24 required
2. Ensure UTF-8 encoding: `echo $LANG` should show UTF-8
3. Try a different terminal emulator
4. Check if your terminal supports 256 colors

### Testing the TUI

To verify the TUI works correctly:

```bash
# Check if you're in a TTY
tty

# Check terminal capabilities
echo "Columns: $COLUMNS, Rows: $LINES"
echo "Colors: $(tput colors)"

# Run the TUI validation
node dist/bin/show-me-the-talk.js --tui
```

## Alternative: Enhanced CLI Mode

If the TUI doesn't work in your environment, use the enhanced CLI modes:

```bash
# Beautiful HTML export with Time Machine
show-me-the-talk --format html -o conversations.html

# Enhanced markdown with emojis
show-me-the-talk --format markdown --metadata -o report.md

# Simple format for quick reading
show-me-the-talk --format simple -o talks.md
```