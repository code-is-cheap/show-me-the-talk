import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TUIService, TUIOptions, ITUIController } from '@/infrastructure/tui/TUIService';
import { ConversationApplicationService } from '@/application/services/ConversationApplicationService';
import { ExportRepository } from '@/domain/repositories/ExportRepository';
import { EnvironmentValidator } from '@/infrastructure/environment/EnvironmentValidator';

// Mock the ComprehensiveInkTUI to prevent hanging in tests
vi.mock('@/presentation/tui/ComprehensiveInkTUI', () => ({
  ComprehensiveInkTUI: class MockComprehensiveInkTUI {
    constructor(conversationService: any, options: any) {
      this.conversationService = conversationService;
      this.options = options;
    }
    async start() {
      // Simulate successful startup
      return Promise.resolve();
    }
  }
}));

// Create minimal mock services that don't override their behavior
const mockConversationService = {} as ConversationApplicationService;
const mockExportRepository = {} as ExportRepository;

describe('TUIService', () => {
  let tuiService: TUIService;
  let validator: EnvironmentValidator;

  beforeEach(() => {
    tuiService = new TUIService(mockConversationService, mockExportRepository);
    validator = EnvironmentValidator.getInstance();
    
    // Reset any cached environment info to ensure clean test state
    validator.refreshEnvironmentInfo();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with required services', () => {
      expect(tuiService).toBeInstanceOf(TUIService);
    });
    
    it('should accept conversation service and export repository', () => {
      const service = new TUIService(mockConversationService, mockExportRepository);
      expect(service).toBeInstanceOf(TUIService);
    });
  });

  describe('createTUI', () => {
    it('should create a TUI controller with default options', () => {
      const controller = tuiService.createTUI();
      
      expect(controller).toBeDefined();
      expect(typeof controller.start).toBe('function');
      expect(typeof controller.stop).toBe('function');
      expect(typeof controller.isRunning).toBe('function');
    });

    it('should create a TUI controller with custom options', () => {
      const options: TUIOptions = {
        debug: true,
        defaultClaudePath: '/custom/path',
        terminalType: 'warp'
      };
      
      const controller = tuiService.createTUI(options);
      expect(controller).toBeDefined();
    });

    it('should return a lazy-loading controller', () => {
      const controller = tuiService.createTUI();
      
      // Initially not running since TUI hasn't been created yet
      expect(controller.isRunning()).toBe(false);
    });
  });

  describe('startInteractiveMode', () => {
    it('should start interactive mode with default options', async () => {
      await expect(tuiService.startInteractiveMode()).resolves.toBeUndefined();
    });

    it('should start interactive mode with custom options', async () => {
      const options: TUIOptions = {
        debug: true,
        defaultClaudePath: '/custom/path'
      };
      
      await expect(tuiService.startInteractiveMode(options)).resolves.toBeUndefined();
    });

    it('should create and start a TUI controller', async () => {
      // This tests that startInteractiveMode uses createTUI internally
      const createTUISpy = vi.spyOn(tuiService, 'createTUI');
      
      await tuiService.startInteractiveMode();
      
      expect(createTUISpy).toHaveBeenCalledWith({});
      createTUISpy.mockRestore();
    });
  });

  describe('isReady', () => {
    it('should return true in test environment (bypass logic)', () => {
      // EnvironmentValidator allows bypass in test environment (NODE_ENV=test)
      expect(tuiService.isReady()).toBe(true);
    });

    it('should return false when conversation service is missing', () => {
      const serviceWithoutConversation = new TUIService(null as any, mockExportRepository);
      expect(serviceWithoutConversation.isReady()).toBe(false);
    });

    it('should return false when export repository is missing', () => {
      const serviceWithoutExport = new TUIService(mockConversationService, null as any);
      expect(serviceWithoutExport.isReady()).toBe(false);
    });

    it('should return true when all services are available', () => {
      expect(tuiService.isReady()).toBe(true);
    });
  });

  describe('getTerminalInfo', () => {
    it('should return terminal information from EnvironmentValidator', () => {
      const info = tuiService.getTerminalInfo();

      expect(info).toHaveProperty('width');
      expect(info).toHaveProperty('height');
      expect(info).toHaveProperty('colors');
      expect(typeof info.width).toBe('number');
      expect(typeof info.height).toBe('number');
      expect(typeof info.colors).toBe('number');
    });

    it('should return sensible default values', () => {
      const info = tuiService.getTerminalInfo();

      // EnvironmentValidator provides defaults for missing terminal info
      expect(info.width).toBeGreaterThan(0);
      expect(info.height).toBeGreaterThan(0);
      expect(info.colors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateEnvironment', () => {
    it('should return environment validation result', () => {
      const result = tuiService.validateEnvironment();

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('issues');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should be valid in test environment with all services', () => {
      const result = tuiService.validateEnvironment();

      // Test environment should pass validation due to bypass logic
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing conversation service', () => {
      const serviceWithoutConversation = new TUIService(null as any, mockExportRepository);
      const result = serviceWithoutConversation.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('ConversationApplicationService not available');
    });

    it('should detect missing export repository', () => {
      const serviceWithoutExport = new TUIService(mockConversationService, null as any);
      const result = serviceWithoutExport.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('FileExportService not available');
    });

    it('should combine EnvironmentValidator issues with service availability', () => {
      const serviceWithoutBoth = new TUIService(null as any, null as any);
      const result = serviceWithoutBoth.validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('ConversationApplicationService not available');
      expect(result.issues).toContain('FileExportService not available');
    });
  });
});