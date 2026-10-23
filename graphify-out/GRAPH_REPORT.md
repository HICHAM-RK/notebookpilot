# Graph Report - NotebookPilot source snapshot  (2026-10-23)

This graph describes the recorded source snapshot. Specification nodes describe planned features, not implementation evidence. See corpus-snapshot.json for hashes and docs/GRAPHIFY.md for limitations.

## Corpus Check
- Corpus is ~5,061 words - fits in a single context window. You may not need a graph.

## Summary
- 83 nodes · 95 edges · 10 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.9)
- Token cost: unavailable; semantic extraction used an agent. Zero placeholders are not measured usage or zero cost.

## God Nodes (most connected - your core abstractions)
1. `WebMCP tool contract v0.1 (planned)` - 23 edges
2. `Live notebook operations (planned)` - 9 edges
3. `Browser tool adapter (planned)` - 9 edges
4. `Reproducible classification experiments (planned)` - 9 edges
5. `Human review and execution approval (planned)` - 8 edges
6. `CSV profiling and notebook portability (planned)` - 8 edges
7. `Evidence-based notebook audit (planned)` - 8 edges
8. `Portable analysis reports (planned)` - 8 edges
9. `Agent reliability and release evidence (planned)` - 7 edges
10. `NotebookPilot browser-native data science product (planned)` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Live notebook operations module (planned)` --conceptually_related_to--> `Live notebook operations (planned)`  [INFERRED]
  CAPABILITY_MAP.md → SPEC-notebook-core.md
- `Browser tool adapter module (planned)` --conceptually_related_to--> `Browser tool adapter (planned)`  [INFERRED]
  CAPABILITY_MAP.md → SPEC-webmcp-surface.md
- `Human review and execution approval module (planned)` --conceptually_related_to--> `Human review and execution approval (planned)`  [INFERRED]
  CAPABILITY_MAP.md → SPEC-human-control.md
- `CSV profiling and notebook portability module (planned)` --conceptually_related_to--> `CSV profiling and notebook portability (planned)`  [INFERRED]
  CAPABILITY_MAP.md → SPEC-dataset-intelligence.md
- `Reproducible classification experiments module (planned)` --conceptually_related_to--> `Reproducible classification experiments (planned)`  [INFERRED]
  CAPABILITY_MAP.md → SPEC-experiment-lab.md

## Hyperedges (group relationships)
- **Planned guarded edit and execution chain** — spec_notebook_core_revision_hash, spec_human_control_approval, contracts_approval [INFERRED 0.90]
- **Planned reproducible experiment report** — spec_experiment_lab_split, spec_experiment_lab_records, spec_reporting_provenance [INFERRED 0.90]

## Communities

### Community 0 - "Tool Contracts"
Cohesion: 0.13
Nodes (15): dataset_profile tool (planned), experiment_compare tool (planned), experiment_record tool (planned), notebook_audit tool (planned), notebook_get_cells tool (planned), notebook_get_context tool (planned), notebook_get_execution tool (planned), notebook_get_proposal tool (planned) (+7 more)

### Community 1 - "Notebook Foundation and Audit"
Cohesion: 0.15
Nodes (14): Foundation build and packaging module (planned), Evidence-based notebook audit module (planned), Live notebook operations module (planned), Foundation build and packaging (planned), Browser-local Pyodide runtime (planned), Reproducible static JupyterLite build (planned), Evidence-based notebook audit (planned), Heuristic findings with evidence spans (planned) (+6 more)

### Community 2 - "Experiments and Reports"
Cohesion: 0.2
Nodes (11): Reproducible classification experiments module (planned), Portable analysis reports module (planned), Reproducible classification experiments (planned), Macro classification metrics (planned), Training-only preprocessing (planned), Persisted experiment provenance (planned), Stratified 80/20 split and seed 42 (planned), Portable analysis reports (planned) (+3 more)

### Community 3 - "Agent Workflow and Provenance"
Cohesion: 0.25
Nodes (8): Agent engineering boundaries, Required skill routing, Agent development workflow, MIT notice retention for copied source, alliecatowo/jupyterlite-web-mcp inspiration, Project onboarding documents, Graphify extraction and provenance workflow, External skills portability and fallback practices

### Community 4 - "Browser Integration and Release"
Cohesion: 0.25
Nodes (8): Browser tool adapter module (planned), Review and release gate, Native host release verification requirement, Preview deployment rollback verification, Browser tool adapter (planned), Native document.modelContext registration (planned), Real host discovery and invocation evidence (planned), Runtime argument validation (planned)

### Community 5 - "Product Delivery Status"
Cohesion: 0.29
Nodes (7): Upload-profile-propose-approve-execute milestone (planned), Phased implementation roadmap (planned), Static JupyterLite build and sample notebook (documented as implemented), Tool guards are not Python sandbox (design boundary), NotebookPilot browser-native data science product (planned), Private GitHub repository (documented complete), Implementation completion tracker

### Community 6 - "Dataset and Colab Portability"
Cohesion: 0.33
Nodes (6): CSV profiling and notebook portability module (planned), Colab file portability without runtime transfer (planned), CSV profiling and notebook portability (planned), Colab notebook metadata portability (planned), UTF-8 CSV upload limits and profiling (planned), Explicit raw sample sharing (planned)

### Community 7 - "Human Approval Boundaries"
Cohesion: 0.33
Nodes (6): Human review and execution approval module (planned), UI-only human approval boundary (planned), Human review and execution approval (planned), Separate human execution approval (planned), Ten-minute proposal expiration (planned), Read-only default and external permission policy (planned)

### Community 8 - "Reliability Evaluation"
Cohesion: 0.4
Nodes (5): Agent reliability and release evidence module (planned), Agent reliability and release evidence (planned), Repeated fixed reliability cases (planned), Actual task evidence and native/shim labels (planned), Zero successful security violations (planned)

### Community 9 - "Foundation Test Structure"
Cohesion: 0.67
Nodes (1): FoundationTests

## Knowledge Gaps
- **52 isolated node(s):** `Foundation build and packaging module (planned)`, `Live notebook operations module (planned)`, `Browser tool adapter module (planned)`, `Human review and execution approval module (planned)`, `CSV profiling and notebook portability module (planned)` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WebMCP tool contract v0.1 (planned)` connect `Tool Contracts` to `Notebook Foundation and Audit`, `Experiments and Reports`, `Browser Integration and Release`, `Dataset and Colab Portability`, `Human Approval Boundaries`, `Reliability Evaluation`?**
  _High betweenness centrality (0.377) - this node is a cross-community bridge._
- **Why does `CSV profiling and notebook portability (planned)` connect `Dataset and Colab Portability` to `Tool Contracts`, `Notebook Foundation and Audit`, `Experiments and Reports`, `Browser Integration and Release`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **Why does `Browser tool adapter (planned)` connect `Browser Integration and Release` to `Tool Contracts`, `Notebook Foundation and Audit`, `Dataset and Colab Portability`, `Human Approval Boundaries`, `Reliability Evaluation`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **What connects `Foundation build and packaging module (planned)`, `Live notebook operations module (planned)`, `Browser tool adapter module (planned)` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tool Contracts` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._