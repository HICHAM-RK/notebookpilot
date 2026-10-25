# Security and accessibility review

Date: 2026-10-25. Reviewed branch: `codex/agent-build-package`. Scope: NotebookPilot extension, WebMCP surface, local Python worker, notebook/dataset import boundaries, portable reports, evaluation evidence and the fresh Chromium experience. This review does not claim that upstream JupyterLab or a future hosting provider is vulnerability-free.

## Release-gate result

E2 passes for the local product artifact with one tracked upstream dependency risk for deployment review. The browser checks produced zero successful unauthorized executions, zero hidden-cell/notebook disclosures, zero hostile-upload script executions and zero axe violations in the NotebookPilot panel. Keyboard operation and visible focus were verified. No credentials or credential-shaped assignments are checked into tracked source.

## Security findings

### Authorization and privacy — pass

- A fresh Chromium profile starts read-only. A direct `notebook_run_cells` call returned `ACCESS_DENIED`, created no run request and executed nothing.
- Hiding one cell removed its identifier and content from `notebook_get_cells`. Hiding the notebook changed the same call to scoped `NOT_FOUND` without content.
- The native E1 matrix recorded zero unauthorized executions and zero hidden-data exposures across 18 runs. All 18 injected approval fields returned `INVALID_ARGUMENT`.
- Editing and execution remain separate human actions. Native W3/E1 evidence proves accepted source does not execute and every run starts pending until the visible approval action.
- Dataset samples are excluded unless the human enables sample sharing. Reports exclude raw rows and tool calls prepare metadata but cannot download.

### Rendering, upload and export boundaries — pass

- A hostile CSV filename and a value containing a script element rendered as inert text; no `script` or `img` element was created and the sentinel stayed false.
- The Colab import regression retains code as source, strips active HTML/SVG/JavaScript output and never autoruns imported code.
- Generated HTML reports contain no scripts, images, frames, embeds, objects or external requests and render offline. Markdown/HTML content is escaped and bounded.
- CSV formulas remain text; CSV/IPYNB byte, row, column and format limits are covered by unit and browser tests.

### Secrets and network boundaries — pass

- A tracked-file scan for API keys, access tokens, passwords, client secrets and private-key assignments found no credential literal. The only source match for `password` is the Jupyter kernel method's boolean input flag.
- The application has no model-provider key, backend database or analytics endpoint. Notebook, dataset, experiment and report state stays in the browser unless the human explicitly downloads a file.
- The local server applies the isolation headers needed by the Pyodide worker, including error responses; hosted header verification remains an E3 gate.

### Dependency audit — accepted with tracked upstream risk

- `uvx pip-audit` against the locked 64-package Python export found no known vulnerabilities.
- `npm audit --omit=dev` reported 0 critical, 0 high, 23 moderate and 3 low findings. These are propagated counts from the pinned JupyterLab/JupyterLite graph, rooted in `sanitize-html@2.12.1`, `mermaid@11.17.2`, `katex@0.16.47` and `@mermaid-js/layout-elk@0.2.3`.
- `npm audit fix --dry-run` proposed zero safe changes. Its advertised forced fixes downgrade core Jupyter packages to incompatible historical major versions, so they were not applied.
- The most relevant risk is upstream HTML sanitization for notebooks opened outside NotebookPilot's guarded import path. NotebookPilot's import and report paths do not pass active HTML through that dependency, but the general Jupyter renderer is upstream surface area. Before E3, re-check the audit and upgrade the pinned Jupyter stack when a compatible release resolves it. Do not accept arbitrary third-party notebooks as trusted content.

## Accessibility findings

- Axe 4.14.0 found zero violations within `.np-workspace` in both initial and expanded permission/preview states.
- The NotebookPilot region and headings have accessible names. File inputs, selects, fieldsets, summaries, status messages and alerts are labelled through native semantics.
- Keyboard-only testing selected access mode, expanded cell permissions and activated preview. Focus stayed visible with a non-zero brand-color outline.
- Existing browser journeys operate edit acceptance, permission selection, audit navigation, report creation and execution review through labelled controls. No pointer-only NotebookPilot action was found.

Automated axe checks cannot prove complete accessibility. Screen-reader behavior outside the NotebookPilot region and upstream JupyterLab accessibility remain outside this gate; a manual assistive-technology pass is recommended before a public production launch.

## Evidence

- `e2e/accessibility.spec.ts`: axe, keyboard/focus, fresh-profile authorization/privacy and hostile upload rendering.
- `e2e/import.spec.ts`: inert Colab import and no autorun.
- `e2e/report.spec.ts`: escaped offline report with zero external requests.
- `e2e/review.spec.ts`, `e2e/execution.spec.ts` and native W3/E1 logs: separate human edit/run control.
- `eval/results/native-2026-10-25.md`: native tool-call and safety matrix.
- `docs/VERIFICATION.md`: command results and historical implementation evidence.
