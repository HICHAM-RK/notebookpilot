# Build phases

| Phase | Deliverable | Exit evidence |
|---|---|---|
| 0 | Project documents and private GitHub repository | Private visibility and remote commit match |
| 1 | Extension packaging and JupyterLite build | Clean installation/build; browser executes Python |
| 2 | Live notebook operations and WebMCP tools | Contract/stale-write tests; real-host discovery |
| 3 | Human review and execution approval | Browser tests for accept, deny, changed cells and cancellation |
| 4 | CSV profiling and Colab notebook import/export | Correct fixture counts and metadata round-trip |
| 5 | Classification experiment comparisons | Fixed splits/seeds and checked metrics |
| 6 | Notebook audit and reports | Reports match records and safely escape untrusted content |
| 7 | Agent evaluation and release | Reliability report, accessibility and release review |

Tests accompany every phase. Dependencies follow CAPABILITY_MAP.md. First usable milestone ends at phase 4. Private source does not imply private hosting. Check browser/Pyodide compatibility early; uploaded notebooks never execute automatically.

## Executable task order
tasks/todo.md is the authoritative checkbox list. Foundation F0–F4 and N1/H1 are implemented. W1 can now probe native support before investing in all feature handlers. H2/N2 establish authority before W2 exposes mutations. W3 proves the native journey. D1–D3 finish the first usable milestone; X1/X2, A1/A2 and R1/R2 deliver the analysis workflow; E1–E3 evaluate and release it.

## Checkpoints
After F4: clean build and real browser output, extension activation. After N1/H1: unsaved reads and hidden-data denial. After H2/N2: reject/stale/execute races covered. After W3: native host evidence. After D3: first milestone and Colab file round-trip. After X2: repeatable trusted metrics after reload. After R2: report matches records and is safe offline. After E3: hosted journey and rollback verified. Review findings at each checkpoint before expanding scope.

## Risks and decisions
Native WebMCP may differ across hosts: isolate adapter and fail the native gate honestly. Pyodide package availability may limit experiments: verify scikit-learn early in X1, never replace it with fabricated metrics. Browser storage can be cleared: make export/deletion and quota errors explicit. Python is not sandboxed by cell policies: keep approval and visible source, and label heuristic warnings. See docs/ARCHITECTURE.md for decisions. Deployment host/privacy is intentionally undecided until E3; it does not block local implementation.
