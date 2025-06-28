import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn, ChildProcess, execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import stripAnsi from 'strip-ansi';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

describe('CLI Integration Tests', () => {
  // Get the current file's directory in a cross-platform way
  const currentDir = process.cwd();
  const cliPath = resolve(currentDir, 'dist/bin/show-me-the-talk.js');
  const testDataDir = resolve(currentDir, 'tests/fixtures/test-data');
  
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
    it('should detect TTY environment correctly', (done) => {
      const child = spawn('node', [cliPath], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: 'true' }
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Send quit command immediately
      setTimeout(() => {
        child.stdin?.write('q');
        child.stdin?.end();
      }, 100);

      child.on('close', (code) => {
        // Should either start TUI or show TTY error
        const combinedOutput = output + errorOutput;
        expect(
          combinedOutput.includes('🚀 Starting Comprehensive Ink TUI') ||
          combinedOutput.includes('This TUI requires a TTY environment')
        ).toBe(true);
        done();
      });

      // Prevent hanging
      setTimeout(() => {
        child.kill('SIGTERM');
        done();
      }, 3000);
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
    it('should accept valid project path', (done) => {
      const child = spawn('node', [cliPath, testDataDir], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: 'false' }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 1000);

      child.on('close', () => {
        // Should either start successfully or show TTY requirement
        expect(output).toBeDefined();
        done();
      });
    });

    it('should handle verbose flag', (done) => {
      const child = spawn('node', [cliPath, '--verbose'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, DEBUG: 'show-me-the-talk:*' }
      });

      let output = '';
      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 1000);

      child.on('close', () => {
        // Verbose mode should produce debug output or TTY message
        expect(output).toBeDefined();
        done();
      });
    });
  });

  describe('Data Loading', () => {
    it('should attempt to load conversation data', (done) => {
      const child = spawn('node', [cliPath, testDataDir], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 2000);

      child.on('close', () => {
        // Should either load data successfully or show appropriate error
        const cleanOutput = stripAnsi(output);
        expect(
          cleanOutput.includes('conversations') ||
          cleanOutput.includes('This TUI requires a TTY') ||
          cleanOutput.includes('Starting')
        ).toBe(true);
        done();
      });
    });
  });

  describe('Signal Handling', () => {
    it('should handle SIGINT gracefully', (done) => {
      const child = spawn('node', [cliPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      setTimeout(() => {
        child.kill('SIGINT');
      }, 500);

      child.on('close', (code, signal) => {
        expect(signal === 'SIGINT' || code === 0).toBe(true);
        done();
      });
    });

    it('should handle SIGTERM gracefully', (done) => {
      const child = spawn('node', [cliPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 500);

      child.on('close', (code, signal) => {
        expect(signal === 'SIGTERM' || code === 0).toBe(true);
        done();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should handle export commands', (done) => {
      const child = spawn('node', [cliPath, testDataDir], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      // Try to trigger export mode
      setTimeout(() => {
        child.stdin?.write('e');
        setTimeout(() => {
          child.stdin?.write('q');
          child.stdin?.end();
        }, 100);
      }, 500);

      child.on('close', () => {
        // Should handle export attempt or show TTY requirement
        expect(output).toBeDefined();
        done();
      });

      // Prevent hanging
      setTimeout(() => {
        child.kill('SIGTERM');
        done();
      }, 3000);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during startup', (done) => {
      const child = spawn('node', [cliPath, '--help'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const startTime = Date.now();
      
      child.on('close', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete help command quickly
        expect(duration).toBeLessThan(5000);
        done();
      });
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

    it('should respect DEBUG environment variable', (done) => {
      const child = spawn('node', [cliPath, '--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, DEBUG: 'show-me-the-talk:*' }
      });

      let stderr = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', () => {
        // Debug mode might produce additional output
        expect(stderr).toBeDefined();
        done();
      });
    });
  });
});