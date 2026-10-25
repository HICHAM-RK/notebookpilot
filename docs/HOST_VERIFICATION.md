# Native WebMCP verification gate

Status: W1 NATIVE PASS / W3 PARTIAL NATIVE PASS (2026-10-25). The ChatGPT in-app browser discovered all 13 tools and invoked `notebook_get_context` on the freshly built local app without a shim. Host and embedded Chromium versions are recorded below. Closing the test document invalidated its bound native tool handle, while mocked lifecycle tests separately prove AbortSignal teardown and reference-counted duplicate activation. Native rejection and UI acceptance passed previously. The complete native execution and dataset journeys remain W3 work.

## W1 native lifecycle — commit 9c40064, 2026-10-25

Host: ChatGPT macOS app `26.1021.31345` (`CFBundleVersion` 21828) using its in-app browser capability. Embedded browser: Chromium `156.0.8078.48` (`ChromiumBaseBundleVersion` 8078.48). Site: the freshly rebuilt local app at `http://127.0.0.1:8001/lab/index.html?native-w1-built=1`. API shape: the host discovered page tools registered through `document.modelContext.registerTool(tool, { signal })`; no shim, injected registration object or test transport was present.

The native host listed these 13 base tool names with their closed schemas and annotations: `dataset_list`, `dataset_profile`, `experiment_compare`, `experiment_record`, `notebook_audit`, `notebook_get_cells`, `notebook_get_context`, `notebook_get_execution`, `notebook_get_proposal`, `notebook_propose_insert`, `notebook_propose_update`, `notebook_run_cells` and `report_generate`. Native invocation of `notebook_get_context` returned the open fixture notebook ID, active cell ID, idle kernel and `webmcpStatus: available`.

Closing that browser document removed it from the host session; attempting to call its previously bound native tool handle failed because the tab no longer belonged to the browser session. Registration tests provide the complementary extension-level teardown evidence: the last owner aborts each registration signal, one of two owners may dispose without removing the shared tool, conflicts fail closed, partial failures clean up and disposal during registration prevents later tools from activating. Missing or malformed APIs return `unavailable`; the ordinary JupyterLite browser suite remains usable without native support.

Fresh W1 verification passed: 163 Jest tests, six Python checks, typecheck, formatting, production build and all 11 Chromium scenarios. The build retained the four previously documented third-party license-discovery warnings. This evidence completes W1 only; it does not substitute for W2 adversarial routing or the W3 end-to-end native human approval/execution journey.

## Native update review — commit 87c6fec, 2026-10-24

Host: ChatGPT in-app browser surfaced by Codex computer-use tools, local site on port 8001. Four tools were discovered through the host's WebMCP capability, not an injected test API. Testing used only the repository-owned welcome.ipynb fixture. The automated tester operated the human UI controls; this demonstrates the UI boundary, not approval by a separate human participant.

1. Native get_cells returned the analysis cell's original source hash `6bec9e614083aeeca285050a30643879a56a8beb679cf387c8314a83dcf7aeee` and empty outputs.
2. Native propose_update under default read-only permissions returned ACCESS_DENIED. The tester selected Allow proposals in the UI.
3. Native propose_update returned pending and the sidebar displayed original/replacement source. The tester clicked Reject edit. Native get_proposal returned denied; get_cells returned the unchanged original hash.
4. A second native proposal requested `print('Native review verified; not executed')`. The tester clicked Accept edit. Native get_proposal returned accepted; the visible editor and native get_cells both contained the replacement. The new source hash was `678ada17d8d5f6be2a2b5886040d74509be906faec629a2a1135b776f4a2e72b`; outputs remained `[]` and the UI execution prompt remained `[ ]`.

This verifies native proposal delivery, permission denial, UI rejection/acceptance, status retrieval and readback of the accepted source. It does not prove execution approval, insertion, native stale-edit handling, full host/version compatibility or teardown. Those gates remain open.

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
