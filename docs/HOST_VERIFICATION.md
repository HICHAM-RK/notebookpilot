# Native WebMCP verification gate

Status: PARTIAL NATIVE PASS (2026-10-24). The in-app browser discovered and invoked both read tools on the local build at http://127.0.0.1:8001/lab/index.html. No shim was installed. The full proposal/approval/execution journey is not implemented or verified. Exact host/browser version and native teardown evidence remain to collect.

## Native read checkpoint — 2026-10-24

Extension activation now registers notebook_get_context and notebook_get_cells. Actual host discovery returned both schemas and readOnlyHint/untrustedContentHint annotations. An initial context call returned null notebook identity. After opening the repository-owned welcome.ipynb, context returned the active notebook ID, intro cell ID and idle kernel. The cells call returned the actual two cells, complete source hashes and no truncation.

Changing Notebook access to Hidden from agent through the UI caused a subsequent native cells call to return NOT_FOUND without content. The native context call then returned null notebook/cell IDs and unavailable kernel status. This proves discovery, read invocation and notebook hiding on this host session, not the full W3 journey. Native unsaved-edit reads, per-cell hiding, cancellation and teardown still need dedicated evidence.

## Registration implementation checkpoint — 2026-10-24

`src/webmcp/register.ts` implements single-start registration, missing-API detection, shared AbortSignal cleanup after partial failure, and disposal during an asynchronous registration. Four mocked tests pass. The adapter follows the 20 October 2026 draft's `document.modelContext.registerTool(tool, {signal})` interface; aborting the signal removes registrations. No compatibility shim is installed.

Read handlers and activation/disposal are now connected, with truthful UI registration status. These lifecycle unit tests do not establish native teardown or duplicate activation across separate adapter instances.

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
