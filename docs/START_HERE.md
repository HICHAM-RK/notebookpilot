# Agent handoff

## What you are building

NotebookPilot adds a human-controlled AI tool surface to a browser notebook. The first complete demonstration is CSV upload → bounded profile → proposed cleaning cell → human review → separate execution approval → real Python output. The next milestone adds reproducible classification comparisons, audits and downloadable reports.

This repository contains the build package, a working JupyterLite sample and the original sidebar extension. Native reads, update proposals, human accept/reject controls and status reads have been verified in-app. Insertion, separate execution approval and the complete private-by-default CSV journey are browser-tested using mocked transport with real Python. Native insertion/execution/dataset verification and full timeout/lifecycle verification remain unfinished. Do not mistake the specifications or historical Graphify nodes for implemented features.

## Start a development session

1. Read AGENTS.md, SPEC.md, CAPABILITY_MAP.md and docs/VERIFICATION.md.
2. Follow tasks/todo.md in dependency order; start the first unchecked foundation task. Read its module specification and docs/TOOL_CONTRACTS.md.
3. Use Node 24 and uv 0.12.0. Run `uv sync --frozen`, `npm ci --ignore-scripts`, then `npx playwright install chromium` (Linux CI also needs `--with-deps`).
4. Run `npm test`, `npm run typecheck`, `npm run lint:check`, `npm run build`, and `npm run test:e2e` to establish the baseline. Browser testing requires port 8000 free and internet for first-use Pyodide downloads.
5. Write a failing behavior test, implement one task, run relevant checks, review the diff and update evidence before checking off that task. The next product task is A2, the evidence-based audit tool and sidebar UI.

Commands run from the repository root. `npm run serve` serves the already built site at http://127.0.0.1:8000/lab/index.html. Stop the manual server before browser tests, which own their server.

Use the project server rather than bare `python -m http.server`: it sends COOP same-origin and COEP require-corp headers on pages and workers so NotebookPilot's Pyodide worker can interrupt an approved run without restarting the kernel. Another local port is available with `npm run serve -- --port 8001`. This is static development hosting, not an application backend. Without equivalent deployment headers, notebooks still work but active Python cannot use the shared-memory cancellation path.

## File placement

Existing site fixtures: content/. Existing foundation tests: tests/ and e2e/. Planned extension: packages/notebookpilot/ with src/, tests/ and package/build metadata. Paths in module specs beginning src/ or tests/ are relative to that future extension unless explicitly marked root. Browser tests remain root e2e/. Evaluation files live in root eval/.

F3/F4 wire extension source into typecheck, formatting, Jest and the production JupyterLite build. N1/H1 provide live permission-aware reads and human access controls, with a local preview. D1/D2 provide bounded CSV parsing, private profiles and the reviewed analysis journey. npm test covers Python fixtures/contracts and extension UI/domain tests. Native coverage remains narrower than mocked browser coverage; do not report future tools or mocked journeys as native evidence.

## Connection and portability

WebMCP means tools exposed by this open website; it is not a separate Python MCP server. ChatGPT is the intended first host, but support must be proven on a named host/version. Keep registration in a small adapter because this API is evolving. Native support failure leaves ordinary notebooks usable and produces a truthful unavailable status.

Colab compatibility means importing and exporting `.ipynb` files. It does not mean controlling a live Colab session or using its GPU. Imports require a second review action, never run automatically, remove active HTML/SVG/JavaScript output and warn about incompatible APIs. Dataset files and Python packages must be provided separately.

## Skills and maintenance

Follow docs/SKILLS.md. Skills guide development; they are not bundled into the user application. Graphify outputs are a dated map of evidence and plans, not a test result. Follow docs/GRAPHIFY.md to rebuild them after substantial architectural changes. Record dependency and architecture changes in docs/ARCHITECTURE.md.
