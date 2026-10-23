# NotebookPilot requirements

Status: initial implementation baseline. No runtime features are complete.

## Objective
ChatGPT uses WebMCP tools to work with a live JupyterLite notebook. Python runs through Pyodide. No embedded chatbot or application API key is needed.

## Acceptance criteria
- Upload CSV and execute Python in the browser.
- Read live cells through bounded WebMCP results; notebooks remain usable without WebMCP.
- Show proposed edits as diffs; rejection changes nothing; acceptance rechecks source hashes.
- Run only visible, authorized cells after human approval.
- Profile types, missing values and duplicates against known fixtures.
- Track classification experiments with dataset identity, split, seed, parameters and metrics; compare only compatible evaluations.
- Export reproducibility reports with evidence and provenance.
- Import/export Colab .ipynb files preserving cells and metadata. Warn about unsupported runtime code; Colab GPU, variables, files and packages do not transfer.

## Boundaries
Tool results shared with ChatGPT leave the browser. Browser storage is not a backup. Cell permissions are tool guards, not a Python sandbox. Leakage and dangerous-code detection are warnings, not guarantees. No backend, accounts, telemetry or cloud GPU integration in the initial version.

## Stack and verification
TypeScript JupyterLab extension, React panels, JupyterLite, Pyodide, Jest and Playwright. Resolve and lock compatible versions during foundation work. Unit tests cover algorithms/errors; integration tests cover notebook models; browser tests verify real Python execution and approval. A WebMCP shim does not prove real ChatGPT compatibility; record a separate real-host smoke test.

## Document ownership
AGENTS.md defines workflow and skills. CAPABILITY_MAP.md defines boundaries. tasks/plan.md defines phases. tasks/todo.md tracks completion. Module specs add implementation contracts before each slice.
