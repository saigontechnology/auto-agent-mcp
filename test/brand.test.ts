import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Everything Claude or a user of the plugin reads: sources, protocol, skills and plugin manifests. */
const ROOTS = ['src', 'packages/protocol/src', 'plugin/skills', 'plugin/hooks', 'plugin/.claude-plugin', '.claude-plugin'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('brand', () => {
  it('never names PickFix in what Claude or the user reads', () => {
    const hits = ROOTS.flatMap(files)
      .filter((path) => /pickfix/i.test(readFileSync(path, 'utf8')))
      .sort();
    expect(hits).toEqual([]);
  });

  it('names the plugin Auto Agent', () => {
    const plugin = JSON.parse(readFileSync('plugin/.claude-plugin/plugin.json', 'utf8'));
    expect(plugin.name).toBe('auto-agent');
    expect(plugin.displayName).toBe('Auto Agent');
    expect(plugin.mcpServers['auto-agent']).toEqual({ command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/dist/server.mjs'] });
    expect(plugin.channels).toEqual([{ server: 'auto-agent', displayName: 'Auto Agent' }]);
  });
});
