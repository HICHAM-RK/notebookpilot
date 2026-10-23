# Specification: Evidence-based notebook review

Status: implementation contract; not implemented. Module: notebook-audit.

## Dependencies
notebook-core, dataset-intelligence.

## Behavior and boundaries
Rules identify missing seed, inconsistent execution order, hard-coded absolute paths, shell/network calls and possible leakage. Return rule ID, cell ID, source hash, severity, explanation and evidence span. Heuristic findings never claim proof. Score = 100 minus fixed documented rule penalties clamped at zero; unknown checks show not evaluated.

## Version 1 rules and penalties
Apply each rule's penalty at most once per notebook: missing random_state/seed in recognized stochastic training or split calls (15); non-monotonic or duplicate execution counts in visible executed cells (15); literal absolute filesystem paths (10); shell/magic subprocess or recognized network calls (20); preprocessing fit on the full dataset before a recognized split (20); no nonempty markdown explanation (10); recognized training with no captured package/runtime versions (10). Rule IDs: seed, execution-order, absolute-path, external-effects, possible-leakage, documentation, versions. Findings preserve all relevant evidence even though penalties do not multiply.

Score is null if there are no visible code cells or the analyzer cannot evaluate any rule. Unexecuted cells are not an execution-order violation; report execution coverage separately. Unknown dynamic calls/syntax yield notEvaluated entries, not a safety verdict. Score is a reproducibility heuristic, never a security rating. Each finding records source hash and one-based line/column span. Re-read hashes before navigating/exporting a finding and label changed findings stale.

## Acceptance criteria
1. Each rule has positive and negative fixtures
2. hidden cells never leak
3. changed cells mark findings stale
4. unsupported syntax is not reported as safe.

## Files and interfaces
Planned extension-relative files: src/audit/rules.ts, src/audit/model.ts, tests/audit.test.ts. Tool interfaces are defined in docs/TOOL_CONTRACTS.md. Keep domain logic independent of the WebMCP adapter.

## Verification
Write failing behavioral tests for each acceptance criterion, then implement. Use npm test for unit contracts, npm run typecheck and npm run lint:check; add relevant npm run test:e2e cases. Native browser-agent compatibility must be recorded independently of mocked protocol tests.

## Completion evidence
Record commands, results, commit and screenshots where relevant in docs/VERIFICATION.md. Update tasks/todo.md only after the corresponding criterion is demonstrated.

