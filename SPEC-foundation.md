# Foundation specification

## Scope
Create a reproducible local JupyterLite build and a notebook that executes real Python. Then add original extension packaging and CI in subsequent foundation slices. The user authorized starting implementation and publishing initial commits to the private repository.

## Commands
Run from the repository root:

```sh
uv sync --frozen
uv run jupyter lite build --contents content --output-dir _output
uv run python -m http.server 8000 --bind 127.0.0.1 --directory _output
```

Open http://localhost:8000/lab/index.html. These commands build and serve static assets; the server does not execute notebook Python. Pyodide runs in the browser and may download runtime assets on first use.

## Acceptance
- Frozen installation succeeds using uv.lock.
- Build produces lab/index.html and includes the sample notebook and CSV.
- Sample code prints `Rows: 4; missing ages: 1`.
- A browser runtime check is recorded separately from build success.
- No API keys, private datasets or upstream implementation code are included.

## Structure and style
content/ contains original demonstration fixtures; root configuration defines the site; future packages/notebookpilot contains the TypeScript extension. Use explicit TypeScript interfaces, single quotes, two-space indentation, and structured errors at tool boundaries.

## Verification
Validate notebook schema and execute its code against its fixture using Python; then check browser execution independently. TypeScript unit tests and Playwright are introduced with the extension; do not claim currently nonexistent npm scripts pass.
