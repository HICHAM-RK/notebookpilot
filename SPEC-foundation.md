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
content/ contains original demonstration fixtures; root configuration defines the site; future packages/notebookpilot contains the TypeScript extension. Use explicit TypeScript interfaces, Prettier formatting, two-space indentation, and structured errors at tool boundaries.

## Verification
`npm test` validates notebook schema and executes the trusted sample against its CSV using CPython. `npm run test:e2e` opens the built notebook and checks actual Pyodide output in Chromium. Run `npm run build` before browser tests. `npm run typecheck` checks test/config TypeScript, and `npm run lint:check` checks its formatting. These scripts and CI exist; extension packaging and extension unit tests remain task F3. Record verification in docs/VERIFICATION.md.
