#!/bin/bash

# This script removes documentation files from the root directory that have been moved to docs/

echo "Removing documentation files from root directory..."

# Remove the files that have been moved to docs/
rm -f COMPREHENSIVE_TEST_REPORT.md
rm -f GLOBAL_DIFF_SCRATCHPAD.md
rm -f MIGRATION_STATUS.md
rm -f MIGRATION_SUMMARY.md
rm -f REMOVED_TESTS.md
rm -f TEST_ANALYSIS_REPORT.md
rm -f TUI-FUNCTIONALITY-REPORT.md

# Also remove the original CONTENT_HEIGHT_FIX_SUMMARY.md if it still exists
rm -f CONTENT_HEIGHT_FIX_SUMMARY.md

echo "Cleanup complete!"
echo ""
echo "Files moved to docs/:"
ls -la docs/*.md | grep -E "(COMPREHENSIVE_TEST_REPORT|GLOBAL_DIFF_SCRATCHPAD|MIGRATION_STATUS|MIGRATION_SUMMARY|REMOVED_TESTS|TEST_ANALYSIS_REPORT|TUI-FUNCTIONALITY-REPORT|CONTENT_HEIGHT_FIX_SUMMARY)"