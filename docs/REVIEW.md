# Review and release gate

For each slice, record requirement IDs, changed files, commands/results and known limitations in the PR. Inspect the actual diff for incorrect calculations, stale writes, accidental execution, hidden-data leakage, unbounded content and inaccessible controls. Correct material findings before merging. Do not invent an independent reviewer or claim a review skill was run solely because it is listed.

Foundation CI runs lint, typecheck, Python fixture test, site build, npm dependency audit and browser smoke test. Later extension work must add behavioral TypeScript tests and source linting; do not let those sources escape existing gates. Add Python dependency audit before release. GitHub branch protection and required reviewer configuration must be checked separately; a workflow file does not enforce merge protection by itself.

Native host release check: record app/browser version, account feature availability, actual discovered tools, sample read/propose/approve/run results and denied/stale cases. Mark unavailable capabilities blocked, never simulated-success. Local browser evidence proves browser behavior only.

Before hosting: verify allowed origins/CSP and Python worker requirements, imported notebook handling, escaping, download behavior, storage/export warnings and third-party notices. Never claim a private source repository creates a private website. Retain previous build artifact for rollback and verify the rollback on a preview deployment.
