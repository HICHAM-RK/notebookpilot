# Native WebMCP verification gate

Status: NOT RUN. NotebookPilot has no extension or registered tools yet. Chromium foundation tests only prove the notebook runtime. They do not prove ChatGPT integration.

Run this after W1/W2 and again against the deployed site in E3:

1. Record date, commit, site URL, host app/version, browser/version and WebMCP API shape. Open the site in that host's browser and check actual native support. If unavailable, record the exact observation and leave this gate blocked; do not install a shim and call it native.
2. Discover registered tools through the host. Save names and argument schemas. Confirm the adapter registers once and removes tools when disposed.
3. Open a notebook, make an unsaved human edit and ask the host to read it. Confirm the response reflects live source, respects hidden-cell policy and stays within caps.
4. Ask for a harmless visible code change. Reject the proposal and confirm no mutation/execution. Repeat and accept, then confirm no execution until separate approval. Approve execution and compare host response with actual notebook output.
5. Edit a target while a proposal is pending; accepting must fail without overwriting. Repeat with permissions revoked before execution. Attempt unknown IDs, oversized arguments and an approval field; capture typed denial/errors without private data.
6. Close/reopen the notebook and restart its kernel while requests are pending. Confirm cancellation, no orphan execution and usable ordinary notebook controls.

## Evidence record template

Record commit/date/host/browser/API; discovery names; redacted prompts and actual calls; expected and observed outcomes; screenshots or trace location; limitations; pass/fail per step. Never include private datasets, tokens or account cookies. Explicitly label native, mock and shim evidence. Every required step must pass before claiming supported integration.

Protocol reference: [WebMCP draft](https://webmachinelearning.github.io/webmcp/), inspected 2026-10-23. Recheck its actual interface at implementation time because it remains a draft.
