# Auto Agent Claude Code Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this repo into a rebranded copy of `pickfix-mcp` (protocol without pairing) that serves the Auto Agent extension.

**Architecture:** Copy `pickfix-mcp` at commit `1c01a8c` verbatim, then change only names, protocol constants, extension identity and packaging, in focused commits. No behaviour changes: the copied unit and end-to-end suites, with renames applied, prove the fork still works.

**Tech Stack:** Node 20+, TypeScript, pnpm workspace, `@modelcontextprotocol/sdk` 1.31.0, `ws`, `zod` 4, esbuild, vitest.

**Spec:** `docs/specs/2026-10-02-claude-plugin-design.md` (this repo). Fork base: `/Users/tungle/ledutu/frontend-quickfix/pickfix-mcp` at `1c01a8c`, whose own spec is `docs/specs/2026-10-02-pickfix-mcp-design.md` there.

## Global Constraints

- Node 20 or newer; pnpm 10 (`packageManager` stays `pnpm@10.33.0`).
- `PROTOCOL_VERSION = 1`, `APP_ID = 'auto-agent'`, ports `47320`–`47329`, `WS_PATH = '/auto-agent'`, `BATCH_SCHEMA = 'auto-agent.batch/1'`.
- `EXTENSION_ID = 'halobcdjpokedneejfmdjecjgdkejjdk'`; `EXTENSION_PUBLIC_KEY` is the `key` in `/Users/tungle/saigontechnology/vibe-extension/wxt.config.ts`.
- Names: marketplace `auto-agent`, plugin `auto-agent` (display name `Auto Agent`), MCP server `auto-agent`, skill `/auto-agent:fix`, tools `auto_agent_status`, `auto_agent_list_batches`, `auto_agent_claim_batch`, `auto_agent_report`, `auto_agent_import`, package `@auto-agent/protocol`, root package `auto-agent-claude-plugin` (private).
- Home `~/.auto-agent`, override `AUTO_AGENT_HOME`; extra ids `AUTO_AGENT_EXTENSION_IDS`.
- Every text Claude reads is English and says "Auto Agent" / "the Auto Agent browser extension", never "PickFix".
- Not published to npm: no `bin`, no `files`, no publish workflow.
- `LICENSE` keeps PickFix's MIT text and copyright line.
- Versions start at `0.1.0` in `package.json`, `plugin/.claude-plugin/plugin.json` and `src/version.ts`.

## Review Focus

- **PickFix and Auto Agent on one machine:** both servers bind different port ranges and home directories; a PickFix extension connecting to an Auto Agent port is refused at the handshake (Origin). Pinned in Task 2 (ws-guard test with PickFix's id).
- **An extension still speaking PickFix's protocol 2:** `hello { protocol: 2 }` gets `protocol-mismatch`, not a silent accept. Pinned in Task 2 (bridge test).
- **Leftover "pickfix" in text Claude reads** (tool descriptions, channel text, hook output, skill, batch markdown header): would confuse Claude and users. Pinned in Task 3 (brand test).
- **Stale bundle:** `plugin/dist/*.mjs` must be rebuilt after every source change; the copied bundle-freshness test catches it. Every task that touches `src/` or `packages/protocol/src` ends with `pnpm build`.
- **Env var rename missed in the hook:** the hook resolves the home directory separately from the server; a hook still reading `PICKFIX_HOME` would count the wrong queue. Pinned in Task 3 (hook test uses `AUTO_AGENT_HOME`).

---

### Task 1: Copy pickfix-mcp verbatim

**Files:**
- Create: everything tracked in `pickfix-mcp` at `1c01a8c`, except `docs/`
- Keep: `docs/specs/2026-10-02-claude-plugin-design.md`, `docs/plans/2026-10-05-claude-plugin.md`

**Interfaces:**
- Produces: a working copy of PickFix whose suites pass, as the base for every later diff.

- [ ] **Step 1: Export the tracked tree at the fork commit**

```bash
cd /Users/tungle/saigontechnology/auto-agent-claude-plugin
git -C /Users/tungle/ledutu/frontend-quickfix/pickfix-mcp archive 1c01a8c --format=tar \
  | tar -x -C . --exclude='docs'
ls -a
```

Expected: `.claude-plugin .github .gitignore .nvmrc LICENSE PRIVACY.md README.md package.json packages plugin pnpm-lock.yaml pnpm-workspace.yaml scripts src test tsconfig.json vitest.config.ts vitest.e2e.config.ts docs`, and `docs/` still holds only this repo's spec and plan.

- [ ] **Step 2: Commit the unchanged copy**

```bash
git add -A
git commit -m "chore: copy pickfix-mcp 1c01a8c

Unchanged copy of github.com/ledutu-studio/pickfix-mcp at 1c01a8c (MIT),
the version without pairing. The rebrand follows in separate commits."
```

- [ ] **Step 3: Install and run the baseline**

```bash
pnpm install --frozen-lockfile
pnpm compile && pnpm test && pnpm test:e2e
git status --short
```

Expected: all pass, exactly as in PickFix, and `git status` is clean (`test:e2e` rebuilds `plugin/dist`; an identical rebuild proves the copied bundle matches its sources). If anything fails or differs here, stop and report: the problem is in the base, not the fork.

---

### Task 2: Protocol constants and extension identity

**Files:**
- Modify: `packages/protocol/src/constants.ts`, `packages/protocol/src/extension-identity.ts`
- Test: `packages/protocol/test/constants.test.ts`, `packages/protocol/test/messages.test.ts`, `test/bridge.test.ts`, `test/ws-guard.test.ts`, `test/tools.test.ts`, `test/net-helpers.ts`, `test/e2e/server.e2e.test.ts`, and any other test that hard-codes `47400`, `/pickfix` as a WS path, `app: 'pickfix'`, `pickfix.batch/1` or `protocol: 2`

**Interfaces:**
- Produces (exported from `@pickfix/protocol`, renamed to `@auto-agent/protocol` in Task 3): `PROTOCOL_VERSION = 1`, `APP_ID = 'auto-agent'`, `PORT_FIRST = 47320`, `PORT_LAST = 47329`, `PORTS`, `WS_PATH = '/auto-agent'`, `BATCH_SCHEMA = 'auto-agent.batch/1'`, `EXTENSION_PUBLIC_KEY`, `EXTENSION_ID = 'halobcdjpokedneejfmdjecjgdkejjdk'`.

- [ ] **Step 1: Change the constant tests first**

In `packages/protocol/test/constants.test.ts` replace the first two tests with:

```ts
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
```

and extend its import to `APP_ID, BATCH_SCHEMA, ID_PATTERN, LIMITS, MAX_MESSAGE_BYTES, PORTS, PORT_FIRST, PORT_LAST, PROTOCOL_VERSION, WS_PATH`.

In `packages/protocol/test/extension-identity.test.ts` add inside the `describe`:

```ts
  it('is the Auto Agent extension', () => {
    expect(EXTENSION_ID).toBe('halobcdjpokedneejfmdjecjgdkejjdk');
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run packages/protocol/test/constants.test.ts packages/protocol/test/extension-identity.test.ts`
Expected: FAIL on ports, app id, version, path, schema and extension id.

- [ ] **Step 3: Change the constants**

`packages/protocol/src/constants.ts`:

```ts
export const PROTOCOL_VERSION = 1;
export const APP_ID = 'auto-agent';

export const PORT_FIRST = 47320;
export const PORT_LAST = 47329;
```

and `export const WS_PATH = '/auto-agent';`, `export const BATCH_SCHEMA = 'auto-agent.batch/1';`.

`packages/protocol/src/extension-identity.ts` becomes:

```ts
// The Auto Agent extension's manifest `key` (wxt.config.ts in the extension repo). It pins the
// extension id on every machine; the matching private key only signs a packed .crx.

/** The value of the extension manifest's `key`: base64 DER SubjectPublicKeyInfo. */
export const EXTENSION_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuBoxdGJlF6kT8KPBPFakT7hrTQTBv2m8CGtHs7zs4d9vTC3fQ2GKvIn6xuYiXvHXTLhWTEf16Vi0wzyHmiZ6Y4reG3Z8ImVE8VWV2Btl6OiuF49GjvhoB2BluN3S8/oyhRct7PnW/ybvMZ/b54tQnXQPG6d5e2rM7ybjuzUzdQbIcN44os52hFTZZKHnUMEXANjyKzyPL4EX71hnBHyYA9RFHd7LG+kuZGcDxGSYcE4LUobfJw0x9WuPco5UdHlIc9Zj83JAXS3BZyuAxcA6tGhqyIlJMFOy0XuQlJ16w/kX4c11eLfcL8F2EnnC+gNJ0DAlLkU089+4M1bLZ2eRfQIDAQAB';

/** The Chrome extension id derived from EXTENSION_PUBLIC_KEY. */
export const EXTENSION_ID = 'halobcdjpokedneejfmdjecjgdkejjdk';
```

(Copy the key from `wxt.config.ts` rather than retyping it; the derivation test fails on any typo.)

- [ ] **Step 4: Run the protocol tests**

Run: `pnpm vitest run packages/protocol`
Expected: constants and identity PASS. `messages.test.ts` and `schemas.test.ts`/`markdown.test.ts` may now fail where they hard-code `protocol: 2` or `pickfix.batch/1`.

- [ ] **Step 5: Update the hard-coded literals in tests**

Find them:

```bash
git grep -n -E "4740[0-9]|'/pickfix'|/pickfix'|app: 'pickfix'|pickfix\.batch/1|protocol: [12]\b" -- test packages/protocol/test
```

Apply, in each hit:
- `47400`–`47409` → `47320`–`47329` (same offset: `47401` → `47321`, and the range text `47400–47409` → `47320–47329`).
- WebSocket path `/pickfix` → `/auto-agent` (e.g. `ws://127.0.0.1:47400/pickfix` → `ws://127.0.0.1:47320/auto-agent`).
- `app: 'pickfix'` → `app: 'auto-agent'`.
- `pickfix.batch/1` → `auto-agent.batch/1` (fixtures should use the `BATCH_SCHEMA` constant where they already do).
- A **valid** hello's `protocol: 2` → `protocol: 1`.
- A **mismatch** case that sent `protocol: 1` (with the old `token` field, in `test/bridge.test.ts` and `test/e2e/server.e2e.test.ts`) → send `protocol: 2` without `token`, and expect `protocol-mismatch` as before.

Then add to `test/ws-guard.test.ts`, inside its `describe`:

```ts
  it('refuses the PickFix extension, so both products can share a machine', () => {
    const pickfix = { ...good, origin: 'chrome-extension://eehanlcaccamfaalnfcikkdneffjkife' };
    expect(checkUpgrade(req(pickfix), 47320, origins)).toMatchObject({ ok: false, status: 403 });
  });
```

and to `test/bridge.test.ts`, next to the existing mismatch test (reuse its client helpers):

```ts
it('answers protocol-mismatch to an extension speaking PickFix protocol 2', async () => {
  const client = await connect();
  await client.next(); // server.info
  client.send({ ...hello(), protocol: 2 });
  expect(await client.next()).toMatchObject({ type: 'error', code: 'protocol-mismatch' });
});
```

(Use the file's own names for `connect`/`client.next`; if the existing mismatch test already sends `protocol: 2` after the edit above, this test is that test — keep one.)

- [ ] **Step 6: Run everything and rebuild**

```bash
pnpm compile && pnpm test && pnpm build && pnpm test:e2e
```

Expected: all PASS, including `test/bundle.test.ts` after `pnpm build`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: give the protocol Auto Agent's identity, ports and version"
```

---

### Task 3: Rename the product

**Files:**
- Modify: every file listed by `git grep -l -i pickfix -- . ':!LICENSE' ':!README.md' ':!PRIVACY.md' ':!pnpm-lock.yaml' ':!plugin/dist' ':!.github/workflows/publish.yml' ':!docs'`
- Rename: `pickfixHome` in `src/home.ts` → `autoAgentHome`
- Create: `test/brand.test.ts`
- Modify: `pnpm-lock.yaml` (regenerated)

**Interfaces:**
- Consumes: Task 2's constants.
- Produces: package `@auto-agent/protocol` (same exports); tools `auto_agent_status`, `auto_agent_list_batches`, `auto_agent_claim_batch`, `auto_agent_report`, `auto_agent_import` (same inputs and outputs as the PickFix tools); `autoAgentHome(env?: NodeJS.ProcessEnv): string` reading `AUTO_AGENT_HOME`, default `~/.auto-agent`; `allowedOrigins` reading `AUTO_AGENT_EXTENSION_IDS`; plugin `auto-agent` in marketplace `auto-agent`, MCP server `auto-agent`, channel `{ server: 'auto-agent', displayName: 'Auto Agent' }`, skill `plugin/skills/fix/SKILL.md` invoked as `/auto-agent:fix`.

- [ ] **Step 1: Write the brand test**

`test/brand.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run test/brand.test.ts`
Expected: FAIL, listing the files that still say PickFix.

- [ ] **Step 3: Apply the mechanical renames**

Run from the repo root, in this order (longer, more specific patterns first):

```bash
FILES=$(git grep -l -i pickfix -- . ':!LICENSE' ':!README.md' ':!PRIVACY.md' ':!pnpm-lock.yaml' ':!plugin/dist' ':!.github/workflows/publish.yml' ':!docs')
perl -pi -e '
  s{\@pickfix/protocol}{\@auto-agent/protocol}g;
  s{plugin:pickfix\@pickfix}{plugin:auto-agent\@auto-agent}g;
  s{pickfix\@pickfix}{auto-agent\@auto-agent}g;
  s{/pickfix:fix}{/auto-agent:fix}g;
  s{pickfix_}{auto_agent_}g;
  s{PICKFIX_}{AUTO_AGENT_}g;
  s{pickfixHome}{autoAgentHome}g;
  s{__pickfixCreateRequire}{__autoAgentCreateRequire}g;
  s{pickfix-export\.json}{auto-agent-export.json}g;
  s{the PickFix browser extension}{the Auto Agent browser extension}g;
  s{the PickFix extension}{the Auto Agent extension}g;
  s{PickFix}{Auto Agent}g;
  s{\.pickfix\b}{.auto-agent}g;
  s{pickfix}{auto-agent}g;
' $FILES
git grep -n -i pickfix -- . ':!LICENSE' ':!README.md' ':!PRIVACY.md' ':!pnpm-lock.yaml' ':!plugin/dist' ':!.github/workflows/publish.yml' ':!docs'
```

Expected: the final grep prints nothing.

- [ ] **Step 4: Fix the texts the substitutions made awkward**

Read each of these and correct by hand:

- `src/bridge.ts` mismatch message → exactly: `` `This server speaks protocol ${PROTOCOL_VERSION} and the extension speaks protocol ${message.protocol}. Update the Auto Agent extension and the Auto Agent plugin.` ``
- `src/bridge.ts` comment → `// The Origin check is the whole gate: only the Auto Agent extension can open a socket from a browser.`
- `src/prompts.ts` `SERVER_INSTRUCTIONS` first sentence → `Auto Agent connects this session to the Auto Agent browser extension. Developers pin feedback on elements of a web app running on this machine; each submission arrives as a "batch".` (Auto Agent's local mode is for developers only; drop "QA and PMs".)
- `src/prompts.ts` `FIX_DESCRIPTION` → `'Fix UI feedback that the Auto Agent browser extension queued for this repository. Use when the user mentions Auto Agent feedback, queued UI feedback or a batch id to handle. Do not use for bug reports or UI changes the user describes directly.'`
- `plugin/skills/fix/SKILL.md`: its `description` and body must equal `FIX_DESCRIPTION` and `FIX_BODY` (the copied `test/plugin.test.ts` checks this).
- `packages/protocol/package.json` `description` → `"Wire protocol, schemas and batch markdown shared by the Auto Agent extension and its Claude Code plugin."`
- `.claude-plugin/marketplace.json` → `"owner": { "name": "Saigon Technology" }`, `"description": "Auto Agent: send UI feedback from the browser straight to Claude Code."`, plugin entry `description` `"Receive UI feedback from the Auto Agent browser extension and fix it in this session."`
- `plugin/.claude-plugin/plugin.json` → `"author": { "name": "Saigon Technology" }`, `"description": "Receive UI feedback from the Auto Agent browser extension (picked elements, text edits, page comments, recorded workflows) and fix it in this session."`, `keywords` unchanged.
- `src/log.ts`: confirm the prefix reads `auto-agent`.
- `src/home.ts`: confirm `autoAgentHome` returns `env.AUTO_AGENT_HOME ?? join(homedir(), '.auto-agent')`.
- `test/hook.test.ts`: confirm it sets `AUTO_AGENT_HOME` (the hook must read the renamed variable).

- [ ] **Step 5: Regenerate the lockfile and run everything**

```bash
pnpm install
pnpm compile && pnpm test && pnpm build && pnpm test:e2e
```

Expected: all PASS, including `test/brand.test.ts` and `test/bundle.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: rename the plugin, tools, package and texts to Auto Agent"
```

---

### Task 4: Packaging, removals and README

**Files:**
- Modify: `package.json`, `plugin/.claude-plugin/plugin.json`, `src/version.ts`, `scripts/bump-version.mjs` (only if it names npm), `.github/workflows/ci.yml` (only if it names PickFix)
- Delete: `.github/workflows/publish.yml`, `PRIVACY.md`
- Rewrite: `README.md`
- Keep: `LICENSE` unchanged

**Interfaces:**
- Consumes: Task 3's names.
- Produces: version `0.1.0` everywhere; a private package with no `bin`/`files`.

- [ ] **Step 1: Change the version test expectation first**

`test/plugin.test.ts` already checks that the three versions match. Add to it:

```ts
  it('is a private package, not published to npm', () => {
    const pkg = json('package.json');
    expect(pkg.name).toBe('auto-agent-claude-plugin');
    expect(pkg.private).toBe(true);
    expect(pkg.bin).toBeUndefined();
    expect(pkg.files).toBeUndefined();
    expect(SERVER_VERSION).toBe('0.1.0');
  });
```

Run: `pnpm vitest run test/plugin.test.ts`
Expected: FAIL (name, private, bin, files, version).

- [ ] **Step 2: Rewrite `package.json`**

```json
{
  "name": "auto-agent-claude-plugin",
  "version": "0.1.0",
  "private": true,
  "description": "Claude Code plugin that receives UI feedback from the Auto Agent browser extension and hands it to Claude.",
  "license": "MIT",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "build": "node scripts/bundle.mjs",
    "test": "vitest run",
    "test:e2e": "node scripts/bundle.mjs && vitest run --config vitest.e2e.config.ts",
    "compile": "tsc --noEmit && pnpm --filter @auto-agent/protocol compile"
  },
  "devDependencies": {
    "@modelcontextprotocol/sdk": "1.31.0",
    "@auto-agent/protocol": "workspace:*",
    "@types/node": "^22.20.4",
    "@types/ws": "^8.18.2",
    "esbuild": "^0.28.2",
    "typescript": "^7.0.2",
    "vitest": "^5.0.3",
    "ws": "^8.22.0",
    "zod": "^4.6.5"
  }
}
```

Keep any script the copied `package.json` has beyond these four (for example a `bump` script) — compare with `git show HEAD:package.json` and carry them over.

Set `"version": "0.1.0"` in `plugin/.claude-plugin/plugin.json` and `export const SERVER_VERSION = '0.1.0';` in `src/version.ts`.

- [ ] **Step 3: Remove publishing and the privacy policy**

```bash
git rm .github/workflows/publish.yml PRIVACY.md
git grep -n -i -E "npm|npx|publish" -- scripts .github src
```

Edit any hit that refers to publishing pickfix to npm (comments in `scripts/bump-version.mjs` may mention it: reword to "Bumps the version in package.json, plugin.json and src/version.ts"). Leave `pnpm` commands alone.

- [ ] **Step 4: Rewrite `README.md`**

Write it per spec section 6, in this order: one-paragraph purpose with the ASCII diagram (Chrome: Auto Agent extension ──WebSocket, 127.0.0.1──▶ auto-agent plugin ──MCP──▶ Claude Code); **Install** (`/plugin marketplace add <this repo's git URL>`, `/plugin install auto-agent@auto-agent`, restart Claude Code, Node 20+); **Start fixing as soon as feedback arrives** (`claude --dangerously-load-development-channels plugin:auto-agent@auto-agent`, the warning, `alias claudefix=…`; without it `/auto-agent:fix` and the hook reminder); **What Claude gets** (the five tools table, copied from PickFix with renamed tools, minus nothing); **Security model** (loopback `127.0.0.1` only, ports 47320–47329, path `/auto-agent`; `Origin` must be the Auto Agent extension and `Host` loopback; no pairing; page content fenced as untrusted; no tool runs commands or writes files); **Files** (`~/.auto-agent/queue/<repo-key>/<batch>/`, 7-day retention, `AUTO_AGENT_HOME`); **Protocol** (protocol 1, the message table copied from PickFix, types in `@auto-agent/protocol`); **Development** (`pnpm install`, `pnpm test`, `pnpm test:e2e`, `pnpm build` and commit `plugin/dist`, `pnpm compile`, `pnpm --filter @auto-agent/protocol build` for the extension's link, `AUTO_AGENT_EXTENSION_IDS`); **Origin** ("Forked from PickFix, github.com/ledutu-studio/pickfix-mcp at 1c01a8c, MIT"); a short **Tiếng Việt** summary of install, channel flag and `/auto-agent:fix`.

- [ ] **Step 5: Final checks**

```bash
pnpm install
pnpm compile && pnpm test && pnpm build && pnpm test:e2e
git grep -n -i pickfix -- . ':!pnpm-lock.yaml' ':!plugin/dist' ':!docs'
grep -c -i pickfix plugin/dist/server.mjs plugin/dist/hook.mjs
```

Expected: all tests PASS; the `git grep` shows only `LICENSE`'s copyright line (if it names PickFix) and the README's fork note; the bundles contain `0` matches.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: package Auto Agent's plugin privately at 0.1.0 with its own README"
```

- [ ] **Step 7: Build the protocol package for the extension's link**

```bash
pnpm --filter @auto-agent/protocol build
ls packages/protocol/dist/index.js packages/protocol/dist/index.d.ts
```

Expected: both exist (they are git-ignored; the extension plan links to them).
