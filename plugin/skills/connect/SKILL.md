---
name: connect
description: Show the connect code that pairs this Claude Code session with the Auto Agent extension. Use when the extension does not find this session, or the user asks for the Auto Agent port, session id or connect code.
---

Give the user the code that connects the Auto Agent extension to this session.

1. Call `auto_agent_get_session`.
2. If it returns a connect code, show the code on its own line in a code block so it is easy to copy, then tell the user: in the Auto Agent extension panel, choose "Connect manually" (or "Change", then "Connect manually"), paste the code and press Connect. Mention that the code changes when this Claude Code session restarts.
3. If it reports that this session has no extension link, pass on the reason it gives and what to do about it. Do not make up a code.

Answer in the user's language. Do not change any files.
