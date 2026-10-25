# NotebookPilot

NotebookPilot is a browser-native data-science workspace where ChatGPT uses WebMCP site tools to inspect datasets, propose safe notebook changes, execute approved cells, and produce reproducible analysis.

NotebookPilot is a tested JupyterLite application with an original sidebar extension. The implementation includes permission-aware notebook tools, human-reviewed edits, separately approved execution, private-by-default CSV profiling, reproducible browser-local classification experiments, persistent comparison history, notebook audits and portable reports. Project documentation:

- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application architecture and trust boundaries
- [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md) — dependency and compatibility notes
- [`docs/RELEASE.md`](docs/RELEASE.md) — hosting decision, deployment and rollback checklist
- [`docs/TOOL_CONTRACTS.md`](docs/TOOL_CONTRACTS.md) — WebMCP tool behavior

Every local implementation, evaluation, security and accessibility task is complete. Publishing a hosted demo remains deliberately open until the owner approves its host and public/private visibility. Internal agent instructions, specifications, planning trackers and generated development evidence are retained locally and excluded from the published repository.

Open the NotebookPilot sidebar to choose notebook/cell permissions and preview exactly which live cell sources an agent reader may receive. Unsaved edits are included; hidden cells are excluded. Permission choices last for the current session. Upload a CSV to profile it locally, choose whether the agent may receive up to five sample rows, and review proposed notebook edits before separately approving execution. The experiment panel can generate reviewed logistic-regression or random-forest cells with a fixed split, training-only preprocessing and recorded metrics.

Verified generated experiments are saved locally in the browser under a versioned schema. The history panel ranks only compatible successful runs, explains incompatibilities, and provides explicit JSON export and deletion. Exported experiment records contain metrics and provenance without uploaded dataset rows.

## Run locally

```sh
uv sync --frozen
npm ci --ignore-scripts
npm run build
uv run python -m http.server 8000 --bind 127.0.0.1 --directory _output
```

Open http://localhost:8000/lab/index.html and run welcome.ipynb.
Build, extension activation, human approval controls and actual Pyodide output were checked locally. The complete WebMCP journey passed in the native ChatGPT host: tool discovery, an unsaved-cell read, denied and accepted edits, separate execution approval and real Python output. Hosted-site verification remains a separate release gate. Colab-compatible `.ipynb` import/export is implemented with review, compatibility warnings and no automatic execution. NotebookPilot does not connect to a live Colab runtime.

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

Port 8000 must be free for browser tests. First-use Python runtime downloads require internet. TypeScript and formatting checks include extension sources and tests. `npm test` runs Python fixture/contract tests and extension Jest tests. GitHub Actions runs these commands on pushes and pull requests. The manual release-artifact workflow creates a tested static bundle but never publishes it. See [docs/RELEASE.md](docs/RELEASE.md) for the remaining hosting decision and [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) for dependency compatibility and tracked rendering advisories.

