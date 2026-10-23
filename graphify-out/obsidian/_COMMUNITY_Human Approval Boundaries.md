---
type: community
cohesion: 0.33
members: 6
---

# Human Approval Boundaries

**Cohesion:** 0.33 - loosely connected
**Members:** 6 nodes

## Members
- [[Human review and execution approval (planned)]] - document - SPEC-human-control.md
- [[Human review and execution approval module (planned)]] - document - CAPABILITY_MAP.md
- [[Read-only default and external permission policy (planned)]] - document - SPEC-human-control.md
- [[Separate human execution approval (planned)]] - document - SPEC-human-control.md
- [[Ten-minute proposal expiration (planned)]] - document - SPEC-human-control.md
- [[UI-only human approval boundary (planned)]] - document - docs/TOOL_CONTRACTS.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Human_Approval_Boundaries
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Tool Contracts]]
- 1 edge to [[_COMMUNITY_Notebook Foundation and Audit]]
- 1 edge to [[_COMMUNITY_Browser Integration and Release]]
- 1 edge to [[_COMMUNITY_Experiments and Reports]]

## Top bridge nodes
- [[Human review and execution approval (planned)]] - degree 8, connects to 4 communities
- [[UI-only human approval boundary (planned)]] - degree 2, connects to 1 community