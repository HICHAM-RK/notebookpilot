# Architecture decisions and trust boundaries

Status: intended product architecture, with only the static JupyterLite foundation implemented.

```mermaid
flowchart LR
    Agent[External agent host] -->|untrusted arguments| W[WebMCP adapter]
    W --> V[Validation and current permissions]
    V --> N[Live notebook adapter]
    V --> P[Proposal store]
    Human[Human review panel] -->|accept with revision check| P
    P --> N
    Human -->|separate execution approval| Q[Execution queue]
    Q -->|visible cells only| K[Pyodide worker]
    N -->|bounded permitted content leaves browser| Agent
    K --> O[Notebook output and execution records]
    O --> R[Experiments audit reports]
```

## ADR 001: Browser runtime

Use JupyterLite/Pyodide with a prebuilt JupyterLab extension. This preserves a real notebook UI without a production Python server. Limitations: browser memory, available WebAssembly packages, browser storage eviction, and no Colab GPU. A local HTTP server serves assets only. Internet is needed for uncached runtime assets; do not claim offline support until assets are vendored and tested.

## ADR 002: Keep protocol out of domain logic

Notebook operations, policy, proposals and execution records do not import host APIs. The WebMCP adapter validates input and translates results. Human-control and data modules depend on domain interfaces; registration composes their handlers after initialization. CAPABILITY_MAP.md arrows describe delivery order, not TypeScript import requirements. This avoids a WebMCP ↔ permissions dependency cycle.

## ADR 003: Human actions own authority

The host may request a proposal or run but cannot grant permissions or approve either. Policies live outside imported notebook metadata. Revalidate scope, cell existence and source hashes immediately before applying or executing. Approval is single-use and scoped to exact content. Restart/close invalidates pending work. Tool guards do not sandbox Python: visible approved code can access its runtime; scanning only warns about risk.

## ADR 004: Evidence and data lifecycle

Profiles identify original dataset bytes; experiments identify dataset, split, code and versions. Store run records in browser storage under versioned keys, without raw rows by default. Handle quota errors without claiming persistence succeeded. Provide user-visible deletion/export. Clearing site data removes these records. Reports are explicit local downloads and never automatically uploaded.

## ADR 005: Host compatibility is an integration gate

The [WebMCP draft](https://webmachinelearning.github.io/webmcp/) inspected on 2026-10-23 exposes document.modelContext. The [upstream project](https://github.com/alliecatowo/jupyterlite-web-mcp) is a reference, not proof our host works. Verify the actual browser's API shape and cancellation/result semantics in W1. Do not silently substitute a shim or promise support across browsers. Protocol fixtures must record the draft and host version used.

## Failure paths

Malformed/oversize input fails before lookup or parsing. Hidden and unknown objects share NOT_FOUND responses. Stale approvals cancel without mutation. Execution timeout interrupts only the owned queue, records failure and preserves visible output. Storage failures remain visible. Unsupported API disables tools without disabling the notebook. Output limits return explicit truncation or reject an indivisible result; they never silently remove warnings.
