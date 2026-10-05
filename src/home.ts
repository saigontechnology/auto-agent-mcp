import { chmodSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function autoAgentHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.AUTO_AGENT_HOME ?? join(homedir(), '.auto-agent');
}

export function ensureHome(home: string): void {
  mkdirSync(home, { recursive: true, mode: 0o700 });
  chmodSync(home, 0o700);
}
