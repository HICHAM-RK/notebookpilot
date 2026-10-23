# Specification: Live notebook operations

Status: implementation contract; not implemented. Module: notebook-core.

## Dependencies
foundation.

## Behavior and boundaries
Resolve open NotebookPanel through Jupyter APIs; never read saved bytes in place of live cells. Use stable cell IDs and SHA-256 of UTF-8 source as revision tokens. Read-only snapshots return at most 20 cells by default, 100 maximum. Mutation proposals preserve their original revision and never overwrite concurrent edits.

## Acceptance criteria
1. Unsaved edit appears in read response
2. accepted unchanged revision applies once
3. stale/deleted targets fail without changes
4. imported nbformat 4 notebooks preserve unknown metadata.

## Files and interfaces
Planned extension-relative files: src/notebook/adapter.ts, src/notebook/revisions.ts, tests/notebook.test.ts. Tool interfaces are defined in docs/TOOL_CONTRACTS.md. Keep domain logic independent of the WebMCP adapter.

## Verification
Write failing behavioral tests for each acceptance criterion, then implement. Use npm test for unit contracts, npm run typecheck and npm run lint:check; add relevant npm run test:e2e cases. Native browser-agent compatibility must be recorded independently of mocked protocol tests.

## Completion evidence
Record commands, results, commit and screenshots where relevant in docs/VERIFICATION.md. Update tasks/todo.md only after the corresponding criterion is demonstrated.

