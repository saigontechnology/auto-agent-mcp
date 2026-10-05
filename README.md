# Auto Agent Claude Code plugin

The local half of Auto Agent's **Send to Claude**. On a web app running on your machine (`localhost`, `127.0.0.1`, `*.localhost`), the Auto Agent browser extension lets you pick an element, say what is wrong (or rewrite its text in place, or comment on the page) and press **Send to Claude**. This plugin receives that feedback and hands it to the Claude Code session working on the app's repository, which fixes it and reports back to the extension.

```text
Chrome: Auto Agent extension ──WebSocket, 127.0.0.1──▶ auto-agent plugin ──MCP──▶ Claude Code
   pick · comment · send                                   queue                fixes the code
   ◀──────────────── Queued → Claude is fixing → Done, with a summary ──────────────────────
```

Pages on deployed demos are unaffected: there the extension still sends feedback to Auto Agent.

## Install

In Claude Code, in your project:

```text
/plugin marketplace add <this repository's git URL>
/plugin install auto-agent@auto-agent
```

Restart Claude Code. The plugin starts one server per session. Requires Node.js 20 or newer. There is nothing to pair: the extension finds the session by itself.

### Let Claude start fixing as soon as feedback arrives (optional)

Channels are a Claude Code research preview. To have feedback pushed straight into the session, start Claude with:

```bash
claude --dangerously-load-development-channels plugin:auto-agent@auto-agent
```

Claude Code shows a warning first; choose **I am using this for local development**. A shell alias helps: `alias claudefix='claude --dangerously-load-development-channels plugin:auto-agent@auto-agent'`.

Without the flag everything still works: run `/auto-agent:fix` when the extension shows **Queued**. A hook also reminds Claude of waiting feedback when you send a prompt.

## What Claude gets

| Tool | Purpose |
|---|---|
| `auto_agent_status` | Session, repository, port and batch counts |
| `auto_agent_list_batches` | Queued and working batches (or by status) |
| `auto_agent_claim_batch` | Claims a batch and returns its items as markdown |
| `auto_agent_report` | Reports `done` / `partial` / `failed` with a summary and per-item results |
| `auto_agent_import` | Queues a JSON file exported from the extension |

A batch can be claimed by one session only, so two Claude windows on the same repository never fix the same feedback twice.

## Security model

- The server listens on `127.0.0.1` only, on the first free port of 47320–47329, path `/auto-agent`.
- A connection must come from the Auto Agent extension (`Origin: chrome-extension://halobcdjpokedneejfmdjecjgdkejjdk`) to a loopback `Host`; web pages, other extensions and DNS-rebinding hosts are refused at the handshake. There is no pairing token.
- Everything captured from a web page is passed to Claude as fenced, untrusted data with an instruction never to follow it.
- The server has no tool that runs commands or writes files in your repository; code changes go through Claude's normal permissions.

## Files

```text
~/.auto-agent/                0700
  queue/<repo-key>/<batch>/   batch.json, state.json
```

Finished batches are deleted after 7 days. Set `AUTO_AGENT_HOME` to use another directory.

## Protocol

The extension and server speak protocol 1 over WebSocket. Types, schemas and the batch markdown renderer are in `@auto-agent/protocol` (`packages/protocol`), which the extension links to.

| Direction | Messages |
|---|---|
| Server → extension | `server.info`, `welcome`, `batch.accepted`, `batch.status`, `pong`, `error` |
| Extension → server | `hello`, `batch.submit`, `batch.watch`, `batch.cancel`, `ping` |

## Development

```bash
pnpm install
pnpm test          # unit tests
pnpm test:e2e      # builds, then drives plugin/dist/server.mjs end to end
pnpm build         # rebuild plugin/dist (commit the result; a test checks it is fresh)
pnpm compile       # type-check
pnpm --filter @auto-agent/protocol build   # build the protocol package the extension links to
```

The extension repository links `@auto-agent/protocol` from `../auto-agent-claude-plugin/packages/protocol`, so check the two repositories out next to each other.

`AUTO_AGENT_EXTENSION_IDS=<id>[,<id>]` allows extra extension ids, for unpacked builds made without the Auto Agent key.

Design: `docs/specs/2026-10-02-claude-plugin-design.md`.

## Origin

Forked from PickFix (`github.com/ledutu-studio/pickfix-mcp` at `1c01a8c`), MIT. See `LICENSE`.

## Tiếng Việt

Plugin này nhận feedback từ extension Auto Agent khi bạn review app chạy ở localhost, rồi chuyển cho Claude Code đang mở trong repo của app để sửa.

1. Cài trong Claude Code: `/plugin marketplace add <git URL của repo này>` rồi `/plugin install auto-agent@auto-agent`, sau đó khởi động lại Claude Code. Không cần ghép cặp.
2. Muốn Claude tự sửa ngay khi nhận feedback: mở Claude bằng `claude --dangerously-load-development-channels plugin:auto-agent@auto-agent`.
3. Không dùng cờ đó thì gõ `/auto-agent:fix` khi panel hiện **Queued**.
