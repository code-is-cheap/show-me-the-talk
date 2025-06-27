# Show Me The Talk - Makefile

# Variables
NODE_MODULES := node_modules
SRC_DIR := src
DIST_DIR := dist
TEST_DIR := tests

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

.PHONY: help install build clean test test-unit test-integration lint format check dev package docs

help: ## Show this help message
	@echo "$(BLUE)Show Me The Talk - Build Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

build: clean ## Build the project
	@echo "$(BLUE)Building project...$(NC)"
	npm run build
	@echo "$(GREEN)✅ Build completed$(NC)"

clean: ## Clean build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf $(DIST_DIR)
	rm -rf coverage
	rm -rf *.tgz
	@echo "$(GREEN)✅ Clean completed$(NC)"

dev: ## Run in development mode
	@echo "$(BLUE)Starting development mode...$(NC)"
	npm run dev

test: test-unit test-integration ## Run all tests

test-unit: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	npm run test:unit
	@echo "$(GREEN)✅ Unit tests completed$(NC)"

test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	npm run test:integration
	@echo "$(GREEN)✅ Integration tests completed$(NC)"

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	npm run test:watch

test-coverage: ## Generate test coverage report
	@echo "$(BLUE)Generating coverage report...$(NC)"
	npm run test:coverage
	@echo "$(GREEN)✅ Coverage report generated$(NC)"

lint: ## Run linter
	@echo "$(BLUE)Running linter...$(NC)"
	npm run lint
	@echo "$(GREEN)✅ Linting completed$(NC)"

lint-fix: ## Fix linting issues
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	npm run lint:fix
	@echo "$(GREEN)✅ Linting fixes applied$(NC)"

format: ## Format code
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format
	@echo "$(GREEN)✅ Code formatted$(NC)"

typecheck: ## Run TypeScript type checking
	@echo "$(BLUE)Running type checks...$(NC)"
	npm run typecheck
	@echo "$(GREEN)✅ Type checking completed$(NC)"

check: lint typecheck test ## Run all quality checks

validate: install build check ## Full validation pipeline

package: validate ## Create distribution package
	@echo "$(BLUE)Creating package...$(NC)"
	npm pack
	@echo "$(GREEN)✅ Package created$(NC)"

publish-dry: package ## Dry run publish
	@echo "$(BLUE)Running publish dry run...$(NC)"
	npm publish --dry-run
	@echo "$(GREEN)✅ Publish dry run completed$(NC)"

benchmark: build ## Run performance benchmarks
	@echo "$(BLUE)Running benchmarks...$(NC)"
	npm run benchmark
	@echo "$(GREEN)✅ Benchmarks completed$(NC)"

demo: build ## Run demo/example
	@echo "$(BLUE)Running demo...$(NC)"
	node $(DIST_DIR)/bin/show-me-the-talk.js --help
	@echo "$(GREEN)✅ Demo completed$(NC)"

docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	npm run docs
	@echo "$(GREEN)✅ Documentation generated$(NC)"

# Development helpers
setup: install build ## Initial project setup
	@echo "$(GREEN)🎉 Project setup completed!$(NC)"
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "  make dev     - Start development"
	@echo "  make test    - Run tests"
	@echo "  make check   - Run all quality checks"

ci: validate ## CI pipeline
	@echo "$(GREEN)✅ CI pipeline completed successfully$(NC)"

# Docker targets (if needed)
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker build -t show-me-the-talk .
	@echo "$(GREEN)✅ Docker image built$(NC)"

# Git hooks setup
hooks: ## Setup git hooks
	@echo "$(BLUE)Setting up git hooks...$(NC)"
	npm run prepare
	@echo "$(GREEN)✅ Git hooks installed$(NC)"

# Watch files for changes
watch: ## Watch files and rebuild on changes
	@echo "$(BLUE)Watching for changes...$(NC)"
	npm run watch