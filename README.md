# NotebookPilot

NotebookPilot is a browser-native data-science workspace where ChatGPT uses WebMCP site tools to inspect datasets, propose safe notebook changes, execute approved cells, and produce reproducible analysis.

The project is currently in the specification phase. Start with:

- [`AGENTS.md`](AGENTS.md)
- [`CAPABILITY_MAP.md`](CAPABILITY_MAP.md)
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)

The initial static JupyterLite build and sample notebook are implemented. Product requirements live in [SPEC.md](SPEC.md), build phases in [tasks/plan.md](tasks/plan.md), and completion tracking in [tasks/todo.md](tasks/todo.md).

## Run locally

```sh
uv sync --frozen
uv run jupyter lite build --contents content --output-dir _output
uv run python -m http.server 8000 --bind 127.0.0.1 --directory _output
```

Open http://localhost:8000/lab/index.html and run welcome.ipynb.
Build, notebook schema and sample output were checked locally. Browser kernel execution, custom extension, WebMCP and approval controls are still pending.

