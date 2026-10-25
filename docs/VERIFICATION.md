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

| Requested deliverable             | Evidence                                                  | Status                                                                 |
| --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Agent instructions and skills     | AGENTS.md; docs/SKILLS.md                                 | Created, including Ponytail, testing, review and actual Graphify path  |
| Product and module specs          | SPEC.md, SPEC-foundation.md, eight SPEC-module documents  | Written; product behavior remains planned                              |
| Precise tools                     | docs/TOOL_CONTRACTS.md; contracts/tools.json              | Twelve planned inputs with bounds, state/results/error rules           |
| Ordered build work                | tasks/plan.md; tasks/todo.md; docs/START_HERE.md          | Dependencies, files, acceptance and verification documented            |
| Architecture and trust boundaries | docs/ARCHITECTURE.md; CAPABILITY_MAP.md                   | Documented with diagrams and decisions                                 |
| Test setup and CI                 | package.json/lock, tests/, e2e/, .github/workflows/ci.yml | Local checks passed; remote run recorded below                         |
| Real browser Python               | e2e/foundation.spec.ts                                    | Passed after a fresh build; actual Pyodide output asserted             |
| Graphify                          | graphify-out/; docs/GRAPHIFY.md                           | Real extraction/clustering/export; dated snapshot limitations explicit |
| Review and handoff                | docs/REVIEW.md; this file; docs/START_HERE.md             | Self-review completed; future product release gates documented         |
| Colab scope                       | SPEC-dataset-intelligence.md; task D3                     | File round-trip specified; no live Colab integration promised          |

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

# Dataset session store and profile tool — 2026-10-24

Implemented D2a as an isolated store/tool slice. CSV uploads receive generated app-owned filenames derived only from a cryptographic session ID; supplied names are reduced to display-only basenames and never become storage paths. Records are scoped to their notebook and bounded to 20 datasets and 50 MiB per session in addition to D1's per-file limits. A cancelled save is withheld from the registry and its unique partial file is removed. Unknown, cross-notebook and hidden records all return NOT_FOUND.

The `dataset_profile` tool has the checked-in closed input schema, rechecks notebook permission after its async boundary, marks all returned dataset text untrusted and caps the complete transport envelope at 50 KiB. It returns a generated filename so proposed Python can visibly reference the app-owned file. Raw values are absent by default; after the human changes the store's sharing state, at most five parsed rows are included as `sampleRows`. This changes no execution path and runs no Python.

Seven focused tests cover generated paths, default privacy, explicit sharing, hostile/formula text, schema parity, invalid arguments, notebook isolation, cancellation cleanup, malformed CSV and session limits. Reversing the sample-sharing condition made both privacy tests fail; the source was restored. Final D2a checks: 98 Jest tests and six Python checks, typecheck and formatting pass. Browser and native registration evidence remain D2b because this isolated tool is not registered or rendered yet.

# Dataset upload and reviewed analysis journey — 2026-10-24

Completed D2 by wiring the session store into JupyterLite contents, registering `dataset_list` and `dataset_profile`, and adding the sidebar upload/review controls. `dataset_list` was added after review found that an agent otherwise had no privacy-preserving way to discover opaque dataset IDs. It returns generated IDs, display names, generated filenames and dimensions, never raw rows. Uploads show pending, cancel and typed error states; malformed rows identify the physical line. Removing a dataset deletes its app-owned file, and closing a notebook clears its session records and requests file cleanup.

The browser journey uses a mocked WebMCP registration transport and the real Pyodide kernel. It rejects a ragged CSV, uploads a valid CSV, discovers and profiles it without samples, enables exactly two shared sample rows through the human checkbox, proposes a visible Python cell using the generated filename, accepts the edit without execution, creates a separate run request, approves it and observes `DATASET_ROWS 2` and `FIRST_NAME Ada` in the notebook output. Removal makes the dataset undiscoverable. No Python runs during upload or profiling. The dataset article screenshot is `test-results/dataset-panel.png`; generated screenshots are local ignored evidence.

Three UI tests cover the empty state, inert rendering of a hostile filename, private sharing default, pending/cancel and error states. Dataset tool/store tests cover closed schemas, notebook scoping, permission rechecks, bounded envelopes, list discovery, cancellation cleanup and raw-row privacy. Final checks pass: 102 Jest tests, six Python tests, production typecheck, formatting, build and all six Chromium scenarios. The first full browser run exposed an ambiguous existing isolation-test textbox locator after a cell insertion; it now targets the newest code cell explicitly, and both the focused rerun and full suite pass. Native discovery and invocation of the two dataset tools remain unverified and are not claimed by D2.

# Colab portability domain — 2026-10-24

Started D3 with a protocol-independent `.ipynb` import/export boundary and a Colab-shaped fixture. Imports accept strict UTF-8 JSON no larger than 20 MiB and require nbformat 4, a non-negative minor version, notebook metadata, and valid code/markdown/raw cell structure. Exports pass the same validation and size cap. Cells, outputs, attachments, and unknown notebook/cell metadata remain data rather than executable import hooks and survive a semantic import/export round-trip.

Eight focused tests pass after the final output-schema case. They cover the fixture round-trip, unknown metadata, deterministic warnings for `google.colab`, Drive mounting, shell commands and GPU expectations, removal of active hostile output, invalid major version, missing cells, unknown cell type, malformed code output, malformed UTF-8/JSON and the 20 MiB boundary. The test first failed because the portability module did not exist. D3 remained open at this checkpoint until human-facing import/export controls and a real-browser download round-trip proved no autorun and inactive imported HTML in JupyterLite.

# Colab-compatible notebook UI and browser round-trip — 2026-10-25

Completed D3 with human-facing import review and local export. Selecting an `.ipynb` parses and validates it without mutating the current notebook. A second **Apply import** action is required and clearly states that existing cells will be replaced. Applying cancels pending edit/execution requests, clears session datasets and replaces the visible model without dispatching code. Compatibility warnings remain visible after import. Download validates the current model, emits a bounded nbformat 4 file and uses a notebook-derived local filename.

The first browser security run showed that Jupyter removed a hostile HTML event handler but still requested the embedded image URL. The import boundary now removes `text/html`, `image/svg+xml` and `application/javascript` output MIME types before Jupyter receives them, retains plain output, and adds an explicit warning. The final browser case proves no autorun error appeared, the hostile browser flag stayed false, no hostile HTML survived export, custom notebook/cell metadata survived, and the downloaded notebook parsed as nbformat 4.

Final D3 gates pass: 113 Jest tests and six Python checks, typecheck, formatting, production build, the focused import/download scenario and all seven Chromium scenarios. The build retains the four documented third-party license-discovery warnings. D3 is complete; this is file portability only and does not claim live Colab, Drive or GPU integration.

# Reproducible experiment template checkpoint — 2026-10-25

Started X1 with an explicit experiment-selection panel and deterministic Python generator. The human must choose an uploaded dataset, target, one or more distinct features and either logistic regression or random forest. Creating an experiment produces an ordinary visible insertion proposal; accepting that edit still does not execute it, and the existing separate run approval remains required.

Generated code fixes seed 42 and a stratified 80/20 split, checks missing targets, one-class targets, minimum per-class counts and train/test class capacity, and drops all-missing features with a recorded warning. It splits raw rows before deriving numeric/categorical preprocessing and fitting. Numeric features use median imputation plus standard scaling; categorical features use most-frequent imputation plus unknown-safe one-hot encoding. Model settings match the specification. The result marker contains dataset/selection provenance, usable features, parameters, package versions, class order, accuracy, macro precision/recall/F1, confusion matrix, fit warnings and a SHA-256 split fingerprint over ordered row indices and split inputs.

The template test first failed because the module did not exist. Six template cases and two static UI cases now pass, including hostile display-name escaping and rejection of caller-controlled paths, duplicate/target features and unknown models.

# Reproducible experiment browser verification — 2026-10-25

Completed X1 in a real JupyterLite/Pyodide browser journey. The test uploads the 24-row classification fixture, explicitly selects the target and three features, accepts the visible generated edit, confirms that acceptance did not execute it, and separately approves each run. Logistic regression and random forest both complete under scikit-learn 1.8.0 and pandas 3.0.2. The fixture produces accuracy, macro precision, macro recall and macro F1 of 1.0, with confusion matrix `[[3,0],[0,2]]`.

Repeating logistic regression records identical metrics and split fingerprint `c919c1d58f2063ada7544b2949547a293d8e0e96023d2c75c6c453d195a93c68`; random forest records the same split fingerprint. The generated result now includes fitted numeric medians and categorical modes. The browser assertion confirms the fitted age median differs from the full fixture median of 45, giving direct evidence that preprocessing fit on training rows after the split. A three-row dataset with only one member of the rare class reaches the approved cell, fails visibly with `Each target class needs at least two rows`, and is recorded by the execution queue as failed.

An integration failure initially came from calling `dataset_list` without its required notebook scope; the corrected test gets the active notebook ID first. The invalid-data case also established that Python exceptions produce a failed execution record, so the assertion now checks the failed state rather than waiting for success. The final gates pass: 121 Jest tests, six Python checks, typecheck, formatting, production build and all eight Chromium scenarios. The build retains the four documented third-party license-discovery warnings. X1 is complete; trusted persisted records, reload survival and comparisons remain X2.

# Trusted experiment history and comparison — 2026-10-25

Completed X2 with a versioned, one-MiB-bounded browser store and a trust binding from NotebookPilot-generated proposal to the exact human-accepted cell. Recording reads private execution evidence rather than notebook imports or arbitrary tool payloads. It accepts one terminal cell only, rechecks notebook/cell/source identity, requires the registered dataset hash to remain present, extracts the single generated stream marker, checks its dataset/target/features/model provenance and validates all metrics, versions, split settings and identifiers before saving. Copied cells, changed provenance, missing datasets, duplicate executions and malformed persisted records are rejected. WebMCP failures conceal untrusted or mismatched object details as `NOT_FOUND`.

Persistence writes the complete next document before changing in-memory state, so quota/write errors remain visible and cannot create a false saved state. Failed and cancelled generated executions persist status without result fields. Comparisons require successful runs with identical dataset, target, ordered features, split fingerprint, split settings and runtime versions; incompatible runs receive reasons and null ranks. Compatible runs rank by macro F1. The sidebar shows history and metrics, comparison reasons, storage errors, explicit deletion and selected-run JSON export without dataset rows.

The real Chromium experiment journey records two logistic runs, one random-forest run and the expected failed split; exercises idempotent `experiment_record` and `experiment_compare`; ranks the three compatible successful runs; downloads and parses the selected JSON; reloads and restores all four records; deletes the failed record; and reloads again to prove deletion persists. A separate browser case seeds corrupt storage and proves the notebook still opens with a visible storage warning. Final X2 gates pass: 135 Jest tests, six Python checks, typecheck, formatting, production build and all nine Chromium scenarios. The build retains the four documented third-party license-discovery warnings.

# Evidence-based audit rules — 2026-10-25

Completed A1 as a pure heuristic analyzer plus a permission-scoped live-notebook coordinator. Seven fixed rules implement the documented once-per-notebook penalties: missing seed, duplicate/non-monotonic execution order, literal absolute paths, recognized shell/network/subprocess effects, possible preprocessing-before-split leakage, missing markdown documentation and missing runtime/package versions. Findings include the live source hash, severity and one-based line/column evidence span. Unexecuted cells affect explicit coverage but do not create an order violation. Unsupported dynamic call targets produce `notEvaluated` entries rather than a safety conclusion, and notebooks without visible code receive a null score.

The coordinator filters cell permissions before passing source to the analyzer, then rechecks the policy version, visible order, types, source and execution counts after asynchronous hashing. Permission changes return `NOT_FOUND`; live edits return `STALE_CELL`; hidden content is absent from both findings and hashes. A separate refresh function compares current source hashes and marks changed or removed findings stale. Positive and negative fixtures cover all rules, the exact zero-score penalty case, seeded split-first versioned training, unexecuted coverage, dynamic calls, changed/missing cells, hidden cells and concurrent permission/source changes. Final A1 gates pass: 143 Jest tests, six Python checks, typecheck, formatting, production build and all nine Chromium scenarios. A2 remains responsible for the registered tool, visible limitations, keyboard navigation and browser flow.

# Audit tool, sidebar and evidence navigation — 2026-10-25

Completed A2 by registering the read-only `notebook_audit` tool and adding the reproducibility-audit sidebar. The tool accepts only an active notebook ID, uses the permission-scoped auditor, labels returned notebook material untrusted and caps the complete result envelope at 50 KiB. Invalid, hidden, stale, cancelled and oversized requests return typed, redacted errors. Unit tests prove contract parity, closed arguments, cancellation and that hidden notebook content is absent from the result.

The sidebar states that checks cover visible cells and are heuristics rather than a security or correctness verdict. It displays the deterministic score, execution coverage, evidence locations, unevaluated checks, empty, pending and error states. Fresh findings offer native buttons that activate, center and focus the source cell. Live source changes re-hash the current visible cells, mark old evidence stale and remove its navigation action until the human runs a fresh audit.

The Chromium journey inserts an absolute-path cell through the normal human edit review, obtains the same finding through the sidebar and mocked WebMCP transport, navigates to the active evidence cell, replaces the source through another reviewed edit, observes the changed-source warning and confirms a fresh audit removes the obsolete finding. The focused A2 checks passed before the final full gate. Native-host invocation of `notebook_audit` remains part of the open W3 evidence gate.

Final A2 gates pass: 147 Jest tests, six Python checks, typecheck, formatting, production build and all ten Chromium scenarios. The production build retains the four previously documented dependency-license discovery warnings.

# Portable report rendering — 2026-10-25

Completed R1 with an immutable report model and bounded standalone HTML/Markdown renderers. The model selects at most ten requested records from the exact active-notebook scope, retains stored dataset and split fingerprints, parameters, versions and metrics without recalculation, and labels unavailable, failed and cancelled runs. Reports state that only visible cells were audited, raw dataset rows are excluded and audit findings are heuristic. Audit findings, unevaluated checks, execution coverage and changed-evidence warnings are included.

The HTML document escapes every data field, includes no scripts or remote-resource elements, and uses a restrictive embedded Content Security Policy. Markdown escapes structural delimiters and collapses user-controlled line breaks. Both formats are complete local documents and reject UTF-8 output above five MiB. Tests cover hostile HTML and Markdown strings, exact stored metrics/provenance, missing and failed runs, explicit scope and the size boundary.

Final R1 gates pass: 151 Jest tests, six Python checks, typecheck, formatting, production build and all ten Chromium scenarios. The production build retains the four previously documented dependency-license discovery warnings. R2 remains responsible for explicit local download controls, the bounded WebMCP preparation tool and offline browser verification.

# Explicit report preparation and offline download — 2026-10-25

Completed R2 with a session-scoped report manager, the `report_generate` tool and visible sidebar controls. The tool validates the checked-in closed schema, audits current visible cells, selects only trusted records belonging to the active notebook and returns an export ID, generated filename and byte count. It does not return the report body, click a link or upload anything. The prepared body remains in the app until the human downloads or removes it; closing the notebook clears its prepared reports. At most ten reports and ten selected runs are retained.

The sidebar states the visible-cell and raw-row scope, lets the human select stored runs and HTML or Markdown, and exposes explicit Prepare, Download, Remove actions with pending, error and empty states. Browser evidence prepares an audit-only HTML report through mocked WebMCP registration, verifies the tool result omits content, downloads through the human button, parses the file, and renders it in a new offline page. The offline page loads with zero network requests and contains no script or remote-resource elements. The browser also prepares Markdown through the human UI.

The first complete browser run exposed a pre-existing isolation assertion that watched the notebook's first output instead of the output containing its unique marker. The assertion now filters for `WORKER_ISOLATED`; the isolation and report scenarios passed together, followed by all eleven Chromium scenarios. Final R2 gates pass: 156 Jest tests, six Python checks, typecheck, formatting, production build and all eleven Chromium scenarios. Native-host report invocation remains part of W3 rather than this mocked-transport evidence.

# Human edit-review completion audit — 2026-10-25

Closed H2 after auditing its current implementation and tests against every acceptance condition. Update acceptance is single-use and uses synchronous compare-and-swap; rejection never writes; changed or deleted targets, permission revocation, notebook close, kernel lifecycle changes and ten-minute expiry prevent acceptance. Insertion captures and rechecks the ordered cell IDs and anchor. Proposal source remains inert visible text, and accepting an edit has no execution path. The real browser scenario covers rejection, keyboard acceptance, a concurrent human edit, beginning-of-notebook insertion and empty outputs before the separate run workflow.

The remaining bounded-history concern was resolved by allowing terminal accepted, denied, expired or cancelled records to be dismissed while refusing to dismiss pending human review. Unit and static UI tests cover the state rule; the browser dismisses a denied proposal and confirms the notebook source remains unchanged. Final H2 gates pass: 158 Jest tests, six Python checks, typecheck, formatting, production build and all eleven Chromium scenarios. Native host mutation evidence remains separately scoped to W3.
