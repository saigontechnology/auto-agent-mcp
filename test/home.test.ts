import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { autoAgentHome } from '../src/home.js';

describe('autoAgentHome', () => {
  it('lives in ~/.auto-agent, apart from PickFix', () => {
    expect(autoAgentHome({})).toBe(join(homedir(), '.auto-agent'));
  });

  it('honours AUTO_AGENT_HOME and ignores PICKFIX_HOME', () => {
    expect(autoAgentHome({ AUTO_AGENT_HOME: '/tmp/aa' })).toBe('/tmp/aa');
    expect(autoAgentHome({ PICKFIX_HOME: '/tmp/pf' })).toBe(join(homedir(), '.auto-agent'));
  });
});
