#!/bin/bash
# Emergency Rollback Script
# Quickly rollback any Phase 1 changes if issues occur

set -e

echo "🚨 Emergency Rollback Procedure"
echo "==============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
    print_error "Please run this script from the show-me-the-talk root directory"
    exit 1
fi

# Find the most recent backup
CLAUDE_DIR="$HOME/.claude"
LATEST_BACKUP=$(ls -1t ~/.claude.backup.* 2>/dev/null | head -1)

if [[ -n "$LATEST_BACKUP" ]]; then
    echo "Found backup: $LATEST_BACKUP"
    BACKUP_DATE=$(basename "$LATEST_BACKUP" | sed 's/.*backup\.//')
    print_warning "This will restore Claude data to state from: $BACKUP_DATE"
    
    read -p "Continue with rollback? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Rollback cancelled"
        exit 0
    fi
    
    # Stop any running processes
    print_warning "Stopping any running show-me-the-talk processes..."
    pkill -f "show-me-the-talk" 2>/dev/null || true
    pkill -f "claude" 2>/dev/null || true
    
    # Backup current state (just in case)
    if [[ -d "$CLAUDE_DIR" ]]; then
        EMERGENCY_BACKUP="$HOME/.claude.emergency.$(date +%Y%m%d_%H%M%S)"
        cp -r "$CLAUDE_DIR" "$EMERGENCY_BACKUP"
        print_warning "Current state backed up to: $EMERGENCY_BACKUP"
    fi
    
    # Restore from backup
    print_warning "Restoring from backup..."
    rm -rf "$CLAUDE_DIR" 2>/dev/null || true
    cp -r "$LATEST_BACKUP" "$CLAUDE_DIR"
    
    print_success "Claude data restored from backup"
else
    print_warning "No automatic backup found in ~/.claude.backup.*"
    
    # Check for manual backup
    read -p "Enter path to backup directory (or press Enter to skip data restore): " MANUAL_BACKUP
    
    if [[ -n "$MANUAL_BACKUP" ]] && [[ -d "$MANUAL_BACKUP" ]]; then
        print_warning "Restoring from manual backup: $MANUAL_BACKUP"
        rm -rf "$CLAUDE_DIR" 2>/dev/null || true
        cp -r "$MANUAL_BACKUP" "$CLAUDE_DIR"
        print_success "Claude data restored from manual backup"
    else
        print_warning "Skipping data restore - no backup specified"
    fi
fi

# Rollback code changes
print_warning "Rolling back code changes..."

# Remove Phase 1 implementation files
PHASE1_FILES=(
    "src/infrastructure/storage/ContentAddressableStore.ts"
    "src/domain/models/timeline/ConversationTimeline.ts"
    "src/domain/services/timeline/TimelineAnalyzer.ts"
    "src/infrastructure/persistence/EnhancedJsonlConversationRepository.ts"
    "tests/unit/infrastructure/storage/ContentAddressableStore.test.ts"
    "tests/unit/domain/timeline/ConversationTimeline.test.ts"
    "scripts/migration/migrate-phase1.js"
    "scripts/verify-phase1.sh"
)

for file in "${PHASE1_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        rm "$file"
        print_success "Removed: $file"
    fi
done

# Remove empty directories
rmdir src/infrastructure/storage 2>/dev/null || true
rmdir src/domain/models/timeline 2>/dev/null || true
rmdir src/domain/services/timeline 2>/dev/null || true
rmdir tests/unit/infrastructure/storage 2>/dev/null || true
rmdir tests/unit/domain/timeline 2>/dev/null || true
rmdir scripts/migration 2>/dev/null || true

# Restore package.json if needed
if command -v git >/dev/null 2>&1; then
    if git status >/dev/null 2>&1; then
        print_warning "Restoring package.json from git..."
        git checkout HEAD -- package.json 2>/dev/null || print_warning "Could not restore package.json from git"
    fi
fi

# Rebuild to ensure everything works
print_warning "Rebuilding project..."
if npm run build; then
    print_success "Build successful after rollback"
else
    print_error "Build failed after rollback - manual intervention may be required"
fi

# Run tests to verify rollback
print_warning "Running tests to verify rollback..."
if npm test -- --reporter=dot; then
    print_success "Tests pass after rollback"
else
    print_warning "Some tests failing after rollback - this may be normal"
fi

echo ""
echo "🎯 Rollback Complete"
echo "==================="
echo ""
print_success "System has been rolled back to previous state"
echo ""
echo "What was rolled back:"
echo "- All Phase 1 implementation files removed"
echo "- Claude data restored from backup (if available)"
echo "- package.json restored (if git available)"
echo ""
echo "What to do next:"
echo "1. Verify your application works as expected"
echo "2. Check logs in ~/.claude.emergency.* if you encounter issues"
echo "3. Consider what went wrong before attempting Phase 1 again"
echo ""
echo "Emergency contacts:"
echo "- Check logs: ls -la ~/.claude*"
echo "- Restore from different backup: bash scripts/emergency-rollback.sh"
echo "- Manual recovery may be needed if multiple failures occurred"