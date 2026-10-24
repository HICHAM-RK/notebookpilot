# Agent handoff

## What you are building

NotebookPilot adds a human-controlled AI tool surface to a browser notebook. The first complete demonstration is CSV upload → bounded profile → proposed cleaning cell → human review → separate execution approval → real Python output. The next milestone adds reproducible classification comparisons, audits and downloadable reports.

This repository contains the build package, a working JupyterLite sample and the original sidebar extension. Two native WebMCP read tools are connected and have passed initial in-app discovery/read/hide checks. Proposals and execution tools remain unimplemented. Do not mistake the specifications or historical Graphify nodes for implemented features.

## Start a development session

1. Read AGENTS.md, SPEC.md, CAPABILITY_MAP.md and docs/VERIFICATION.md.
2. Follow tasks/todo.md in dependency order; start the first unchecked foundation task. Read its module specification and docs/TOOL_CONTRACTS.md.
3. Use Node 24 and uv 0.12.0. Run `uv sync --frozen`, `npm ci --ignore-scripts`, then `npx playwright install chromium` (Linux CI also needs `--with-deps`).
4. Run `npm test`, `npm run typecheck`, `npm run lint:check`, `npm run build`, and `npm run test:e2e` to establish the baseline. Browser testing requires port 8000 free and internet for first-use Pyodide downloads.
5. Write a failing behavior test, implement one task, run relevant checks, review the diff and update evidence before checking off that task.

Commands run from the repository root. `npm run serve` serves the already built site at http://127.0.0.1:8000/lab/index.html. Stop the manual server before browser tests, which own their server.

## File placement

Existing site fixtures: content/. Existing foundation tests: tests/ and e2e/. Planned extension: packages/notebookpilot/ with src/, tests/ and package/build metadata. Paths in module specs beginning src/ or tests/ are relative to that future extension unless explicitly marked root. Browser tests remain root e2e/. Evaluation files live in root eval/.

F3/F4 wire extension source into typecheck, formatting, Jest and the production JupyterLite build. N1/H1 provide live permission-aware reads and human access controls, with a local preview. npm test covers Python fixtures/contracts and extension UI/domain tests. Next: W1 host registration investigation and H2 proposal review, before N2 execution and W2 mutation exposure. Do not report coverage of future tools from current checks.

## Connection and portability

WebMCP means tools exposed by this open website; it is not a separate Python MCP server. ChatGPT is the intended first host, but support must be proven on a named host/version. Keep registration in a small adapter because this API is evolving. Native support failure leaves ordinary notebooks usable and produces a truthful unavailable status.

Colab compatibility means importing and exporting `.ipynb` files. It does not mean controlling a live Colab session or using its GPU. Imported notebooks never run automatically. Dataset files and Python packages must be provided separately.

## Skills and maintenance

Follow docs/SKILLS.md. Skills guide development; they are not bundled into the user application. Graphify outputs are a dated map of evidence and plans, not a test result. Follow docs/GRAPHIFY.md to rebuild them after substantial architectural changes. Record dependency and architecture changes in docs/ARCHITECTURE.md.
