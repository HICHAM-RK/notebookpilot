# Specification: CSV profiling and notebook portability

Status: D1–D3 implemented. Module: dataset-intelligence.

## Dependencies

webmcp-surface.

## Behavior and boundaries

Accept UTF-8 CSV up to 10 MiB, 100,000 rows and 1,024 columns, rejecting a breached bound as soon as it is known. The column ceiling prevents delimiter-heavy inputs from exhausting browser memory and is above what can fit the 50 KiB profile-result cap. Validate quoted delimiters, headers and ragged rows. A read-only dataset list exposes notebook-scoped opaque IDs and bounded metadata so agents can discover human uploads; it never includes raw rows. Profiles contain counts/types and missing/duplicate summaries; raw examples require explicit sharing. Dataset identity is SHA-256 of original bytes. Imports accept nbformat 4 .ipynb up to 20 MiB; never execute on import. Active HTML, SVG and JavaScript output MIME types are removed before the notebook model receives imported data. Colab GPU, shell, Drive mount and google.colab calls receive compatibility warnings.

## Deterministic profile rules

Use comma delimiter, optional UTF-8 BOM, CRLF/LF, doubled-quote escaping; do not guess encodings. Reject empty/duplicate headers and ragged records with line-number errors. Whitespace-only fields are missing; literal NA/null strings remain strings. Blank physical lines outside quoted fields are ignored. Duplicate count is rows minus distinct parsed field tuples (preserve whitespace for identity). Type inference excludes missing fields: all true/false → boolean; all finite base-10 integers → integer; all finite decimal/exponent numbers → number; otherwise string; no present values → empty. Preserve leading-zero identifiers as strings.

For numeric columns with at least four values, flag values outside Q1−1.5×IQR to Q3+1.5×IQR using linear-interpolated quartiles; this is a warning, not deletion. For user-selected categorical target, warn if smallest/largest class count <0.1; show counts only when sharing permits. Target selection is a human UI action recorded with the dataset. Exact duplicate target columns and identifier-like features receive possible-leakage warnings, never claims of proven leakage. Formula-like text is inert data. Large column counts producing a >50KiB profile fail with LIMIT_EXCEEDED.

## Acceptance criteria

1. Fixtures cover commas/newlines in quoted fields, duplicate headers, empty data, Unicode and formula-like text
2. exact counts verified
3. Colab unknown metadata round-trips
4. no imported HTML executes.

## Files and interfaces

Planned extension-relative files: src/data/profile.ts, src/data/import.ts, tests/data.test.ts, content/fixtures/colab.ipynb, e2e/import.spec.ts. Tool interfaces are defined in docs/TOOL_CONTRACTS.md. Keep domain logic independent of the WebMCP adapter.

## Verification

Write failing behavioral tests for each acceptance criterion, then implement. Use npm test for unit contracts, npm run typecheck and npm run lint:check; add relevant npm run test:e2e cases. Native browser-agent compatibility must be recorded independently of mocked protocol tests.

## Completion evidence

Record commands, results, commit and screenshots where relevant in docs/VERIFICATION.md. Update tasks/todo.md only after the corresponding criterion is demonstrated.
