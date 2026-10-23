# Foundation specification

## Scope
Create a reproducible local JupyterLite build and a notebook that executes real Python. Then add original extension packaging and CI in subsequent foundation slices. The user authorized starting implementation and publishing initial commits to the private repository.

## Commands
Run from the repository root:

```sh
uv sync --frozen
npm ci --ignore-scripts
npm run build
uv run python -m http.server 8000 --bind 127.0.0.1 --directory _output
```

Open http://localhost:8000/lab/index.html. These commands build and serve static assets; the server does not execute notebook Python. Pyodide runs in the browser and may download runtime assets on first use.

## Acceptance
- Frozen installation succeeds using uv.lock.
- Build produces lab/index.html and includes the sample notebook and CSV.
- Sample code prints `Rows: 4; missing ages: 1`.
- A browser runtime check is recorded separately from build success.
- No API keys, private datasets or upstream implementation code are included.

## Extension activation slice (F3/F4)
Create an original prebuilt extension at packages/notebookpilot and supply its labextension directory directly to JupyterLite's federated_extensions build option. A separate Python wheel is unnecessary for this repository-local build; add distributable Python packaging only when publishing an extension independently. Use the locked JupyterLite lab package metadata as the builder's core configuration, avoiding a second unpinned JupyterLab installation.

The NotebookPilot sidebar uses JupyterLab theme tokens and ReactWidget. It shows an empty state until a notebook is selected, then the live notebook name. It truthfully states that agent tools are not connected. It must not read source, mutate cells or execute anything in this slice. Tracker subscriptions disconnect on disposal. Tests must prove the sidebar activates in the built site and reacts to opening/closing a notebook. Ordinary Python execution remains working.

## Structure and style
content/ contains original demonstration fixtures; root configuration defines the site; future packages/notebookpilot contains the TypeScript extension. Use explicit TypeScript interfaces, Prettier formatting, two-space indentation, and structured errors at tool boundaries.

## Verification
`npm test` validates notebook schema, executes the trusted sample using CPython, checks planned tool schemas and runs extension Jest tests. `npm run test:e2e` verifies sidebar activation/open/close and real Pyodide output in Chromium. Run `npm run build` before browser tests. Typecheck and formatting include production extension sources and tests. The extension is compiled with the locked JupyterLite lab metadata and supplied using --LiteBuildConfig.federated_extensions. Record evidence in docs/VERIFICATION.md.
