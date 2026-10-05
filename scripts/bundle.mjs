import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/** @type {import('esbuild').BuildOptions} */
export const options = {
  absWorkingDir: root,
  entryPoints: { server: 'src/server.ts', hook: 'src/hook.ts' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outdir: 'plugin/dist',
  outExtension: { '.js': '.mjs' },
  alias: { '@auto-agent/protocol': './packages/protocol/src/index.ts' },
  // ws loads these native accelerators only if present; without them it falls back to JavaScript.
  external: ['bufferutil', 'utf-8-validate'],
  banner: {
    js: "#!/usr/bin/env node\nimport { createRequire as __autoAgentCreateRequire } from 'node:module';\nconst require = __autoAgentCreateRequire(import.meta.url);",
  },
  legalComments: 'none',
  logLevel: 'warning',
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await build(options);
}
