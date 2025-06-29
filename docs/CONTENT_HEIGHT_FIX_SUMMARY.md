# Content Height Fix Summary

## Problem
The TUI message detail screen was showing too little content (only 15 lines) regardless of terminal size, making it difficult to read longer messages.

## Solution
1. **Dynamic Content Height Calculation**: 
   - Replaced hardcoded 15-line limit with dynamic calculation based on terminal height
   - Content area now uses all available space after accounting for UI elements

2. **Reduced Timeline Height**:
   - Reduced timeline visualization from 5 possible heights to 3
   - Height levels: 1 (short messages), 2 (300+ chars), 3 (1000+ chars)
   - This saves 2 rows of vertical space for content

3. **Adaptive UI for Small Terminals**:
   - In terminals with less than 20 rows, display minimal timeline (just position info)
   - This preserves more space for actual message content

4. **Accurate UI Overhead Calculation**:
   - Added `calculateTimelineHeight()` method to determine actual timeline height
   - UI overhead now accounts for actual timeline height rather than worst-case
   - Dynamically adjusts based on terminal size

## Results
- **24-row terminal**: 6 rows for content (25% of screen)
- **30-row terminal**: 12 rows for content (40% of screen)  
- **40-row terminal**: 22 rows for content (55% of screen)
- **50-row terminal**: 32 rows for content (64% of screen)
- **60-row terminal**: 42 rows for content (70% of screen)

## Code Changes
- Modified `renderMessageDetailScreen()` to calculate available height dynamically
- Updated `renderMainTimeline()` to show minimal UI in small terminals
- Reduced timeline height levels from 5 to 3
- Added `calculateTimelineHeight()` helper method

The content area now scales properly with terminal size, providing a much better reading experience for longer messages.