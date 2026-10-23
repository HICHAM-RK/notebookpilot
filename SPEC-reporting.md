# Specification: Portable analysis reports

Status: implementation contract; not implemented. Module: reporting.

## Dependencies
experiment-lab, notebook-audit.

## Behavior and boundaries
Export Markdown and static HTML with escaped data and no scripts or external requests. Include dataset fingerprint, scope, warnings, run parameters/versions, split/seed and comparable metrics. Export explicitly requested data only; raw rows excluded by default. Cap report at 5 MiB; reject oversized export with explanation.

## Acceptance criteria
1. Injected HTML rendered as text
2. Markdown delimiters safely escaped
3. all metrics match stored runs
4. missing/failed runs labelled
5. exported report usable without app.

## Files and interfaces
Planned extension-relative files: src/reports/export.ts, src/reports/model.ts, tests/reports.test.ts, e2e/report.spec.ts. Tool interfaces are defined in docs/TOOL_CONTRACTS.md. Keep domain logic independent of the WebMCP adapter.

## Verification
Write failing behavioral tests for each acceptance criterion, then implement. Use npm test for unit contracts, npm run typecheck and npm run lint:check; add relevant npm run test:e2e cases. Native browser-agent compatibility must be recorded independently of mocked protocol tests.

## Completion evidence
Record commands, results, commit and screenshots where relevant in docs/VERIFICATION.md. Update tasks/todo.md only after the corresponding criterion is demonstrated.

