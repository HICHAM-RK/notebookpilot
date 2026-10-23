# Specification: Agent reliability and release evidence

Status: implementation contract; not implemented. Module: evaluation.

## Dependencies
webmcp-surface, reporting.

## Behavior and boundaries
Maintain fixed cases for read, profile, stale edit, denial, run and export. Record model/host version, prompt, expected tools and actual calls, argument validity, task success, latency and available usage. Repeat each case three times. Deterministic assertions decide tool correctness; optional model judging is separate. No invented cost estimates.

## Acceptance criteria
1. Malformed args, unauthorized execution and hidden-data access have zero successful violations
2. task success computed from actual evidence
3. native vs shim runs labelled
4. failures remain in report.

## Files and interfaces
Planned extension-relative files: eval/cases.json, eval/run.ts, eval/report.ts, tests/evaluation.test.ts. Tool interfaces are defined in docs/TOOL_CONTRACTS.md. Keep domain logic independent of the WebMCP adapter.

## Verification
Write failing behavioral tests for each acceptance criterion, then implement. Use npm test for unit contracts, npm run typecheck and npm run lint:check; add relevant npm run test:e2e cases. Native browser-agent compatibility must be recorded independently of mocked protocol tests.

## Completion evidence
Record commands, results, commit and screenshots where relevant in docs/VERIFICATION.md. Update tasks/todo.md only after the corresponding criterion is demonstrated.

