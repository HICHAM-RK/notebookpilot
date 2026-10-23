# Build-package evidence

Date: 2026-10-23. Scope: agent-ready specifications, contracts, workflow, Graphify snapshot and JupyterLite foundation. This is not a product-completion report.

## Implementation checkpoint: F3/F4

The original @notebookpilot/extension now builds as a prebuilt federated extension and is included in the JupyterLite site. Its React sidebar shows the selected notebook and a truthful disconnected-agent state. It handles notebook opening and closing without breaking ordinary Python execution. The UI uses Jupyter theme tokens and contains no agent mutation/execution path yet.

Verification: npm ci --ignore-scripts, full typecheck, formatting, five Python tests, one Jest view test, extension/site build and two browser tests passed. The new activation test first failed because no sidebar existed; the view unit test first failed before its module existed. A deliberate production TypeScript error failed the root check and was restored. Browser traces identified Jupyter's save-on-close dialog and the test now explicitly discards fixture changes. A final targeted browser run passed in 2.8s; screenshot test-results/notebookpilot-workspace.png was visually inspected at 1280×720. Native WebMCP remains untested.

Self-review: source/config/test boundaries checked, UI text uses React escaping, signal subscription disconnects on disposal, no source reads or hidden execution added. Build metadata comes from the locked local JupyterLite archive, without extracting arbitrary archive paths. Direct federation avoids an unnecessary Python distribution. Dependency compatibility and inherited advisories are recorded in docs/DEPENDENCIES.md; no high/critical npm findings, but rendering advisories remain release gates. Existing CI calls the expanded root commands; hosted evidence for this implementation is pending push.

The sections below record the earlier build-package baseline; their historical test counts and zero-vulnerability npm result do not describe the expanded dependency tree.

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

N1 onward in tasks/todo.md is implementation work. Native ChatGPT discovery/approval/execution has NOT been tested; docs/HOST_VERIFICATION.md defines that gate. Colab round-trip, profiling, classification, audits, reports, full accessibility and hosted release are not implemented or passed by the foundation checks. No paid services, public deployment or production credentials were added.
