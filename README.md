# NotebookPilot

NotebookPilot is a browser-native data-science workspace that connects an AI assistant to JupyterLite through WebMCP. Instead of giving the model unrestricted notebook access, NotebookPilot exposes a small set of controlled tools for reading context, proposing changes, running approved cells, inspecting datasets, and recording reproducible results.

The goal is simple: make AI-assisted notebook work useful without turning the assistant into an invisible automation layer.

## Why WebMCP?

A normal GPT wrapper sends a prompt to a model and displays its response. NotebookPilot gives the assistant structured tools that describe what it may do inside the notebook.

The assistant can request an action, but NotebookPilot applies the rules:

- the user chooses what notebook content may be read;
- proposed edits are shown before they are inserted;
- execution requires a separate approval;
- uploaded CSV data is processed in the browser;
- experiment results include metrics and provenance;
- actions can be reviewed through an audit trail.

The model provides reasoning. WebMCP provides the interface and boundaries. JupyterLite provides the notebook and browser-based Python runtime.

## Project direction

NotebookPilot is being built as an original JupyterLite extension with:

- permission-aware notebook and cell inspection;
- reviewed code insertion and editing;
- separately approved Python execution;
- local CSV profiling and data-quality checks;
- reproducible logistic-regression and random-forest experiments;
- experiment history and comparison;
- notebook audits and portable reports;
- Google Colab-compatible `.ipynb` import and export.

The expanded implementation is being reviewed in [pull request #1](https://github.com/HICHAM-RK/notebookpilot/pull/1). Public hosting is optional; the application can run locally as a JupyterLite site.

## Run the current demo locally

Requirements: Python 3.11+ and [uv](https://docs.astral.sh/uv/).

```sh
uv sync --frozen
uv run jupyter lite build --contents content --output-dir _output
uv run python -m http.server 8000 --bind 127.0.0.1 --directory _output
```

Open [http://localhost:8000/lab/index.html](http://localhost:8000/lab/index.html), then open `welcome.ipynb`.

## Architecture

```text
AI assistant
    ↓ requests a bounded action
WebMCP tools
    ↓ validate permissions and inputs
NotebookPilot review controls
    ↓ require the user's approval
JupyterLite + Pyodide
    ↓ run Python in the browser
Notebook output and audit history
```

No Python notebook server is required for the browser application. A static host is only needed when sharing the app publicly; local use works from a local web server.

## Privacy and safety

NotebookPilot is designed around explicit access and approval:

- dataset processing stays browser-local by default;
- hidden cells are not shared with the assistant;
- unsaved cell content is handled deliberately;
- edits and execution are separate decisions;
- imported notebooks are never executed automatically;
- internal development instructions and planning files are not published.

## Status

The static JupyterLite foundation and sample notebook are available on `main`. The full NotebookPilot extension, automated tests, WebMCP tool surface, experiment workflow, and release documentation are in active review in PR #1.

## License and attribution

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency attribution and third-party notices.
