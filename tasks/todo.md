# Work tracker and implementation tasks

Checked tasks require evidence in docs/VERIFICATION.md. Preparing a task does not complete it. `ext/` means future packages/notebookpilot/. For every task run typecheck, lint and its relevant tests; browser checks require a fresh build. Tests specified below are requirements to add, not tests already implemented. Split a task if more than five files need behavioral changes.

## Foundation

- [x] F0: Initialize repository, attribution and initial private GitHub history.
- [x] F1: Pin JupyterLite dependencies, build static site and validate sample notebook. Files: pyproject.toml, uv.lock, jupyter-lite.json, content/welcome.ipynb, content/data/customers.csv. Evidence: frozen sync/build and trusted-fixture unit test.
- [x] F2: Add test tooling and CI configuration; prove real Pyodide sample output. Files: package.json/lock, playwright.config.ts, e2e/foundation.spec.ts, .github/workflows/ci.yml. Hosted CI execution is recorded separately.
- [x] F3: Original JupyterLab extension packaged and activated. Files: ext/package.json, ext/src/index.ts, ext/src/workspace.tsx, ext/src/view.tsx, ext/tsconfig.json. Actual browser activation/open/close checked; direct federated-extension packaging replaces an unnecessary Python wheel as documented in SPEC-foundation.
- [x] F4: Extension wired into root build/typecheck/formatting/Jest and existing CI commands. Production type-error mutation failed the check as required; unit test first failed before the view existed. Verify evidence in docs/VERIFICATION.md. Browser tests cover activation and actual Python.

## Notebook and human control

- [x] N1: Live snapshots and revisions. Implemented adapter.ts, reader.ts and revisions.ts. Unsaved source verified against the real Jupyter model in browser; unit tests cover SHA-256, UTF-8/transport bounds, visible-only pagination, invalid IDs, permission revocation, edits/deletion/close during hashing.
- [x] H1: Session permissions. Implemented control/policy.ts and ui/access.tsx. Read-only default, notebook/cell hiding, corrupt values fail closed; no policy comes from imported metadata. Preview invalidates on edits/permission changes. Unit matrix and browser keyboard/type-ahead selection verified.
- [x] H2: Proposals and diff review. Depends H1. Files: ext/src/control/proposals.ts, ext/src/ui/review.tsx, ext/tests/control.test.ts, e2e/review.spec.ts. Acceptance: accept once, reject changes nothing, stale/deleted target fails, ten-minute expiry, insertion anchor checked, no execution. Verify browser accept/reject and concurrent-edit race.
- [ ] N2: Approved execution queue. Depends H2. Files: ext/src/notebook/execution.ts, ext/src/ui/execution.tsx, ext/tests/execution.test.ts, e2e/execution.spec.ts. Acceptance: separate approval, permission/hash recheck at dispatch, visible cells only, 20-cell/120s limits, cancellation/restart resolves records, human work not inadvertently interrupted. Verify real output, denial, timeout and edit-after-approval.
  - [x] N2 runtime interruption: a source-level Pyodide worker sets a per-kernel interrupt buffer. The real 15-second busy-loop regression now produces KeyboardInterrupt without its stdout completion marker, preserves a variable assigned before interruption and executes the next approved cell. A second real busy loop is cancelled by human kernel restart, and the replacement kernel executes a new approved cell. Unit tests cover early/current/wrong-request signalling; adapter tests cover foreign-work refusal and once-only signalling.

## WebMCP

- [ ] W1: Native API and lifecycle. Depends N1,H1; SPEC-webmcp-surface. Files: ext/src/webmcp/register.ts, ext/src/webmcp/types.ts, ext/tests/registration.test.ts, docs/HOST_VERIFICATION.md. Acceptance: host API/version recorded, feature detection, teardown, no duplicate registration, unsupported browser still usable. Verify native discovery separately from mocked lifecycle tests.
- [ ] W2: Notebook tool validation/routing. Depends W1,N2. Files: ext/src/webmcp/validation.ts, ext/src/webmcp/tools.ts, ext/tests/webmcp.test.ts, contracts/tools.json. Acceptance: contract parity, unknown fields/bounds rejected, scoped errors, result byte limits, no approval tool. Verify adversarial fixtures and adapter integration.
- [ ] W3: Native host journey. Depends W2. Files: docs/HOST_VERIFICATION.md, e2e/webmcp.spec.ts. Acceptance: host discovers tools, reads unsaved cell, proposes edit, human accepts and separately approves execution, real output returned; denial leaves state unchanged. Record host/version/prompts/calls/outcomes. A shim never passes this gate.

## Dataset and Colab

- [x] D1: CSV validation/profile. Depends H1,W2; SPEC-dataset-intelligence. Files: ext/src/data/import.ts, ext/src/data/profile.ts, ext/tests/data.test.ts, content/fixtures/profile.csv. Acceptance: correct counts, quoted commas/newlines/Unicode accepted, duplicate headers/ragged rows rejected, 10MiB/100k row bounds, original-byte hash, formula text inert. Verify exact edge-fixture results and generated boundary inputs.
- [x] D2: Dataset UI and tools. Depends D1,N2. Files: ext/src/ui/datasets.tsx, ext/src/webmcp/data-tools.ts, ext/tests/data-tools.test.ts, e2e/dataset.spec.ts. Acceptance: explicit sharing, no raw samples by default, bounded results, visible loading/errors/cancel, no hidden Python. Verify upload → profile → propose → review → execute.
  - [x] D2a: Session dataset store and profile tool. Generated app-owned filenames, strict lookup/permission checks, raw rows absent by default, explicit sample sharing, cancellation cleanup and bounded envelopes.
  - [x] D2b: Upload/review UI and browser journey. Visible loading/error/cancel/remove states; upload → profile → proposed visible cell → human edit acceptance → separate run approval → real output.
- [x] D3: Colab file round-trip. Depends D1,N1. Files: ext/src/notebook/portability.ts, ext/tests/portability.test.ts, content/fixtures/colab.ipynb, e2e/import.spec.ts. Acceptance: nbformat4/20MiB validation, cells/unknown metadata preserved, no autorun or active imported HTML, GPU/shell/Drive/google.colab warnings. Verify downloaded notebook schema and metadata. Live Colab runtime access is out of scope.
  - [x] D3a: Portability domain and fixture. Strict UTF-8 nbformat 4 validation, 20 MiB import/export bounds, semantic round-trip of cells and unknown metadata, inert HTML storage and deterministic Colab/Drive/shell/GPU warnings.
  - [x] D3b: Human import/export UI and real-browser round-trip. Import into the active notebook without autorun, show compatibility warnings, download and verify the resulting `.ipynb`, and prove hostile imported HTML remains inactive.

## Experiments

- [x] X1: Reproducible training cells. Depends D2,N2; SPEC-experiment-lab. Files: ext/src/experiments/templates.ts, ext/src/experiments/model.ts, ext/tests/templates.test.ts, e2e/experiment.spec.ts. Acceptance: logistic regression/random forest in actual Pyodide, stratified80/20 seed42, train-only preprocessing, impossible split rejected, versions/metrics recorded. Verify known labelled fixture, repeatability and preprocessing leakage.
  - [x] X1a: Fixed training templates and explicit selection UI. Human chooses dataset, target, features and model; generated insertion proposals contain the documented split, preprocessing, estimator, metrics, version and fingerprint logic.
  - [x] X1b: Real Pyodide model verification. Execute both models on the labelled fixture through edit and run approvals, prove repeatability, inspect metrics/fingerprints and verify an impossible split fails visibly.
- [x] X2: Persist and compare records. Depends X1. Files: ext/src/experiments/store.ts, ext/src/experiments/compare.ts, ext/src/webmcp/experiment-tools.ts, ext/tests/experiments.test.ts, ext/src/ui/experiments.tsx. Acceptance: trusted execution-derived records, reload persistence, visible quota failures, failed/cancelled not ranked, exact dataset/target/features/split compatibility, delete/export controls. Verify forged IDs, mismatches and browser reload.
  - [x] X2a: Persisted experiment domain. Validate versioned records, save atomically, restore after reload, reject malformed storage, compare exact compatible inputs and keep failed/cancelled runs unranked.
  - [x] X2b: Trusted execution recording and tools. Bind app-generated proposals to accepted cells, derive records only from matching approved executions, and expose closed bounded record/compare tools.
  - [x] X2c: History UI and browser lifecycle. Show storage failures, comparison compatibility and status; provide delete/export controls and prove reload survival in Chromium.

## Audit and reporting

- [x] A1: Audit rules. Depends N1,H1,D1; SPEC-notebook-audit. Files: ext/src/audit/rules.ts, ext/src/audit/model.ts, ext/tests/audit.test.ts. Acceptance: fixed documented penalties, evidence spans, hidden cells excluded, stale findings invalidated, unsupported syntax not evaluated. Verify positive/negative cases for every rule.
  - [x] A1a: Pure audit analyzer. Implement the seven fixed rules, one-based evidence spans, execution coverage, deterministic scoring, unsupported-syntax `notEvaluated` entries and source-hash staleness checks.
  - [x] A1b: Permission-scoped audit integration. Feed only visible live cells into the analyzer and prove hidden content is neither inspected nor returned.
- [x] A2: Audit UI/tool. Depends A1,W2. Files: ext/src/ui/audit.tsx, ext/src/webmcp/audit-tools.ts, e2e/audit.spec.ts. Acceptance: scope/heuristic limitations visible, keyboard navigation to cells, empty/error states. Verify changed-source warning and keyboard flow.
  - [x] A2a: Register the closed, bounded `notebook_audit` tool and cover validation, cancellation, scope and hidden-content behavior.
  - [x] A2b: Render audit score, coverage, findings, limitations and empty/error/not-evaluated states in the sidebar.
  - [x] A2c: Navigate fresh findings to their cells, disable navigation for changed evidence and verify the complete flow in Chromium.
- [x] R1: Portable report rendering. Depends X2,A2; SPEC-reporting. Files: ext/src/reports/model.ts, ext/src/reports/export.ts, ext/tests/reports.test.ts. Acceptance: exact metrics/provenance, failed/missing runs labelled, HTML/Markdown escaped, no scripts/external requests, 5MiB cap. Verify hostile strings, size limits and report contents.
- [x] R2: Export UI/tools. Depends R1,W2. Files: ext/src/ui/reports.tsx, ext/src/webmcp/report-tools.ts, e2e/report.spec.ts. Acceptance: explicit local download, scope visible, raw rows excluded by default, standalone report works offline. Verify downloads and rendering without external requests.
  - [x] R2a: Prepare session-scoped reports through a closed tool that returns metadata only and never initiates a download.
  - [x] R2b: Let the human select runs and format, explicitly download or remove prepared reports, and clear reports when their notebook closes.
  - [x] R2c: Verify the downloaded HTML renders offline without scripts or external requests and the Markdown path remains available.

## Evaluation and release

- [ ] E1: Evaluation runner. Depends W3,R2; SPEC-evaluation. Files: eval/cases.json, eval/run.ts, eval/report.ts, ext/tests/evaluation.test.ts. Acceptance: read/profile/stale edit/deny/run/export cases three times each; actual calls, validity/success/latency, native/shim labels, failures retained. Verify deterministic scorer fixtures and native run. Never invent costs.
- [ ] E2: Security/accessibility review. Depends E1. Files: docs/REVIEW.md, docs/VERIFICATION.md, e2e/accessibility.spec.ts. Acceptance: zero successful unauthorized execution/hidden-data access, keyboard flows, no secrets, render/upload boundary tests, dependency audit triage. Verify fresh browser profile and complete checks; record findings.
- [ ] E3: Hosted demo. Depends E2. Files: deployment workflow/config, README.md, docs/RELEASE.md. Acceptance: approved host/privacy choice, HTTPS/assets/worker behavior verified, native journey on hosted URL, rollback/backup instructions and attribution. No new paid service or credentials without authorization. Verify deployed commit and complete journey.

## Completion rule

Build-package readiness requires specs, contracts, actionable tasks, skills, test/CI setup, browser evidence, Graphify and reviewed handoff. Product readiness additionally requires every unchecked task above. These are distinct milestones; documentation never completes an implementation task.
