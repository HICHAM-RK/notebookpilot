# Graphify architecture snapshot

Graphify was actually run on 2026-10-23 using the installed skill at `/Users/hicham/.codex/skills/graphify/skill.md`. This is an architecture and specification graph, not proof that the product features exist.

## Outputs and evidence

- `graphify-out/graph.html`: interactive browser graph; browser verification loaded all 83 nodes with zero page errors.
- `graphify-out/graph.json`: 83 nodes, 95 edges, 10 communities.
- `graphify-out/GRAPH_REPORT.md`: community labels, raw cohesion scores, confidence labels and questions.
- `graphify-out/obsidian/`: vault notes and `graph.canvas`.
- `graphify-out/extraction.json`: merged deterministic AST and agent semantic extraction, preserving source files, locations, confidence and two hyperedges.
- `graphify-out/corpus-snapshot.json`: SHA256 for the 22 input files (3 code, 19 documents; approximately 5,061 words).
- `graphify-out/engine-snapshot.json`: installed engine source hashes and dependency versions.
- `graphify-out/cost.json`: token accounting is unavailable, not zero. The extraction agent did not expose a token meter.

The corpus was copied before concurrent documentation and browser-test edits. Compare the recorded hashes before relying on a claim about current code. Planned features are labelled `(planned)`; existing implementation statements extracted from documents remain document-attributed. Generated graph files and this guide were not inputs to their own graph.

## Re-render this exact extraction

From the repository root:

```bash
uv run --no-project --python 3.12 --with graphifyy==0.9.94 --with graspologic==3.4.4 python scripts/graphify_rebuild.py --skill /Users/hicham/.codex/skills/graphify
```

This uses an isolated uv environment, without changing the application dependencies or system Python. The `--skill` directory must contain the Graphify Python modules. On another machine, install that skill and supply its actual path. Compare engine hashes when exact engine equivalence matters. The command re-renders the saved extraction; it does **not** analyze changed source. It preserves the recorded community membership so that labels remain aligned. Leiden can produce different communities on a new clustering run.

## Refresh for changed source

Follow the installed Graphify skill's full extraction workflow (or its `--update` workflow with a valid current manifest), including mandatory semantic extraction subagents for changed documents. Use a clean temporary corpus with relative paths and explicitly selected repository source files. Do not point the default detector at the entire working directory: its built-in excludes do not cover every generated directory used here.

Exclude `.git`, `.venv`, `node_modules`, `_output`, `test-results`, `playwright-report`, `coverage`, `graphify-out`, lockfiles, uploaded data, credentials and secrets. Include new source modules, tests and relevant specifications deliberately. Never ingest private datasets for an architecture graph. Record hashes before extraction. Run `graphify.detect.detect`, cache checks, deterministic AST extraction and semantic extraction; merge, cluster, label, export, benchmark, save manifest and record available token usage. Re-run the corpus size warning before extraction. The initial snapshot fits one context window; the graph's benefit here is navigation, not a need to compress a huge repository.

Check every extraction node's source against the manifest, validate edge endpoints/confidence, and inspect the generated HTML. Copy refreshed extraction, detection, snapshot and outputs together. Re-label communities after fresh clustering. The current `manifest.json` records the original temporary corpus mtimes and must not be treated as a valid incremental manifest for a different checkout; create a fresh manifest when changing corpus location. Do not install hooks or a watcher implicitly.

## Limits

The engine drops external-import edges and isolated code nodes. This run extracted 85 nodes/103 edges before that reduction; the browser-test/config TypeScript file nodes were dropped because only external imports connected them. The graph therefore does not represent all source behavior. JSON, YAML, TOML, CSV and notebook cell source were outside this detector's supported corpus; inspect those directly during implementation and review.

The HTML loads vis-network from unpkg and needs network access on first load; JSON and Obsidian notes remain available offline. The built-in benchmark estimates 6,748 corpus tokens versus 2,342 average query-context tokens (2.9× reduction). Its generic questions and word-count approximation do not measure answer correctness, latency, billed tokens or actual savings. “Surprising connections” is Graphify's report label, not a claim of novel architecture findings.
