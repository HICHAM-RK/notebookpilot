# Build-package evidence

Date: 2026-10-23. Scope: agent-ready specifications, contracts, workflow, Graphify snapshot and JupyterLite foundation. This is not a product-completion report.

## Implementation checkpoint: F3/F4

The original @notebookpilot/extension now builds as a prebuilt federated extension and is included in the JupyterLite site. Its React sidebar shows the selected notebook and a truthful disconnected-agent state. It handles notebook opening and closing without breaking ordinary Python execution. The UI uses Jupyter theme tokens and contains no agent mutation/execution path yet.

Verification: npm ci --ignore-scripts, full typecheck, formatting, five Python tests, one Jest view test, extension/site build and two browser tests passed. The new activation test first failed because no sidebar existed; the view unit test first failed before its module existed. A deliberate production TypeScript error failed the root check and was restored. Browser traces identified Jupyter's save-on-close dialog and the test now explicitly discards fixture changes. A final targeted browser run passed in 2.8s; screenshot test-results/notebookpilot-workspace.png was visually inspected at 1280×720. Native WebMCP remains untested.

Self-review: source/config/test boundaries checked, UI text uses React escaping, signal subscription disconnects on disposal, no source reads or hidden execution added. Build metadata comes from the locked local JupyterLite archive, without extracting arbitrary archive paths. Direct federation avoids an unnecessary Python distribution. Dependency compatibility and inherited advisories are recorded in docs/DEPENDENCIES.md; no high/critical npm findings, but rendering advisories remain release gates. Existing CI calls the expanded root commands; hosted evidence for this implementation is pending push.

The sections below record the earlier build-package baseline; their historical test counts and zero-vulnerability npm result do not describe the expanded dependency tree.

## Implementation checkpoint: N1/H1

Live Jupyter cell reads now use a domain reader with full UTF-8 SHA-256 revisions, visible-only pagination and bounded source/output summaries. The 50KiB envelope check includes JSON escaping and the duplicated text/structured payload. Invalid/duplicate IDs fail closed. Source/type/order changes, closure or permission revocation while hashing invalidate the read before content is returned. Session policy is held in separate maps; notebook metadata grants no authority.

The sidebar now exposes human-only notebook/cell permission selectors and an agent-access preview. Changing notebook/source/policy clears the preview. React renders source as plain text. The browser test edits the real CodeMirror cell without saving, verifies that exact text in the preview, hides the cell, verifies exclusion, then hides the notebook with keyboard type-ahead and verifies refusal. A bare native select reproduced headless macOS arrow-key limitations; type-ahead is used to test actual keyboard selection. Controls suppress enclosing Lumino shortcuts using its documented data attribute.

Verification: five Python tests and 17 Jest tests pass, along with production typecheck, formatting and build. Three browser cases passed together before the keyboard refinement; the final targeted permission/keyboard case passed in 3.0s. Hidden-policy mutation was rejected by the tests and restored. Source deletion during hashing has a regression test. Visual review of the 1280×720 sidebar found no overflow or hidden controls. Proposal/execution authority is not exposed yet.

Hosted F3/F4 checks passed on `f7d33a01d41cf32c2bfc4e954976145f03256439`: [run 40009008911](https://github.com/HICHAM-RK/notebookpilot/actions/runs/40009008911). N1/H1 hosted checks will be verified after push. Full native-host compatibility, imported notebook safety and public-release advisory remediation remain separate gates.

## Requirements audit

| Requested deliverable | Evidence | Status |
|---|---|---|
| Agent instructions and skills | AGENTS.md; docs/SKILLS.md | Created, including Ponytail, testing, review and actual Graphify path |
| Product and module specs | SPEC.md, SPEC-foundation.md, eight SPEC-module documents | Written; product behavior remains planned |
| Precise tools | docs/TOOL_CONTRACTS.md; contracts/tools.json | Twelve planned inputs with bounds, state/results/error rules |
| Ordered build work | tasks/plan.md; tasks/todo.md; docs/START_HERE.md | Dependencies, files, acceptance and verification documented |
| Architecture and trust boundaries | docs/ARCHITECTURE.md; CAPABILITY_MAP.md | Documented with diagrams and decisions |
| Test setup and CI | package.json/lock, tests/, e2e/, .github/workflows/ci.yml | Local checks passed; remote run recorded below |
| Real browser Python | e2e/foundation.spec.ts | Passed after a fresh build; actual Pyodide output asserted |
| Graphify | graphify-out/; docs/GRAPHIFY.md | Real extraction/clustering/export; dated snapshot limitations explicit |
| Review and handoff | docs/REVIEW.md; this file; docs/START_HERE.md | Self-review completed; future product release gates documented |
| Colab scope | SPEC-dataset-intelligence.md; task D3 | File round-trip specified; no live Colab integration promised |

## Local verification

Executed from repository root with Node 24.13.1, uv 0.12.0 and Python 3.12:

- `uv sync --frozen`: passed, 62 packages checked.
- `npm ci --ignore-scripts`: passed, locked installation, no lifecycle scripts executed.
- `npm run typecheck`: passed for test/config TypeScript.
- `npm run lint:check`: passed for configured Prettier scope.
- `npm test`: five tests passed: notebook schema/trusted fixture and four planned-contract tests.
- `npm run build`: passed; optional translation-package warning does not affect the English sample.
- `npm run test:e2e`: one Chromium test passed (5.8 seconds test time), executing the visible sample and asserting `Rows: 4; missing ages: 1` in notebook output.
- `npm audit --audit-level=high`: zero reported vulnerabilities in the current npm tree. This is not a Python-dependency or application security audit.
- `git diff --check`: passed.

The initial browser failure was an ambiguous locator matching rendered markdown and hidden editor text. The fix targets rendered paragraph content, then the test explicitly executes the code cell. No assertion was removed to hide a product failure. Sample file handling now closes the CSV deterministically.

Mutation check: temporarily allowing unknown proposal fields made two contract tests fail, including the attempted `approved:true` input. The original schema was restored. This proves those tests detect this contract regression; runtime enforcement remains W2.

## Graphify evidence

Recorded extraction contains 83 final nodes, 95 edges and 10 communities. The extraction agent checked source provenance/IDs/confidence and loaded HTML with zero page errors. See graphify-out/verification.json. The 22-file snapshot predates later documentation edits; corpus-snapshot.json records exact hashes. It is a historical map, not a claim of complete final-source coverage. The generated benchmark estimates retrieval size only, not actual model cost or quality.

## Review findings and resolutions

Self-review used code-review-and-quality across correctness, readability, architecture, security and performance. Resolved: stale docs claiming scripts absent; wrong test selector; unclosed fixture file; missing task dependencies; unspecified source-byte limits; ambiguous request/execution IDs; insertion revision rule; host-envelope assumptions; undefined audit penalties and experiment defaults. No independent approval is claimed.

The only Python `exec` in the foundation test runs the repository-owned fixture. It is not exposed to uploads or model input. CI uses read-only repository permissions. Graphify dependencies are isolated and its source corpus excludes private datasets. Graph HTML uses an external visualization library, documented in docs/GRAPHIFY.md.

## Remote evidence

GitHub API verified HICHAM-RK/notebookpilot remains private with default branch main. Build-package branch codex/agent-build-package was pushed and opened as [draft PR #1](https://github.com/HICHAM-RK/notebookpilot/pull/1). [Foundation checks run 39968654567](https://github.com/HICHAM-RK/notebookpilot/actions/runs/39968654567) completed successfully on commit `904762750185b2c9cab863b86ad7ea5f3a48e41f`, including Linux clean installation, build and real Chromium Python execution. This evidence paragraph is a documentation-only follow-up to that tested commit. No deployment or branch-protection configuration is claimed.

## Product gates still open

H2, N2 and the remaining WebMCP journey gates in tasks/todo.md still include open implementation work. Native ChatGPT discovery/approval/execution evidence is tracked in docs/HOST_VERIFICATION.md. Colab round-trip, dataset upload/tool wiring, classification, audits, reports, full accessibility and hosted release are not implemented or passed by the current checks. No paid services, public deployment or production credentials were added.
# Registration lifecycle checkpoint — 2026-10-24

Added the WebMCP registration owner and four mocked lifecycle tests. The focused test first failed because the module did not exist. After implementation, all 21 Jest tests, production/test typechecking and formatting checks passed. Covered missing/malformed APIs, repeated starts, partial failure cleanup, and disposal during pending registration. Reviewed signal ownership and error handling: host exception details do not escape, and failed partial registration aborts the shared signal.

This module is not yet wired into extension activation; native discovery, UI status and browser teardown remain W1 work. No browser test was run for this isolated module, and W1 remains unchecked. The full product remains incomplete.

# Native read tools checkpoint — 2026-10-24

Implemented context/cell tools with closed argument validation, schema parity tests, bounded envelopes, cancellation checks and redacted errors. Extension activation registers both tools; sidebar reports registration separately from agent connection; panel disposal aborts registrations. Unit coverage includes invalid inputs, hidden notebook/cell state, unknown IDs, cancellation, exception redaction and permission changes before context resolves.

Build, typecheck, formatting, five Python tests and three real Chromium tests passed. Initial native in-app discovery, actual cell reads and notebook hiding also passed; detailed observations and remaining limits are in HOST_VERIFICATION.md. W1/W2/W3 remain unchecked because native teardown, the full mutation surface and approved execution are unfinished.

# Update proposal domain checkpoint — 2026-10-24

Added an isolated update-proposal state machine, not yet exposed through tools or connected to the review UI. Tests cover no write on proposal creation, accept once, terminal rejection, changed/deleted targets, ten-minute expiry, permission revocation, source-hash mismatch, UTF-8 replacement limits, notebook closure cancellation, returned-object isolation, hashing races and compare-and-swap failure. The test first failed for the missing module. Acceptance uses synchronous compare-and-swap through an injected adapter and contains no execution path.

H2 remains incomplete: live notebook adapter, insertion proposals, lifecycle invalidation wiring, bounded storage, review UI and real browser approval tests remain. Current state checks cancel stale proposals when accessed; event-driven cancellation is not wired yet. No end-to-end proposal behavior is claimed.

# Live update review checkpoint — 2026-10-24

Update proposals are now connected to a synchronous Jupyter shared-model compare-and-swap adapter, a review panel and notebook_propose_update. The tool validates closed arguments, matches the checked-in schema, never exposes approval, and supports cancellation during hashing. Original and replacement source are each capped at 256 KiB; the session accepts at most 100 proposal records, including completed ones, pending a history-retention UI. Panel updates invalidate stale proposals; close/kernel replacement/restart cancel pending records.

The real Chromium review test uses an explicitly mocked registration transport. It verifies tool-created proposals, rejection preserving source, keyboard acceptance changing the visible source without execution, and cancellation after a human edit. A fresh production build and all four browser tests passed after final lifecycle wiring. Unit suite has 54 passing tests plus five Python tests; typecheck and formatting pass. The first browser failure was an innerText/textContent newline mismatch in the assertion, corrected to compare rendered text consistently. Review checked source comparison, permission enforcement, inert source rendering, bounded storage and cancellation; no execution method is called by this flow.

Remaining: native proposal journey, insertion proposals, proposal-status tool, fuller diff presentation, bounded history cleanup and complete execution approval. H2/W2/W3 remain unchecked.

# Proposal outcome checkpoint — 2026-10-24

Registered notebook_get_proposal with its contract schema and closed input validation. The result contains status only, never original/replacement source. Lookup rechecks current notebook/cell visibility and target existence; hidden, closed, deleted and unknown targets return NOT_FOUND. Reading status can expire/cancel stale pending records but cannot accept or reject them. Unit tests verify schema parity, pending/denied outcomes, source omission, hidden/unknown equivalence and rejection of an approval field. The browser review scenario additionally checks tool-reported denied/accepted outcomes after human controls.

55 Jest tests, five Python tests, typecheck, formatting and production build passed. Native proposal/status invocation remains unverified; browser review uses a mocked transport. No execution or insertion support is implied.

# Native proposal evidence — 2026-10-24

Verified commit 87c6fec in the actual in-app browser: four native tools discovered; read-only update denied; rejected proposal preserved original hash; UI-accepted proposal changed the visible cell and native readback; status tool returned denied/accepted correctly. Outputs stayed empty and execution prompt stayed unexecuted. No registration shim was installed. The automated tester operated the human controls on repository-owned fixture data. See HOST_VERIFICATION.md for exact steps, source hashes and limitations. No code changed in this evidence checkpoint, so prior build/test results apply; no redundant test run was needed.

# Insertion proposal checkpoint — 2026-10-24

Implemented notebook_propose_insert, insertion review location, live Jupyter shared-model insertion and shared proposal lifecycle/status. Captured cell order is cloned and compared before applying; missing/hidden anchors, revoked write permission, duplicate IDs and changed order cannot insert. New code cells have empty outputs and null execution count. All inserted source remains visible; no execution path is called. The shared record limit is 100, source limit 256 KiB, and captured order limit 10,000 cells. Internal order IDs are not returned through tools.

60 Jest tests and five Python tests pass, plus typecheck, formatting, production build and all four Chromium tests. The review browser test uses mocked transport and verifies no pre-approval insertion, accepted insertion at the beginning, accepted status and empty outputs. Domain tests verify once-only acceptance, reorder cancellation, hidden anchors, revoked access, missing anchors and isolation of returned order arrays. Native insertion remains unverified. H2 is still unchecked pending fuller review/lifecycle coverage; N2 execution is not implemented.

# Execution queue domain checkpoint — 2026-10-24

Added an isolated execution approval/queue module, not yet connected to a live kernel, UI or agent tools. Seven tests verify no dispatch before approval, duplicate approval once, cancellation/rejection, changed source, permission revocation, per-kernel serialization, request validation, timeout and cancellation while a runner is still settling. Timeout aborts the request but keeps the lane occupied until the adapter settles; late output is not recorded. This is adapter-contract evidence, not proof that Pyodide execution can be interrupted safely.

67 Jest tests, five Python tests, typecheck and formatting pass. The focused test initially failed for the absent module. No browser rerun was needed for this unwired domain code. Remaining N2 work includes a live Jupyter execution adapter with ownership-safe interruption, human execution review/status UI, lifecycle wiring, tool validation/envelopes and real Python tests. The full product remains incomplete.

# Jupyter execution adapter checkpoint — 2026-10-24

Added an unwired live-model adapter for ExecutionQueue. It resolves exactly one visible code-cell widget, checks source/kernel identity and write permission, refuses busy kernels, and delegates execution to an injected CodeCell.execute-compatible function. Inspection of the installed JupyterLab 4.6.4 source confirmed that CodeCell.execute uses visible source and attaches the execution future to the cell's output area synchronously. Exact installed cells/services versions are now explicit dependencies.

Four mock-adapter tests cover source mismatch, visible-cell dispatch, busy/aborted denial, owned-work interruption and declining interruption after observing a foreign execute request. Listeners are removed when the runner settles. 71 Jest tests, five Python tests, typecheck and formatting pass. This is not real Pyodide execution evidence. The production plugin has not connected this adapter yet; execution controls/tools and real browser tests remain required. Interrupt ownership is based on messages observable on the local kernel connection, not a general guarantee for multi-client remote kernels. If ownership is uncertain, no interrupt is sent and the queue must wait for settlement.

# Connected execution approval checkpoint — 2026-10-24

Wired ExecutionQueue to Jupyter CodeCell.execute, the human execution-review panel, notebook_run_cells and notebook_get_execution. Tools validate closed arguments, reject approval fields, enforce bounded cell counts and cap serialized result envelopes. Pending requests show captured code; approval is disabled until the kernel is idle. Close/kernel changes cancel requests. Source changes invalidate pending requests during panel refresh; dispatch independently rechecks source/kernel/permissions.

Real Chromium/Pyodide review scenario passed: update rejection and acceptance, stale-edit cancellation, insertion without execution, run cancellation without output, then separate human approval producing `inserted without running` in the visible output and succeeded in the execution tool. Registration transport is mocked in this test; Python is real. An initial failure revealed that approval was available during kernel startup; the adapter correctly refused dispatch. The UI now waits for idle rather than inviting a doomed approval.

72 Jest tests, five Python tests, typecheck, formatting, production build and four browser tests pass. Native execution invocation, actual long-running timeout/interrupt behavior, multi-request races against human kernel activity and complete restart coverage remain unverified. N2/W3 are not marked complete. Cancelling after foreign work is observed does not interrupt the shared kernel; the UI explicitly explains that Python may continue until settlement.

# Cancellation before kernel busy — 2026-10-24

Reproduced a missed interrupt when cancellation arrived after dispatch but before the kernel reported busy. The execution adapter now observes status changes and message ownership while cancellation is pending, sends at most one interrupt, and removes both listeners when execution settles. It still declines interruption after observing foreign work or a replacement kernel.

The new regression failed before the fix (zero interrupts instead of one). Both delayed-busy cases now pass: owned work is interrupted once despite repeated status notifications; foreign work is not interrupted. Inverting the new once-only guard caused two tests to fail, then the original source was restored. Review checked reentrant interrupt notifications, ownership guards, listener cleanup and absence of new dependencies.

74 Jest tests, five Python tests, typecheck, formatting, production build and all four browser tests passed. Browser tests execute real Python through mocked WebMCP transport; the new timing regression uses a controlled kernel double. Actual long-running Pyodide interruption and restart coverage remain open N2 gates. No claim of a hard runtime termination guarantee follows from this fix.

# Real runtime interruption regression (failing) — 2026-10-24

Extended the real Chromium/Pyodide review scenario with a finite 15-second Python busy loop. The test waits for running, clicks Cancel run, verifies the request says cancelled, then requires KeyboardInterrupt and absence of the completion marker. The test failed: Python printed CANCELLATION_FAILED_FINISHED. This supersedes any interpretation of prior passing cancellation tests as proof that active Python stops. Prior domain tests prove queue bookkeeping only; the new browser test remains intentionally failing until the runtime behavior is fixed.

Root-cause inspection of the pinned upstream source shows that [JupyterLite 0.8.5 LiteKernelClient.interrupt](https://github.com/jupyterlite/jupyterlite/blob/v0.8.5/packages/services/src/kernel/client.ts) cancels queued messages via its mutex but does not signal the active Python worker. [PyodideKernel 0.8.6](https://github.com/jupyterlite/pyodide-kernel/blob/v0.8.6/packages/pyodide-kernel/src/kernel.ts) does not supply an interrupt override. Merely enabling cross-origin isolation cannot fix that missing path. Pyodide's documented interrupt-buffer mechanism needs explicit worker integration, appropriate hosting headers and ownership checks. An automatic kernel restart is not equivalent because it destroys variables.

Command: npm run test:e2e -- e2e/review.spec.ts. Result: one failed test, specifically the KeyboardInterrupt assertion after 20 seconds. Local diagnostic artifacts: /tmp/notebookpilot-cancel-e2e.log and test-results/review-mock-transport-requ-d3778-dit-and-execution-approvals/trace.zip (ignored). No production implementation changed in this checkpoint. N2 remains unfinished; do not merge or describe this revision as passing all gates.

# Isolated local static hosting — 2026-10-24

Added scripts/serve.py and wired npm run serve to it. It binds to loopback, serves only the built site directory, fails with an actionable error when no build exists, and sends COOP same-origin / COEP require-corp headers on success and error responses. The new server regression failed before implementation because the module was absent. A mutation changing COEP to unsafe-none was rejected, and the file was restored.

Six Python checks and 74 Jest tests pass, as do typecheck and formatting. Focused browser checks passed: the page is cross-origin isolated; actual Python reads crossOriginIsolated=True and allocates a one-byte SharedArrayBuffer inside its worker; the sample CSV notebook still computes its expected results. No extension source changed, so these tests used the existing built extension. Review checked loopback binding, fixed serving directory, worker headers and teardown of the test server. This is a prerequisite for interrupt-buffer integration, not an interruption fix. The existing active-execution cancellation regression remains failing and was not weakened or skipped.

# Active Pyodide interruption — 2026-10-24

Implemented an interruptible Pyodide kernel at source level. A separately built module worker installs a per-kernel one-byte SharedArrayBuffer through Pyodide's setInterruptBuffer API and retains JupyterLite's shared-memory contents bridge. The application disables the stock Python registration and installs the compatible NotebookPilot kernelspec. Asset rules preserve `.whl`/`.json` extensions, and relative JupyterLite settings are resolved before crossing into Python. Adapted JupyterLite worker integration is labelled in source and its BSD 3-Clause notice is reproduced in THIRD_PARTY_NOTICES.md.

The prior 15-second regression now passes in real Chromium/Pyodide: after human approval, Cancel run produces KeyboardInterrupt, stdout never prints CANCELLATION_FAILED_FINISHED, `preserved_value = 42` remains in the live interpreter and the next separately approved run prints `PRESERVED 42`. The screenshot at test-results/runtime-cancellation.png is ignored diagnostic evidence. The ordinary real-Python and CSV notebook paths also remain browser gates.

The implementation preserves the existing adapter ownership rules: it signals only the observed message for the current kernel, declines after foreign work, and sends at most one signal. InterruptChannel unit tests cover current, wrong and early request IDs and clearing before subsequent execution. Two integration faults were found and fixed during the browser loop: the upstream contents manager is initialized after its overridable remote factory, so the subclass captures constructor options directly; and JupyterLite settings/asset filenames must remain absolute and wheel-shaped for piplite. Neither failure was hidden with a retry or disabled test.

Final full gate: 76 Jest tests and six Python checks, typecheck, formatting, production build and all five browser scenarios pass. The browser suite includes the complete review/cancellation flow, shared-memory isolation, ordinary notebook execution, CSV access and permission-aware live reads. A mutation changing the active interrupt signal from 2 to 0 failed the focused InterruptChannel test and the source was restored. Review found no unresolved correctness, security, architecture or performance issue in this slice; private upstream fields are isolated to the kernel compatibility adapter and protected by exact dependency pins plus real-browser tests. npm audit reports 26 findings (3 low, 23 moderate, zero high/critical); release triage remains in docs/DEPENDENCIES.md.

The review scenario was then extended with a second real 15-second busy loop. While its approved request was running, the human used Jupyter's Restart Kernel command and confirmed the dialog. The request settled as cancelled; after the replacement kernel returned idle, a new separately approved cell printed `RESTARTED 42`. The first two selector attempts failed because accessible names matched several restart commands and both dialog buttons; the final test uses Jupyter's stable command id and the exact confirmation label. Focused restart coverage and the subsequent full browser suite pass. N2 remains unchecked pending a real 120-second timeout and broader multi-request/human-work race coverage.

# Bounded CSV profile domain — 2026-10-24

Implemented the dependency-free CSV parser and deterministic profile domain for D1. It accepts strict UTF-8 with an optional BOM, LF/CRLF records, doubled quotes, quoted commas/newlines and Unicode. It rejects empty or duplicate headers, ragged rows, malformed quoting and malformed UTF-8 with typed errors and physical line numbers. Formula-like strings remain ordinary inert values. Profiles use the original bytes for SHA-256 identity, exclude whitespace-only values from type inference, preserve whitespace for duplicate identity, retain literal `NA`/`null` values, preserve leading-zero identifiers as strings, and report linear-interpolated 1.5×IQR warnings for numeric columns with at least four values.

Resource checks stop files above 10 MiB before decoding, stop after 100,000 data rows, stop records above 1,024 columns, and reject a serialized WebMCP-style profile envelope above 50 KiB. The column ceiling was added during security review because an otherwise bounded delimiter-heavy input could allocate millions of empty fields before output rejection. It is documented in SPEC-dataset-intelligence.md and exceeds the number of columns that can fit the result cap.

The test-first checkpoint began with missing-module failures. The final focused suite has 15 passing cases, including exact fixture contents and hash, both byte and row boundaries, delimiter-heavy input, header-only data, whitespace-sensitive duplicates and oversize output. A mutation removing the leading-zero guard made the fixture test fail, and the original source was restored. Final checks: 91 Jest tests and six Python tests pass; typecheck, formatting and the production build pass. The build retains its four previously documented third-party license-discovery warnings. Browser tests are structurally deferred to D2 because D1 is an unregistered domain module with no UI or WebMCP route. Review found no unresolved correctness, security, architecture or performance issue. D1 is complete; D2 upload UI, explicit sharing and `dataset_profile` registration remain open.

