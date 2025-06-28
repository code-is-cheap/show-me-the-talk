# Warp Terminal Support

Show Me The Talk now includes full support for [Warp Terminal](https://www.warp.dev/), the modern terminal reimagined for developers.

## Automatic Detection

The TUI automatically detects when running in Warp and switches to a compatible rendering mode. Detection is based on:

- `TERM_PROGRAM=WarpTerminal`
- `WARP_IS_LOCAL_SHELL_SESSION=1`

## Warp-Specific Features

### 1. **Line-by-Line Rendering**
Instead of using cursor positioning (`\x1b[y;xH`), the Warp-compatible renderer uses line-by-line output with `console.clear()` for better compatibility.

### 2. **Enhanced Colors**
The renderer uses Warp-friendly color codes:
- Basic colors (30-37, 90-97)
- Background colors (40-47, 100-107)
- Styles (bold, dim, inverse)

### 3. **Responsive Layout**
The TUI adapts to Warp's terminal size and handles:
- Dynamic width/height detection
- Proper text wrapping
- Scroll indicators for long lists

## Visual Improvements in Warp

1. **Clean Interface**
   - Title bars with project information
   - Clear navigation indicators
   - Status bar with keyboard shortcuts

2. **Better Selection Highlighting**
   - Selected items use cyan background with black text
   - Clear visual distinction between items
   - Smooth navigation experience

3. **Readable Content**
   - Proper spacing between elements
   - Color-coded message types (User: green, Assistant: blue)
   - Formatted metadata (dates, duration, message counts)

## Usage in Warp

```bash
# Run the TUI in Warp
show-me-the-talk --tui

# Or with debug mode to confirm Warp detection
WARP_IS_LOCAL_SHELL_SESSION=1 show-me-the-talk --tui --debug
```

## Keyboard Navigation

All standard keyboard shortcuts work perfectly in Warp:

- **Navigation**: `↑/↓` or `j/k`
- **Selection**: `Enter`
- **Back**: `ESC`
- **Search**: `/`
- **Export**: `e`
- **Quit**: `q` or `Ctrl+C`

## Troubleshooting

If the TUI doesn't look right in Warp:

1. **Check Terminal Size**
   ```bash
   echo "Width: $COLUMNS, Height: $LINES"
   ```
   Minimum: 80x24

2. **Verify Warp Detection**
   ```bash
   echo "TERM_PROGRAM: $TERM_PROGRAM"
   echo "WARP_IS_LOCAL_SHELL_SESSION: $WARP_IS_LOCAL_SHELL_SESSION"
   ```

3. **Force Warp Mode**
   ```bash
   TERM_PROGRAM=WarpTerminal show-me-the-talk --tui
   ```

## Technical Details

The Warp-compatible renderer (`WarpCompatibleRenderer`) differs from the standard renderer:

1. **No Cursor Positioning**: Uses sequential line output
2. **Console.clear()**: Instead of ANSI clear screen
3. **Simplified Color Codes**: Uses more compatible ANSI sequences
4. **Buffer Management**: Builds entire screen before output

This ensures smooth operation in Warp's unique terminal environment while maintaining all TUI functionality.