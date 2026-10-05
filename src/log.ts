/** stdout carries the MCP protocol, so every diagnostic goes to stderr. */
export function log(message: string): void {
  process.stderr.write(`[auto-agent] ${message}\n`);
}
