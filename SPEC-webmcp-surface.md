# Specification: Browser tool adapter

Status: implementation contract; not implemented. Module: webmcp-surface.

## Dependencies
notebook-core.

## Behavior and boundaries
Register tools once at activation only when document.modelContext exists. Read current workspace at invocation. Validate unknown properties, bounds and enums at runtime. Catch errors into documented envelopes. Dispose registration on extension teardown. No polyfill is presented as native support.

## Acceptance criteria
1. Missing API leaves notebook functional
2. duplicate activation does not duplicate tools
3. malformed and oversized requests fail
4. native host lists and invokes tools.

## Files and interfaces
Planned extension-relative files: src/webmcp/register.ts, src/webmcp/tools.ts, src/webmcp/validation.ts, tests/webmcp.test.ts. Tool interfaces are defined in docs/TOOL_CONTRACTS.md. Keep domain logic independent of the WebMCP adapter.

## Verification
Write failing behavioral tests for each acceptance criterion, then implement. Use npm test for unit contracts, npm run typecheck and npm run lint:check; add relevant npm run test:e2e cases. Native browser-agent compatibility must be recorded independently of mocked protocol tests.

## Completion evidence
Record commands, results, commit and screenshots where relevant in docs/VERIFICATION.md. Update tasks/todo.md only after the corresponding criterion is demonstrated.

