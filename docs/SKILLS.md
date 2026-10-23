# Agent skills and portability

Read AGENTS.md's routing table, then load only skills needed for the current task. Skill names alone do not install tools. User authorization overrides generic approval gates: the user has authorized completing this build package and its testing/CI configuration.

## Graphify
Located on this workstation at `/Users/hicham/.codex/skills/graphify/skill.md` (lowercase filename). The earlier claim that it was absent was incorrect. Graphify extracts a knowledge graph; Mermaid diagrams document intended architecture and are not a replacement.

Invoke `/graphify <project-path>` after establishing the spec corpus and `/graphify <project-path> --update` after architectural changes. Follow the installed skill's detection, semantic extraction, clustering and export workflow. Preserve EXTRACTED/INFERRED/AMBIGUOUS labels and source locations. Outputs include graphify-out/graph.json, GRAPH_REPORT.md and graph.html. Do not present a graph of specifications as implemented dependencies.

Exclude .venv, node_modules, _output, .git, uploaded data, secrets and generated graph outputs from corpus scanning. Do not install hooks or background watchers by default. Use an isolated environment for dependencies, never modify system Python. If skill unavailable on another machine, report the missing capability and follow Mermaid architecture docs until it is installed.

## Required practices without installed skills
Ponytail: smallest complete implementation, no skipped acceptance criteria. Testing: failing behavioral test before nontrivial changes, then relevant browser verification. Review: inspect correctness, permissions, races, data leakage and user states; record unresolved findings. Git: small commits, codex/ branches, no forced push. Browser tools: use isolated automated Chromium; a passing shim is not proof of native WebMCP support.

## Skill routing additions
Use ci-cd-and-automation for workflows, debugging-and-error-recovery for failures, documentation-and-adrs for decisions, and graphify for codebase knowledge mapping. Existing AGENTS.md skills remain applicable. Source instructions stay external to the repository; do not silently vendor third-party skills or claim they travel with a clone.
