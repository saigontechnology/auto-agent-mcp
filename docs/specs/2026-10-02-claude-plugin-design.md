# Auto Agent Claude Code Plugin — Design Spec

Date: 2026-10-02, revised 2026-10-05
Status: draft, awaiting review
Counterpart: the Auto Agent browser extension (`saigontechnology/auto-agent-extension`), spec `docs/superpowers/specs/2026-10-02-local-claude-bridge-design.md` there (the "extension spec")
Fork base: `pickfix-mcp` (`/Users/tungle/ledutu/frontend-quickfix/pickfix-mcp`, `github.com/ledutu-studio/pickfix-mcp`), MIT, by the same author. Its design spec, `docs/specs/2026-10-02-pickfix-mcp-design.md` there (the "PickFix spec"), describes everything this spec does not change.

## 1. Purpose

On a page served from the developer's own machine, the Auto Agent extension sends feedback to the Claude Code session working on that page's repository instead of to Auto Agent. This repo is the Claude Code side: a plugin with an MCP server that receives feedback batches from the extension over a loopback WebSocket, queues them on disk per repository, hands them to Claude, and streams each batch's outcome back.

PickFix already does exactly this for its own extension. This repo is a **copy of `pickfix-mcp` with the Auto Agent brand**, changed only where section 3 says.

**Success looks like:** a developer installs the plugin once; from then on feedback sent from a `localhost` page is fixed by Claude in the session working on that repo, and the extension shows **Done** with Claude's summary and per-item results.

## 2. Decisions

| Topic | Decision |
|---|---|
| Approach | Copy `pickfix-mcp` and rebrand. Its architecture, queue, WebSocket bridge, guard, channel, hook, tools, prompts, source-path normalisation, tests and bundling stay as they are |
| Fork base | `pickfix-mcp` at protocol 2 — the version **without pairing** (the extension is admitted by `Origin` and `Host` alone). As of 2026-10-05 that version is uncommitted in the PickFix working tree on top of `9a631b7`; it is committed there first, and the fork records that commit |
| History | Files are copied, not the git history. The first commit says which PickFix commit it copies |
| Pairing | None. No token, no pairing code, no pair skill or tool |
| Distribution | Claude Code plugin only, from this repo's marketplace. Not published to npm; no setup for Cursor, Codex or other clients |
| Users | Saigon Technology developers |
| License | PickFix's MIT `LICENSE` is kept with its copyright line, as MIT requires for copies |

### Out of scope

Everything PickFix leaves out (the agent calling back into the extension, live style tweaking, cloud sync, the organisation channel allowlist), plus npm publishing and non-Claude clients.

## 3. Changes from PickFix

### 3.1 Names

| Thing | PickFix | Auto Agent |
|---|---|---|
| Marketplace (`.claude-plugin/marketplace.json`) | `pickfix` | `auto-agent` |
| Plugin name and `displayName` | `pickfix`, PickFix | `auto-agent`, Auto Agent |
| Install | `/plugin install pickfix@pickfix` | `/plugin install auto-agent@auto-agent` |
| Fix skill | `/pickfix:fix` | `/auto-agent:fix` |
| MCP server name, channel `server` | `pickfix` | `auto-agent` |
| Channel flag | `plugin:pickfix@pickfix` | `plugin:auto-agent@auto-agent` |
| Tools | `pickfix_status`, `pickfix_list_batches`, `pickfix_claim_batch`, `pickfix_report`, `pickfix_import` | `auto_agent_status`, `auto_agent_list_batches`, `auto_agent_claim_batch`, `auto_agent_report`, `auto_agent_import` |
| MCP prompt | `fix` | `fix` (unchanged) |
| Protocol package | `@pickfix/protocol` | `@auto-agent/protocol` |
| Root `package.json` | `pickfix-mcp`, public, `bin`, `files` | `auto-agent-claude-plugin`, `"private": true`, no `bin`, no `files` |
| Home directory | `~/.pickfix`, override `PICKFIX_HOME` | `~/.auto-agent`, override `AUTO_AGENT_HOME` |
| Extra extension ids | `PICKFIX_EXTENSION_IDS` | `AUTO_AGENT_EXTENSION_IDS` |
| Text read by Claude (instructions, tool and parameter descriptions, channel text, batch markdown, errors, skill, hook output) | "PickFix", "the PickFix browser extension" | "Auto Agent", "the Auto Agent browser extension" |
| stderr log prefix | `pickfix` | `auto-agent` |

### 3.2 Protocol constants (`packages/protocol/src/constants.ts`, `extension-identity.ts`)

| Constant | PickFix | Auto Agent |
|---|---|---|
| `PROTOCOL_VERSION` | 2 | **1** (a new product starts at 1) |
| `APP_ID` | `pickfix` | `auto-agent` |
| `PORT_FIRST`–`PORT_LAST` | 47400–47409 | **47320–47329**, so both products can run on one machine |
| `WS_PATH` | `/pickfix` | `/auto-agent` |
| `BATCH_SCHEMA` | `pickfix.batch/1` | `auto-agent.batch/1` |
| `EXTENSION_PUBLIC_KEY` | PickFix's store key | The `key` in the Auto Agent extension's `wxt.config.ts` |
| `EXTENSION_ID` | `eehanlcaccamfaalnfcikkdneffjkife` | `halobcdjpokedneejfmdjecjgdkejjdk` |

Everything else in the protocol — messages, schemas, limits, the batch markdown renderer, `UNTRUSTED_NOTICE` — is unchanged. The extension spec maps the extension's own feedback types onto this protocol's `Batch` and `Item`.

### 3.3 Removed

- npm publishing: `bin`, `files`, release scripts, npm badges.
- README sections for Cursor, Codex and Claude Desktop, and for `npx`.
- PickFix's Chrome Web Store links and the store-id note.
- PickFix's own `docs/specs` and `docs/plans` (this spec and its plan replace them) and `.superpowers/`.
- `PRIVACY.md`: Auto Agent is an internal tool; the README's security section states what the server does with data.
- Anything left over from pairing, if the fork base still has it.

### 3.4 Kept as is

All of PickFix spec sections 4 (server units, batch lifecycle, on-disk queue, tools, claim markdown, source paths, hook), 5 (protocol, minus pairing), 6 (prompts, rebranded), 7 (error handling) and 8 (testing). The unit and end-to-end suites are copied with the renames applied and must pass unchanged in substance.

## 4. Fork procedure

1. In `pickfix-mcp`, commit the protocol-2 no-pairing work; note the commit.
2. Copy the PickFix tree into this repo, excluding `.git`, `node_modules`, `plugin/dist`, `.superpowers`, `docs/specs`, `docs/plans`. Commit as `chore: copy pickfix-mcp <sha>` with no changes, so the rebrand is a reviewable diff.
3. Apply section 3 in focused commits: constants and identity; package names; home and env names; tool, skill, plugin and marketplace names; agent-facing text; removals; README.
4. `pnpm install`, `pnpm build`, `pnpm compile`, `pnpm test`, `pnpm test:e2e`. Commit the rebuilt `plugin/dist`.
5. A grep for `pickfix`, `PickFix` and `PICKFIX` (case-insensitive) finds only the `LICENSE` copyright line and the fork note in the README.

## 5. Testing

- The copied suites, renamed, all pass.
- A new unit test pins the section 3.2 constants and that `EXTENSION_ID` is derived from `EXTENSION_PUBLIC_KEY` (PickFix already has the derivation test; it runs against the new key).
- A test fails if any agent-facing string contains "pickfix" (case-insensitive).
- By hand, once: real Claude Code with the Auto Agent extension, with and without `--dangerously-load-development-channels plugin:auto-agent@auto-agent`, on one machine that also runs PickFix.

## 6. Documentation

README, English then a short Vietnamese summary: what the plugin does; install (`/plugin marketplace add <this repo's git URL>`, `/plugin install auto-agent@auto-agent`, restart Claude Code); starting Claude with the channel flag and a suggested alias; `/auto-agent:fix` and the hook reminder; `~/.auto-agent` layout; port range; the security model (loopback only, `Origin` and `Host` checked at the handshake, page content fenced as untrusted, no tool that runs commands); the protocol table; development commands; and a note that the code is forked from PickFix (MIT).
