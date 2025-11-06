import { spawn, SpawnOptionsWithoutStdio, ChildProcess } from 'child_process';

export interface SpawnCliOptions {
  env?: NodeJS.ProcessEnv;
  stdio?: SpawnOptionsWithoutStdio['stdio'];
  timeoutMs?: number;
  cwd?: string;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

export interface CliProcess {
  child: ChildProcess;
  wait: Promise<CliResult>;
}

export function spawnCli(
  cliPath: string,
  args: string[] = [],
  options: SpawnCliOptions = {}
): CliProcess {
  const child = spawn('node', [cliPath, ...args], {
    stdio: options.stdio ?? ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...options.env },
    cwd: options.cwd ?? process.cwd()
  });

  let stdout = '';
  let stderr = '';

  if (child.stdout) {
    child.stdout.on('data', data => {
      stdout += data.toString();
    });
  }

  if (child.stderr) {
    child.stderr.on('data', data => {
      stderr += data.toString();
    });
  }

  const wait = new Promise<CliResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('CLI process timed out'));
    }, options.timeoutMs ?? 5000);

    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, signal });
    });
  });

  return { child, wait };
}
