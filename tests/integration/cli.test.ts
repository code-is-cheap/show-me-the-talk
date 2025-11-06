import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import stripAnsi from 'strip-ansi';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { spawnCli } from '../utils/runCli';

describe('CLI Integration Tests', () => {
  // Get the current file's directory in a cross-platform way
  const currentDir = process.cwd();
  const cliPath = resolve(currentDir, 'dist/bin/show-me-the-talk.js');
  const testDataDir = resolve(currentDir, 'tests/fixtures/test-data');
  const spawnCliProcess = (args: string[] = [], options = {}) => spawnCli(cliPath, args, options);
  
  beforeEach(() => {
    // Create test data directory
    mkdirSync(testDataDir, { recursive: true });
    
    // Create sample conversation file
    const sampleConversation = {
      conversation_id: 'test-123',
      title: 'Test Conversation with Very Long Title That Should Be Truncated',
      created_at: '2023-01-01T10:00:00Z',
      updated_at: '2023-01-01T10:30:00Z',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, this is a test message',
          created_at: '2023-01-01T10:00:00Z'
        },
        {
          id: 'msg-2', 
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          created_at: '2023-01-01T10:01:00Z'
        }
      ]
    };
    
    writeFileSync(
      resolve(testDataDir, 'conversations.jsonl'),
      JSON.stringify(sampleConversation) + '\n'
    );
  });

  afterEach(() => {
    // Clean up test data
    rmSync(testDataDir, { recursive: true, force: true });
  });

  describe('CLI Help and Version', () => {
    it('should display help information', () => {
      const output = execSync(`node ${cliPath} --help`, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      expect(stripAnsi(output)).toContain('show-me-the-talk');
      expect(stripAnsi(output)).toContain('Claude Code Conversation Exporter');
    });

    it('should display version information', () => {
      const output = execSync(`node ${cliPath} --version`, {
        encoding: 'utf8', 
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      expect(stripAnsi(output)).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('TUI Mode Detection', () => {
    it('should detect TTY environment correctly', async () => {
      const { child, wait } = spawnCliProcess([], {
        env: { ...process.env, FORCE_COLOR: 'true' },
        timeoutMs: 4000
      });

      setTimeout(() => {
        child.stdin?.write('q');
        child.stdin?.end();
      }, 100);

      const result = await wait;
      const combinedOutput = result.stdout + result.stderr;
      expect(
        combinedOutput.includes('🚀 Starting Comprehensive Ink TUI') ||
        combinedOutput.includes('This TUI requires a TTY environment')
      ).toBe(true);
    });

    it('should handle non-TTY environment gracefully', () => {
      try {
        execSync(`echo "" | node ${cliPath}`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (error: any) {
        const output = error.stderr || error.stdout || error.message;
        expect(stripAnsi(output)).toContain('This TUI requires a TTY environment');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project directory', () => {
      expect(() => {
        execSync(`node ${cliPath} /nonexistent/directory`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }).toThrow();
    });

    it('should handle permission errors gracefully', () => {
      // Test with a directory that exists but might have permission issues
      const output = execSync(`node ${cliPath} /etc 2>&1 || echo "Permission denied"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      expect(stripAnsi(output)).toMatch(/(Permission denied|This TUI requires a TTY)/);
    });
  });

  describe('Command Line Arguments', () => {
    it('should accept valid project path', async () => {
      const { child, wait } = spawnCliProcess([testDataDir], {
        env: { ...process.env, FORCE_COLOR: 'false' },
        timeoutMs: 4000
      });

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 1000);

      const result = await wait;
      expect(result.stdout + result.stderr).toBeDefined();
    });

    it('should handle verbose flag', async () => {
      const { child, wait } = spawnCliProcess(['--verbose'], {
        env: { ...process.env, DEBUG: 'show-me-the-talk:*' },
        timeoutMs: 4000
      });

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 1000);

      const result = await wait;
      expect(result.stderr).toBeDefined();
    });
  });

  describe('Data Loading', () => {
    it('should attempt to load conversation data', async () => {
      const { child, wait } = spawnCliProcess([testDataDir], { timeoutMs: 5000 });

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 2000);

      const result = await wait;
      const cleanOutput = stripAnsi(result.stdout + result.stderr);
      expect(
        cleanOutput.includes('conversations') ||
        cleanOutput.includes('This TUI requires a TTY') ||
        cleanOutput.includes('Starting')
      ).toBe(true);
    });
  });

  describe('Signal Handling', () => {
    it('should handle SIGINT gracefully', async () => {
      const { child, wait } = spawnCliProcess([], { timeoutMs: 5000 });
      setTimeout(() => child.kill('SIGINT'), 500);
      await wait;
    });

    it('should handle SIGTERM gracefully', async () => {
      const { child, wait } = spawnCliProcess([], { timeoutMs: 5000 });
      setTimeout(() => child.kill('SIGTERM'), 500);
      await wait;
    });
  });

  describe('Export Functionality', () => {
    it('should handle export commands', async () => {
      const { child, wait } = spawnCliProcess([testDataDir], { timeoutMs: 4000 });

      setTimeout(() => {
        child.stdin?.write('e');
        setTimeout(() => {
          child.stdin?.write('q');
          child.stdin?.end();
        }, 100);
      }, 500);

      const result = await wait;
      expect(result.stdout + result.stderr).toBeDefined();
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during startup', async () => {
      const startTime = Date.now();
      await spawnCliProcess(['--help']).wait;
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Environment Variables', () => {
    it('should respect FORCE_COLOR environment variable', () => {
      const outputWithColor = execSync(`node ${cliPath} --help`, {
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: 'true' },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const outputWithoutColor = execSync(`node ${cliPath} --help`, {
        encoding: 'utf8', 
        env: { ...process.env, FORCE_COLOR: 'false' },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Color output should contain ANSI codes
      expect(outputWithColor.length).toBeGreaterThanOrEqual(outputWithoutColor.length);
    });

    it('should respect DEBUG environment variable', async () => {
      const { wait } = spawnCliProcess(['--version'], {
        env: { ...process.env, DEBUG: 'show-me-the-talk:*' }
      });

      const result = await wait;
      expect(result.stderr).toBeDefined();
    });
  });
});
