import { describe, expect, it } from 'vitest';
import { formatConnectCode, parseConnectCode } from '../src/index.js';

const SESSION_ID = '3f1c2a9e-7b4d-4e2a-9c1f-0a6b5d8e2f10';

describe('connect codes', () => {
  it('joins the port and the session id', () => {
    expect(formatConnectCode(47321, SESSION_ID)).toBe(`47321:${SESSION_ID}`);
  });

  it('reads back the code it formats', () => {
    expect(parseConnectCode(formatConnectCode(47321, SESSION_ID))).toEqual({ port: 47321, sessionId: SESSION_ID });
  });

  it('ignores the spaces, quotes and backticks a pasted code picks up', () => {
    expect(parseConnectCode(`  \`47320:${SESSION_ID}\`\n`)).toEqual({ port: 47320, sessionId: SESSION_ID });
    expect(parseConnectCode(`"47320:${SESSION_ID}"`)).toEqual({ port: 47320, sessionId: SESSION_ID });
  });

  it('rejects a port outside the Auto Agent range', () => {
    expect(parseConnectCode(`8080:${SESSION_ID}`)).toBeNull();
    expect(parseConnectCode(`47330:${SESSION_ID}`)).toBeNull();
  });

  it('rejects text that is not a code', () => {
    expect(parseConnectCode('')).toBeNull();
    expect(parseConnectCode('47321')).toBeNull();
    expect(parseConnectCode(`47321:${SESSION_ID}:extra`)).toBeNull();
    expect(parseConnectCode('47321:not a session')).toBeNull();
    expect(parseConnectCode(`abc:${SESSION_ID}`)).toBeNull();
  });
});
