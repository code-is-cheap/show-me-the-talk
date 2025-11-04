# Package Rename Notice

## New Package Name: `ccshow`

As of version 1.0.3, the package has been renamed from `@code-is-cheap/show-me-the-talk` to `ccshow` for easier installation and usage.

### Installation

```bash
# New simple name
npm install -g ccshow

# Legacy name still documented for reference
npm install -g @code-is-cheap/show-me-the-talk
```

### Available Commands

All four commands are available and equivalent:

- `ccshow` - Primary command (shortest)
- `show-me-the-talk` - Full name (preserves the slogan)
- `smtt` - Quick alias
- `cctalk` - Claude Code Talk

### Import in Code

```typescript
// Use the new package name
import { ShowMeTheTalk } from 'ccshow';
```

### Why the Change?

- **Simpler**: `ccshow` is easier to type and remember
- **Global**: Unscoped package name (no `@org/` prefix)
- **Meaningful**: CC = Claude Code, show = core functionality
- **Preserves slogan**: Full command name `show-me-the-talk` still available

The package name honors both simplicity (`ccshow`) and the original philosophy ("code is cheap, show me the talk").
