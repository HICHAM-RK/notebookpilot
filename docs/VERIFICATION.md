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

H2, N2, W1 onward in tasks/todo.md remains implementation work. Native ChatGPT discovery/approval/execution has NOT been tested; docs/HOST_VERIFICATION.md defines that gate. Colab round-trip, profiling, classification, audits, reports, full accessibility and hosted release are not implemented or passed by the current checks. No paid services, public deployment or production credentials were added.
# Registration lifecycle checkpoint — 2026-10-24

Added the WebMCP registration owner and four mocked lifecycle tests. The focused test first failed because the module did not exist. After implementation, all 21 Jest tests, production/test typechecking and formatting checks passed. Covered missing/malformed APIs, repeated starts, partial failure cleanup, and disposal during pending registration. Reviewed signal ownership and error handling: host exception details do not escape, and failed partial registration aborts the shared signal.

This module is not yet wired into extension activation; native discovery, UI status and browser teardown remain W1 work. No browser test was run for this isolated module, and W1 remains unchecked. The full product remains incomplete.

# Native read tools checkpoint — 2026-10-24

Implemented context/cell tools with closed argument validation, schema parity tests, bounded envelopes, cancellation checks and redacted errors. Extension activation registers both tools; sidebar reports registration separately from agent connection; panel disposal aborts registrations. Unit coverage includes invalid inputs, hidden notebook/cell state, unknown IDs, cancellation, exception redaction and permission changes before context resolves.

Build, typecheck, formatting, five Python tests and three real Chromium tests passed. Initial native in-app discovery, actual cell reads and notebook hiding also passed; detailed observations and remaining limits are in HOST_VERIFICATION.md. W1/W2/W3 remain unchecked because native teardown, the full mutation surface and approved execution are unfinished.

# Update proposal domain checkpoint — 2026-10-24

Added an isolated update-proposal state machine, not yet exposed through tools or connected to the review UI. Tests cover no write on proposal creation, accept once, terminal rejection, changed/deleted targets, ten-minute expiry, permission revocation, source-hash mismatch, UTF-8 replacement limits, notebook closure cancellation, returned-object isolation, hashing races and compare-and-swap failure. The test first failed for the missing module. Acceptance uses synchronous compare-and-swap through an injected adapter and contains no execution path.

H2 remains incomplete: live notebook adapter, insertion proposals, lifecycle invalidation wiring, bounded storage, review UI and real browser approval tests remain. Current state checks cancel stale proposals when accessed; event-driven cancellation is not wired yet. No end-to-end proposal behavior is claimed.

