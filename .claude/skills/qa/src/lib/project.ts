import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { sanitizeEnv } from './sanitize.js';

/**
 * Find the project root by looking for package.json
 */
export function findProjectRoot(): string {
  let current = process.cwd();
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error('Could not find project root');
}

/**
 * Run an npm command with sanitized environment
 */
export function runNpmCommand(command: string, cwd?: string): Promise<number> {
  const projectRoot = cwd || findProjectRoot();
  const [script, ...args] = command.split(' ');

  return new Promise((resolve, reject) => {
    // Filter out undefined values from process.env
    const cleanEnv: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        cleanEnv[key] = value;
      }
    }

    const child = spawn('npm', ['run', script, ...args], {
      cwd: projectRoot,
      env: { ...sanitizeEnv(cleanEnv), FORCE_COLOR: '1' },
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });

    child.on('error', reject);
  });
}
