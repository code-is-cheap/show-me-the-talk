#!/bin/bash
# Start Implementation Script - Begin Phase 1 Development
# This script sets up everything needed to start implementing the enhanced features

set -e

echo "🚀 Starting Phase 1 Implementation Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check prerequisites
print_info "Checking prerequisites..."

# Check Node.js version
NODE_VERSION=$(node --version)
if [[ ! "$NODE_VERSION" =~ ^v1[89]\. ]] && [[ ! "$NODE_VERSION" =~ ^v2[0-9]\. ]]; then
    print_error "Node.js 18+ required, found: $NODE_VERSION"
    exit 1
fi
print_status "Node.js version compatible: $NODE_VERSION"

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
    print_error "Please run this script from the show-me-the-talk root directory"
    exit 1
fi
print_status "Working directory verified"

# Create backup
print_info "Creating backup before implementation..."
BACKUP_DIR="$HOME/.claude.backup.$(date +%Y%m%d_%H%M%S)"
if [[ -d "$HOME/.claude" ]]; then
    cp -r "$HOME/.claude" "$BACKUP_DIR"
    print_status "Backup created at: $BACKUP_DIR"
else
    print_warning "No existing Claude directory found - fresh installation"
fi

# Install new dependencies
print_info "Installing required dependencies..."
npm install crypto zstd uuid chokidar better-sqlite3 2>/dev/null || {
    print_warning "Some dependencies may need to be installed manually"
}

# Install dev dependencies
npm install --save-dev @types/uuid @types/better-sqlite3 2>/dev/null || {
    print_warning "Some dev dependencies may need to be installed manually"
}

print_status "Dependencies installed"

# Create directory structure for Phase 1
print_info "Creating Phase 1 directory structure..."

# Create storage directory structure
mkdir -p src/infrastructure/storage
mkdir -p src/infrastructure/timeline
mkdir -p src/domain/models/timeline
mkdir -p src/domain/services/timeline
mkdir -p tests/unit/infrastructure/storage
mkdir -p tests/unit/domain/timeline
mkdir -p tests/integration/phase1
mkdir -p scripts/migration

print_status "Directory structure created"

# Create package.json scripts if they don't exist
print_info "Adding implementation scripts to package.json..."

# Check if scripts section exists and add our scripts
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.scripts) pkg.scripts = {};

// Add implementation scripts
pkg.scripts['test:phase1'] = 'npm test -- tests/unit/infrastructure/storage tests/unit/domain/timeline';
pkg.scripts['test:phase1:integration'] = 'npm test -- tests/integration/phase1';
pkg.scripts['migrate:phase1'] = 'node scripts/migration/migrate-phase1.js';
pkg.scripts['benchmark:storage'] = 'node scripts/benchmark-storage.js';
pkg.scripts['verify:phase1'] = 'bash scripts/verify-phase1.sh';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Scripts added to package.json');
"

print_status "Implementation scripts added"

# Build current project to ensure everything works
print_info "Building current project to verify baseline..."
if npm run build; then
    print_status "Baseline build successful"
else
    print_error "Baseline build failed - fix issues before proceeding"
    exit 1
fi

# Run existing tests to verify baseline
print_info "Running existing tests to verify baseline..."
if npm test -- --reporter=dot; then
    print_status "Baseline tests pass"
else
    print_warning "Some existing tests failing - proceed with caution"
fi

echo ""
echo "🎉 Phase 1 Setup Complete!"
echo "=========================="
echo ""
echo "Next steps:"
echo "1. Run: node scripts/create-core-files.js (creates implementation files)"
echo "2. Run: npm run test:phase1 (test new functionality)"
echo "3. Run: npm run migrate:phase1 (migrate existing data)"
echo "4. Run: npm run verify:phase1 (verify implementation)"
echo ""
echo "Implementation guides available in:"
echo "- docs/implementation/Quick-Start-Guide.md"
echo "- docs/implementation/Phase1-Foundation-Implementation.md"
echo ""
echo "Emergency rollback: bash scripts/emergency-rollback.sh"
echo ""
print_status "Ready to begin Phase 1 implementation!"