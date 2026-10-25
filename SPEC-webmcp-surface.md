# Specification: Browser tool adapter

Status: implemented through W2; the full native journey remains W3. Module: webmcp-surface.

## Dependencies
notebook-core.

## Behavior and boundaries
Register tools once at activation only when document.modelContext exists. Registrations with the same host API and contract share reference-counted ownership, so duplicate extension activation does not duplicate native tools and one owner's teardown cannot remove another owner's tools. Read current workspace at invocation. Validate unknown properties, bounds and enums at runtime. Catch errors into documented envelopes. Dispose registration on extension teardown. No polyfill is presented as native support.

## Acceptance criteria
1. Missing API leaves notebook functional
2. duplicate activation does not duplicate tools
3. malformed and oversized requests fail
4. native host lists and invokes tools.

## Files and interfaces
Extension-relative files: src/webmcp/register.ts and the domain-specific tool adapters under src/webmcp/, with registration coverage in tests/registration.test.ts and routing coverage in the corresponding tool tests. Tool interfaces are defined in docs/TOOL_CONTRACTS.md and contracts/tools.json. Domain logic remains independent of the WebMCP adapter.

## Verification
Behavioral registration tests cover missing APIs, duplicate activation, conflicting contracts, partial failure and teardown. Use npm test for unit contracts, npm run typecheck and npm run lint:check; add relevant npm run test:e2e cases. Native browser-agent compatibility is recorded independently of mocked protocol tests in docs/HOST_VERIFICATION.md.

## Completion evidence
Record commands, results, commit and screenshots where relevant in docs/VERIFICATION.md. Update tasks/todo.md only after the corresponding criterion is demonstrated.

