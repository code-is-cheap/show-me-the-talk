/**
 * Vitest setup file for TUI testing
 */

import { beforeEach, afterEach } from 'vitest';

// Mock console methods to avoid noise in tests
const originalConsole = global.console;

beforeEach(() => {
  // Preserve error and warn for important test output
  global.console = {
    ...originalConsole,
    log: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
});

afterEach(() => {
  // Restore original console
  global.console = originalConsole;
  
  // Clear any timers
  vi.clearAllTimers();
  
  // Clear all mocks
  vi.clearAllMocks();
});

// Global test utilities
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeWithinRange(floor: number, ceiling: number): T;
      toEndWith(suffix: string): T;
      toStartWith(prefix: string): T;
    }
  }
}

// Custom matchers for testing
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  toEndWith(received: string, suffix: string) {
    const pass = received.endsWith(suffix);
    if (pass) {
      return {
        message: () => `expected "${received}" not to end with "${suffix}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected "${received}" to end with "${suffix}"`,
        pass: false,
      };
    }
  },
  toStartWith(received: string, prefix: string) {
    const pass = received.startsWith(prefix);
    if (pass) {
      return {
        message: () => `expected "${received}" not to start with "${prefix}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected "${received}" to start with "${prefix}"`,
        pass: false,
      };
    }
  },
});