# NotebookPilot

NotebookPilot is a browser-native data-science workspace where ChatGPT uses WebMCP site tools to inspect datasets, propose safe notebook changes, execute approved cells, and produce reproducible analysis.

The project contains an agent build package, a tested JupyterLite foundation and an original NotebookPilot sidebar extension. Agent tools and analysis features remain implementation work. Start with:

- [`AGENTS.md`](AGENTS.md)
- [`CAPABILITY_MAP.md`](CAPABILITY_MAP.md)
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
- [`docs/START_HERE.md`](docs/START_HERE.md) — next-agent setup and starting task
- [`docs/VERIFICATION.md`](docs/VERIFICATION.md) — evidence and limitations
- [`docs/GRAPHIFY.md`](docs/GRAPHIFY.md) — actual extracted architecture graph

The initial static JupyterLite build and sample notebook are implemented. Product requirements live in [SPEC.md](SPEC.md), build phases in [tasks/plan.md](tasks/plan.md), and completion tracking in [tasks/todo.md](tasks/todo.md).

## Run locally

```sh
uv sync --frozen
npm ci --ignore-scripts
npm run build
uv run python -m http.server 8000 --bind 127.0.0.1 --directory _output
```

Open http://localhost:8000/lab/index.html and run welcome.ipynb.
Build, extension activation and actual Pyodide sample output were checked locally. Native WebMCP and approval controls remain implementation tasks. Colab support is planned as `.ipynb` import/export, not connection to a live Colab runtime.

## Development checks

Use Node 24 and uv 0.12.0. After `uv sync --frozen`, run:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm test
npm run typecheck
npm run lint:check
npm run build
npm run test:e2e
```

Port 8000 must be free for browser tests. First-use Python runtime downloads require internet. TypeScript and formatting checks include extension sources and tests. `npm test` runs Python fixture/contract tests and extension Jest tests. GitHub Actions runs these commands on pushes and pull requests. See docs/DEPENDENCIES.md for dependency compatibility and open rendering-advisory release gates.

