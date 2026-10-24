import { auditNotebook, refreshStaleness } from "../src/audit/rules";
import type { AuditCell } from "../src/audit/model";

const cell = (
  cellId: string,
  type: AuditCell["type"],
  source: string,
  executionCount: number | null = null,
): AuditCell => ({ cellId, type, source, executionCount });

test("reports every documented rule with fixed once-per-rule penalties", async () => {
  const result = await auditNotebook([
    cell("c1", "code", 'df = pd.read_csv("/Users/me/private.csv")', 2),
    cell(
      "c2",
      "code",
      "scaler.fit_transform(X)\n!curl https://example.test",
      2,
    ),
    cell(
      "c3",
      "code",
      "X_train, X_test = train_test_split(X, test_size=.2)\nmodel = RandomForestClassifier()\nmodel.fit(X_train, y_train)",
      1,
    ),
  ]);
  expect(new Set(result.findings.map((finding) => finding.ruleId))).toEqual(
    new Set([
      "seed",
      "execution-order",
      "absolute-path",
      "external-effects",
      "possible-leakage",
      "documentation",
      "versions",
    ]),
  );
  expect(result.score).toBe(0);
  expect(result.executionCoverage).toEqual({ executed: 3, total: 3 });
  for (const finding of result.findings) {
    expect(finding.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(finding.span.start.line).toBeGreaterThanOrEqual(1);
    expect(finding.span.start.column).toBeGreaterThanOrEqual(1);
    expect(finding.stale).toBe(false);
  }
});

test("does not flag documented seeded split-first versioned training", async () => {
  const result = await auditNotebook([
    cell("m1", "markdown", "## Method\nA reproducible baseline."),
    cell(
      "c1",
      "code",
      [
        "import sklearn",
        "X_train, X_test = train_test_split(X, random_state=42)",
        "scaler.fit(X_train)",
        "model = RandomForestClassifier(random_state=42)",
        "model.fit(X_train, y_train)",
        "print(sklearn.__version__)",
      ].join("\n"),
      1,
    ),
  ]);
  expect(result.findings).toEqual([]);
  expect(result.score).toBe(100);
});

test("unexecuted cells do not violate order and coverage stays explicit", async () => {
  const result = await auditNotebook([
    cell("m", "markdown", "Notes"),
    cell("c1", "code", "x = 1", null),
    cell("c2", "code", "y = 2", 1),
  ]);
  expect(
    result.findings.some((item) => item.ruleId === "execution-order"),
  ).toBe(false);
  expect(result.executionCoverage).toEqual({ executed: 1, total: 2 });
});

test("unknown dynamic execution is not reported as safe", async () => {
  const result = await auditNotebook([
    cell("m", "markdown", "Notes"),
    cell("c", "code", "runner = getattr(module, name)\nrunner(payload)"),
  ]);
  expect(result.notEvaluated).toContainEqual({
    ruleId: "external-effects",
    cellId: "c",
    reason: "Dynamic call target could not be evaluated.",
  });
});

test("changed and missing cells mark prior findings stale", async () => {
  const original = [cell("c", "code", 'open("/tmp/data.csv")')];
  const audit = await auditNotebook(original);
  expect(audit.findings).toHaveLength(2); // absolute path plus missing documentation
  const changed = await refreshStaleness(audit.findings, [
    cell("c", "code", 'open("relative.csv")'),
  ]);
  expect(changed.every((finding) => finding.stale)).toBe(true);
  const missing = await refreshStaleness(audit.findings, []);
  expect(missing.every((finding) => finding.stale)).toBe(true);
});

test("no visible code returns a null score", async () => {
  const result = await auditNotebook([cell("m", "markdown", "Only prose")]);
  expect(result).toMatchObject({
    score: null,
    findings: [],
    executionCoverage: { executed: 0, total: 0 },
  });
});
