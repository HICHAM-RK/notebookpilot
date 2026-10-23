# Specification: Reproducible model comparisons

Status: implementation contract; not implemented. Module: experiment-lab.

## Dependencies
dataset-intelligence, human-control.

## Behavior and boundaries
Start with logistic regression and random forest using compatible scikit-learn in Pyodide. Use stratified 80/20 split with seed 42; reject insufficient class counts. Fit preprocessing on training data only. Persist run ID, dataset hash, target, selected features, split fingerprint, library versions, seed, parameters, metrics and status. Generated training code is visible and approved. Macro precision/recall/F1, accuracy and confusion matrix; zero_division=0 recorded.

## Initial experiment settings
Human selects target and features; never infer the target silently. Reject missing targets, one-class targets, fewer than two rows per class, and train/test sizes too small to contain all classes. Numeric pipeline: median imputation and standard scaling. Categorical pipeline: most-frequent imputation and OneHotEncoder(handle_unknown='ignore'); drop all-missing features with a visible warning. Fit every transformer on training rows only. LogisticRegression(max_iter=1000, random_state=42); RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=1). Record resolved parameters, target class order and any convergence warning.

Split fingerprint hashes the ordered train/test original row indices plus dataset hash, target, test fraction and seed. Comparison also requires identical feature selection and preprocessing. Repeatability tolerance is 1e-8 for scalar metrics within the same runtime/library versions; do not promise cross-version bit identity. Persist only app-owned, successfully completed execution results whose approved source hashes and dataset identity still match. Imported notebook outputs and model-supplied JSON are not trusted experiment records. User-visible storage export/deletion and quota errors are required.

## Acceptance criteria
1. Same dataset/split/seed produces repeatable metrics within tolerance
2. no fitting on test data
3. incompatible runs cannot be ranked
4. failures and cancellation persist as non-success
5. results survive reload.

## Files and interfaces
Planned extension-relative files: src/experiments/model.ts, src/experiments/store.ts, src/experiments/templates.ts, tests/experiments.test.ts. Tool interfaces are defined in docs/TOOL_CONTRACTS.md. Keep domain logic independent of the WebMCP adapter.

## Verification
Write failing behavioral tests for each acceptance criterion, then implement. Use npm test for unit contracts, npm run typecheck and npm run lint:check; add relevant npm run test:e2e cases. Native browser-agent compatibility must be recorded independently of mocked protocol tests.

## Completion evidence
Record commands, results, commit and screenshots where relevant in docs/VERIFICATION.md. Update tasks/todo.md only after the corresponding criterion is demonstrated.

