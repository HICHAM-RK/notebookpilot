# Specification: Review and execution approval

Status: H1 session permissions implemented; proposal/execution approval remain H2/N2. Module: human-control.

## Dependencies
notebook-core, webmcp-surface.

## Behavior and boundaries
Permission defaults are read-only. Unknown/corrupt policies deny writes. Store user-controlled policy outside imported notebook metadata. Bind approval to notebook ID, cell IDs and hashes. No tool can approve itself. Approval for editing does not authorize execution. Proposals expire after 10 minutes and are cancelled on close or target change.

H1 uses session-only maps keyed by live notebook/cell IDs, never metadata. Notebook choices are read, write (allow proposals), or hidden; a hidden notebook overrides every cell choice, and a read-only notebook prevents cell-level write grants. Unset cell policy inherits the notebook mode. Unknown values become hidden. Closing a notebook forgets grants. Sidebar selectors are human controls and are not exposed as tools. Preview content is cleared whenever source or policy changes.

## Acceptance criteria
1. Accept/reject accessible by keyboard
2. no execution before approval
3. edit after approval invalidates execution
4. close/restart cancels pending approvals
5. no hidden source in errors or logs.

## Files and interfaces
Planned extension-relative files: src/control/policy.ts, src/control/proposals.ts, src/ui/review.tsx, tests/control.test.ts, e2e/review.spec.ts. Tool interfaces are defined in docs/TOOL_CONTRACTS.md. Keep domain logic independent of the WebMCP adapter.

## Verification
Write failing behavioral tests for each acceptance criterion, then implement. Use npm test for unit contracts, npm run typecheck and npm run lint:check; add relevant npm run test:e2e cases. Native browser-agent compatibility must be recorded independently of mocked protocol tests.

## Completion evidence
Record commands, results, commit and screenshots where relevant in docs/VERIFICATION.md. Update tasks/todo.md only after the corresponding criterion is demonstrated.

