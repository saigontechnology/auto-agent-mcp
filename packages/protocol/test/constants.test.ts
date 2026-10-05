import { describe, expect, it } from 'vitest';
import {
  APP_ID,
  BATCH_SCHEMA,
  ID_PATTERN,
  LIMITS,
  MAX_MESSAGE_BYTES,
  PORTS,
  PORT_FIRST,
  PORT_LAST,
  PROTOCOL_VERSION,
  WS_PATH,
} from '../src/index.js';

describe('constants', () => {
  it('lists ten loopback ports from 47320', () => {
    expect(PORT_FIRST).toBe(47320);
    expect(PORT_LAST).toBe(47329);
    expect(PORTS).toEqual([47320, 47321, 47322, 47323, 47324, 47325, 47326, 47327, 47328, 47329]);
  });

  it('fixes the identity, path and limits', () => {
    expect(APP_ID).toBe('auto-agent');
    expect(PROTOCOL_VERSION).toBe(1);
    expect(WS_PATH).toBe('/auto-agent');
    expect(BATCH_SCHEMA).toBe('auto-agent.batch/1');
    expect(MAX_MESSAGE_BYTES).toBe(15 * 1024 * 1024);
    expect(LIMITS.summary).toBe(600);
  });

  it('accepts uuids and rejects path-like ids', () => {
    expect(ID_PATTERN.test('3f9c2b1e-6a2d-4f7a-9c1e-0b5d2a7e4c11')).toBe(true);
    expect(ID_PATTERN.test('item_1')).toBe(true);
    for (const bad of ['', '../x', 'a/b', 'a b', 'x'.repeat(101), 'é']) {
      expect(ID_PATTERN.test(bad)).toBe(false);
    }
  });
});
