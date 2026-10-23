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
