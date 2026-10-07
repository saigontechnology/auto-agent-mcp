# Auto Agent Claude Code plugin

The local half of Auto Agent's **Send to Claude**. On a web app running on your machine (`localhost`, `127.0.0.1`, `*.localhost`), the Auto Agent browser extension lets you pick an element, say what is wrong (or rewrite its text in place, or comment on the page) and press **Send to Claude**. This plugin receives that feedback and hands it to the Claude Code session working on the app's repository, which fixes it and reports back to the extension.

```text
Chrome: Auto Agent extension ──WebSocket, 127.0.0.1──▶ auto-agent plugin ──MCP──▶ Claude Code
   pick · comment · send                                   queue                fixes the code
   ◀──────────────── Queued → Claude is fixing → Done, with a summary ──────────────────────
```

Pages on deployed demos are unaffected: there the extension still sends feedback to Auto Agent.

## Watch the guide

https://github.com/user-attachments/assets/a61e9003-7a13-4883-a139-f99ebdc2c938

A 76-second walkthrough, no sound: install the plugin, start Claude with the channel, pin feedback on an app running on localhost, send it, and review Claude's fix. To download it: [docs/media/auto-agent-claude-code-guide.mp4](docs/media/auto-agent-claude-code-guide.mp4).

## Install

Requires Node.js 20 or newer, Claude Code, and the Auto Agent extension in Chrome.

In Claude Code, in your project:

```text
/plugin marketplace add saigontechnology/auto-agent-mcp
/plugin install auto-agent@auto-agent
```

Or from a terminal:

```bash
claude plugin marketplace add saigontechnology/auto-agent-mcp
claude plugin install auto-agent@auto-agent
```

`saigontechnology/auto-agent-mcp` is short for `https://github.com/saigontechnology/auto-agent-mcp.git`; either works. The marketplace is named `auto-agent` and holds one plugin, also named `auto-agent`.

Restart Claude Code. The plugin starts one server per session. There is nothing to pair: the extension finds the session by itself. If it ever does not, see [Connect manually](#connect-manually).

To get a newer version later:

```text
/plugin marketplace update auto-agent
```

### Let Claude start fixing as soon as feedback arrives (optional)

Channels are a Claude Code research preview. To have feedback pushed straight into the session, start Claude with:

```bash
claude --dangerously-load-development-channels plugin:auto-agent@auto-agent
```

Claude Code shows a warning first; choose **I am using this for local development**. A shell alias helps: `alias claudefix='claude --dangerously-load-development-channels plugin:auto-agent@auto-agent'`.

Without the flag everything still works: run `/auto-agent:fix` when the extension shows **Queued**. `/auto-agent:connect` prints the code for [Connect manually](#connect-manually). A hook also reminds Claude of waiting feedback when you send a prompt.

## Use it

1. Start Claude Code in your app's repository (with the channel flag above if you want fixes to start on their own), run the app, and open it on `localhost`.
2. Click the Auto Agent icon to open the panel. No sign-in is needed on a local page. The panel shows **To Claude · \<repository\>**. If no session is found yet, it lists the install steps; start Claude Code and press **Retry**. With several sessions running, pick one (remembered per site; **Change** picks another).
3. Choose **Select** and click an element, say what should change, and press **Save**. **Text** rewrites a piece of text in place, and **Add page comment** covers the whole page. Each draft is numbered on the page.
4. Press **Send N drafts to Claude**. The batch shows **Queued**, then **Claude is fixing**, then **Done**, **Partly done** or **Couldn't fix**, with Claude's summary and each item's outcome.

Feedback sent while Claude Code is closed shows **Not yet received** and goes out when it starts. A queued batch can be cancelled, and a batch Claude Code refused can go back to drafts.

## Connect manually

The extension looks for sessions on ports 47320–47329 every few seconds. When it does not find yours (the session list is empty, the wrong session is shown, or it stays on **Waiting for Claude Code**):

1. Press the refresh icon (↻) next to **Change**, or at the top of the session list, to look on every port again, including ports that refused an earlier handshake.
2. Still not there? In Claude Code, run:

   ```text
   /auto-agent:connect
   ```

   Claude calls `auto_agent_get_session` and prints this session's connect code, `<port>:<sessionId>`, for example `47321:690c66af-7bf3-4388-9a9a-9fca822f294b`. You can also ask Claude for `auto_agent_get_session` directly.
3. In the panel, choose **Connect manually** (on the "No Claude Code session" card, or **Change** → **Connect manually**), paste the code and press **Connect**. The extension connects straight to that port, checks that the session id matches, and sends this site's feedback to that session from then on.

The code changes every time the Claude Code session restarts; run `/auto-agent:connect` again for the new one.

| The panel says | What to do |
|---|---|
| This is not an Auto Agent connect code | Paste the whole code, port and session id; only ports 47320–47329 are accepted. |
| Nothing answered on port … | That session is closed. Start Claude Code again and get a new code. |
| Port … now belongs to another Claude Code session | The session restarted and another one took the port. Get a new code. |
| … did not answer in time | The session is busy or stuck. Restart it, or press ↻ and try again. |
| The Auto Agent plugin and this extension don't match | Update both: `/plugin marketplace update auto-agent` and the latest extension. |
| The extension did not respond | The extension's background is still an older build. Open `chrome://extensions` and press reload on Auto Agent. `/reload-plugins` reloads the plugin only, not the extension. |

If `/auto-agent:connect` reports that the session has no extension link, all ten ports are taken (or the server could not start): close a Claude Code session you no longer use and restart this one.

## What Claude gets

| Tool | Purpose |
|---|---|
| `auto_agent_status` | Session, repository, port and batch counts |
| `auto_agent_get_session` | Connect code (`port:sessionId`) to paste under **Connect manually** in the extension when it does not find this session on its own |
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
git clone https://github.com/saigontechnology/auto-agent-mcp.git auto-agent-claude-plugin
cd auto-agent-claude-plugin
pnpm install
pnpm test          # unit tests
pnpm test:e2e      # builds, then drives plugin/dist/server.mjs end to end
pnpm build         # rebuild plugin/dist (commit the result; a test checks it is fresh)
pnpm compile       # type-check
pnpm bump-version-patch   # or -minor / -major: bump the version everywhere and rebuild plugin/dist (do this in every release PR)
pnpm --filter @auto-agent/protocol build   # build the protocol package the extension links to
```

The extension repository links `@auto-agent/protocol` from `../auto-agent-claude-plugin/packages/protocol`, so check the two repositories out next to each other.

`AUTO_AGENT_EXTENSION_IDS=<id>[,<id>]` allows extra extension ids, for unpacked builds made without the Auto Agent key.

Design: `docs/specs/2026-10-02-claude-plugin-design.md`.

## Origin

Forked from PickFix (`github.com/ledutu-studio/pickfix-mcp` at `1c01a8c`), MIT. See `LICENSE`.

## Tiếng Việt

Plugin này nhận feedback từ extension Auto Agent khi bạn review app chạy ở localhost, rồi chuyển cho Claude Code đang mở trong repo của app để sửa. Xem video hướng dẫn (tiếng Anh, 1 phút 16 giây): [docs/media/auto-agent-claude-code-guide.mp4](docs/media/auto-agent-claude-code-guide.mp4).

1. Cài trong Claude Code (cần Node.js 20 trở lên): `/plugin marketplace add saigontechnology/auto-agent-mcp` rồi `/plugin install auto-agent@auto-agent`, sau đó khởi động lại Claude Code. Không cần ghép cặp. Cập nhật bản mới: `/plugin marketplace update auto-agent`.
2. Muốn Claude tự sửa ngay khi nhận feedback: mở Claude bằng `claude --dangerously-load-development-channels plugin:auto-agent@auto-agent`.
3. Không dùng cờ đó thì gõ `/auto-agent:fix` khi panel hiện **Queued**.
4. Mở app ở localhost, mở panel Auto Agent (không cần đăng nhập), chọn **Select** rồi click vào phần tử cần sửa, ghi nội dung và **Save**, cuối cùng bấm **Send N drafts to Claude**. Panel hiện **Queued** → **Claude is fixing** → **Done** kèm tóm tắt của Claude.

### Kết nối thủ công

Extension tự dò các port 47320–47329 vài giây một lần. Nếu panel không thấy phiên Claude Code của bạn:

1. Bấm icon refresh (↻) cạnh **Change** hoặc ở đầu danh sách phiên để dò lại tất cả port.
2. Vẫn không thấy thì gõ `/auto-agent:connect` trong Claude Code. Claude gọi `auto_agent_get_session` và in ra mã kết nối dạng `<port>:<sessionId>`, ví dụ `47321:690c66af-7bf3-4388-9a9a-9fca822f294b`.
3. Trong panel, chọn **Connect manually** (hoặc **Change** → **Connect manually**), dán mã rồi bấm **Connect**. Extension nối thẳng vào port đó, kiểm tra session id có khớp không, rồi từ đó gửi feedback của trang này tới phiên ấy.

Mã đổi mỗi khi phiên Claude Code khởi động lại, lúc đó chạy lại `/auto-agent:connect`. Nếu panel báo **The extension did not respond**, extension vẫn đang chạy bản cũ: vào `chrome://extensions` và bấm reload ở Auto Agent (`/reload-plugins` chỉ nạp lại plugin, không nạp lại extension). Các lỗi khác và cách xử lý: xem bảng ở mục [Connect manually](#connect-manually).
