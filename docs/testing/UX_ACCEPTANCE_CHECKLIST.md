# UX Acceptance Checklist (TUI)

This checklist defines the experience "definition of done" for the Show Me The Talk TUI. A release is acceptable only when all **P0** and **P1** items pass.

## How to use

- Run the interactive TUI and walk through each section.
- Mark each item as PASS/FAIL with notes.
- Block release if any **P0** or **P1** item fails.
- Re-run after every interaction-related change or layout refactor.

Legend:
- **P0** = must pass (release blocker)
- **P1** = should pass (release blocker unless explicitly waived)
- **P2** = nice to have (track as follow-up)

---

## 1) Core Navigation (P0)

- [ ] **Project list shows** within 1s and displays all non-empty projects.
- [ ] **Enter** opens conversation list for selected project.
- [ ] **ESC** returns to previous screen without losing selection.
- [ ] **j/k and ↑/↓** move selection consistently across screens.
- [ ] **q** exits cleanly with no crash or hang.

## 2) Conversation List (P0)

- [ ] Title, time, and message count render for each conversation.
- [ ] Selection highlight is visible and consistent.
- [ ] Search and analytics hotkeys are visible in footer hints.
- [ ] Empty state message is clear when there are no conversations.

## 3) Message Detail (Single View) (P0)

- [ ] Header shows conversation title, mode (CLEAN/RAW), and position.
- [ ] Content is readable without truncating mid-characters.
- [ ] ↑/↓ scrolls content, with line count indicator when overflowed.
- [ ] j/k and u/U navigate to next/previous messages as advertised.

## 4) Thread View (P0)

- [ ] `v` toggles between single view and thread view with no glitches.
- [ ] Message lines align top-to-bottom (chronological).
- [ ] The active message is visually distinct.
- [ ] Section headers appear with checkpoint markers (○/◆).

## 5) Timeline Sidebar (P0)

- [ ] Timeline renders on the right and updates as selection changes.
- [ ] Current position marker is visible (●).
- [ ] Checkpoint markers are visible (◆) and labeled.
- [ ] Sidebar width does not crush the main content.

## 6) Timeline Focus Mode (P0)

- [ ] `t` toggles timeline focus on/off.
- [ ] In focus mode, **j/k or ↑/↓** moves the timeline selection.
- [ ] **Enter** jumps to the selected section and updates content.
- [ ] Preview line appears for the selected section.

## 7) Checkpoint-Only Mode (P1)

- [ ] `p` toggles checkpoint-only view.
- [ ] Only section headers and checkpoint entries remain visible.
- [ ] Navigation still jumps between checkpoints (j/k or [ / ]).

## 8) Collapse Controls (P1)

- [ ] `c` collapses/expands the current section.
- [ ] `C` collapses/expands all sections.
- [ ] Collapsing never hides the currently active message entirely.

## 9) Raw vs Clean (P1)

- [ ] `r` toggles RAW/CLEAN view without losing selection.
- [ ] RAW view shows tool calls, tool results, system, summary, and snapshot types.
- [ ] Metadata lines render correctly (model, tokens, tool use id).

## 10) Export UX (P1)

- [ ] `E` exports current stage to `exports/` with a clear status message.
- [ ] `P` exports all stages with correct ordering and headings.
- [ ] Export failure produces an actionable status message.

## 11) Visual Clarity & Consistency (P1)

- [ ] Legend is visible and maps to the icons in the content.
- [ ] Status messages are clear, short, and auto-clear within 3s.
- [ ] No overlapping text or jitter when scrolling or switching views.

## 12) Performance & Responsiveness (P1)

- [ ] Large conversations (1000+ entries) remain usable.
- [ ] Scrolling stays responsive with no visible lag.
- [ ] Timeline selection and jumps update immediately.

## 13) Accessibility & Usability (P2)

- [ ] Color contrast remains readable on dark and light terminals.
- [ ] Keyboard-only navigation supports all features.
- [ ] Layout remains usable at small terminal sizes (>= 80x24).

## 14) Error & Empty States (P0)

- [ ] No conversations found: friendly message and escape path.
- [ ] No raw entries: `r` shows a helpful status message.
- [ ] No checkpoints: checkpoint jump gives a clear warning.

---

## Release Gate

- **Block release** if any P0/P1 item fails.
- **Record exceptions** for any P1 waiver with rationale and owner.
- **File follow-ups** for all P2 items with target release.

