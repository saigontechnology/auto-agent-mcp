import { ID_PATTERN, PORTS } from './constants.js';

/** What a reviewer pastes into the extension to reach one session directly when the port scan does not find it. */
export type ConnectCode = { port: number; sessionId: string };

export function formatConnectCode(port: number, sessionId: string): string {
  return `${port}:${sessionId}`;
}

/** The port and session id in a pasted code, or null when it is not a code for an Auto Agent port. */
export function parseConnectCode(text: string): ConnectCode | null {
  const match = /^(\d{1,5}):([^:]+)$/.exec(text.trim().replace(/^[`"']+|[`"']+$/g, ''));
  if (!match) return null;
  const port = Number(match[1]);
  const sessionId = match[2]!;
  if (!PORTS.includes(port) || !ID_PATTERN.test(sessionId)) return null;
  return { port, sessionId };
}
