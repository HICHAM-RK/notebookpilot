import type { AuditResult } from "../src/audit/model";
import type { ExperimentRun } from "../src/experiments/store";
import { buildReportModel } from "../src/reports/model";
import {
  ReportError,
  renderHtmlReport,
  renderMarkdownReport,
} from "../src/reports/export";

const run = (overrides: Partial<ExperimentRun> = {}): ExperimentRun => ({
  runId: "run-one",
  executionId: "execution-one",
  notebookKey: "notebook-1",
  createdAt: "2026-10-25T00:00:00.000Z",
  status: "succeeded",
  datasetHash: "a".repeat(64),
  target: "outcome",
  features: ["age", "segment"],
  model: "logistic_regression",
  splitFingerprint: "b".repeat(64),
  seed: 42,
  testFraction: 0.2,
  parameters: { max_iter: 1000, random_state: 42 },
  versions: { pandas: "3.0.2", scikitLearn: "1.8.0" },
  metrics: {
    accuracy: 0.812345,
    macroPrecision: 0.8,
    macroRecall: 0.79,
    macroF1: 0.795,
    confusionMatrix: [
      [3, 1],
      [0, 2],
    ],
  },
  ...overrides,
});

const audit: AuditResult = {
  score: 90,
  findings: [
    {
      ruleId: "absolute-path",
      cellId: "cell-one",
      sourceHash: "c".repeat(64),
      severity: "warning",
      explanation: "Literal <script>alert(1)</script> | path",
      span: { start: { line: 2, column: 3 }, end: { line: 2, column: 8 } },
      stale: false,
    },
  ],
  notEvaluated: [],
  executionCoverage: { executed: 2, total: 3 },
};

test("builds an exact report model with missing and failed runs labelled", () => {
  const failed = run({
    runId: "run-failed",
    executionId: "execution-failed",
    status: "failed",
    errorCode: "EXECUTION_FAILED",
    datasetHash: undefined,
    target: undefined,
    features: undefined,
    model: undefined,
    splitFingerprint: undefined,
    seed: undefined,
    testFraction: undefined,
    parameters: undefined,
    versions: undefined,
    metrics: undefined,
  });
  const model = buildReportModel({
    notebookId: "notebook-1",
    generatedAt: "2026-10-25T01:00:00.000Z",
    requestedRunIds: ["run-one", "run-failed", "run-missing"],
    runs: [run(), failed],
    audit,
  });
  expect(model.scope).toEqual({
    notebookId: "notebook-1",
    visibleCellsOnly: true,
    rawRowsIncluded: false,
  });
  expect(model.runs[0]).toMatchObject({
    status: "succeeded",
    datasetHash: "a".repeat(64),
    seed: 42,
    testFraction: 0.2,
    metrics: { accuracy: 0.812345, macroF1: 0.795 },
  });
  expect(model.runs[1]).toMatchObject({
    status: "failed",
    errorCode: "EXECUTION_FAILED",
  });
  expect(model.runs[2]).toEqual({ runId: "run-missing", status: "missing" });
  expect(model.warnings).toEqual(
    expect.arrayContaining([
      "Run run-failed failed (EXECUTION_FAILED).",
      "Run run-missing is missing.",
    ]),
  );
});

test("HTML is standalone, has no scripts or external requests, and escapes hostile data", () => {
  const notebookId = "<img src=x onerror=alert(1)>";
  const model = buildReportModel({
    notebookId,
    generatedAt: "2026-10-25T01:00:00.000Z",
    requestedRunIds: ["run-one"],
    runs: [
      run({ notebookKey: notebookId, target: "<script>alert(1)</script>" }),
    ],
    audit,
  });
  const html = renderHtmlReport(model);
  expect(html).toContain("<!doctype html>");
  expect(html).toContain("default-src &#39;none&#39;");
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(html).not.toMatch(/<script[\s>]/i);
  expect(html).not.toMatch(/<(?:img|link|iframe|object|embed)[\s>]/i);
  expect(html).not.toMatch(/https?:\/\//i);
  expect(html).not.toContain("<img src=x");
});

test("Markdown escapes delimiters while preserving exact metric values", () => {
  const notebookId = "report | **owned** [link](https://bad.invalid)";
  const model = buildReportModel({
    notebookId,
    generatedAt: "2026-10-25T01:00:00.000Z",
    requestedRunIds: ["run-one"],
    runs: [
      run({
        notebookKey: notebookId,
        target: "target|name",
        features: ["[age]", "*segment*"],
      }),
    ],
    audit,
  });
  const markdown = renderMarkdownReport(model);
  expect(markdown).toContain("report \\| \\*\\*owned\\*\\*");
  expect(markdown).toContain("target\\|name");
  expect(markdown).toContain("\\[age\\]");
  expect(markdown).toContain("Accuracy: 0.812345");
  expect(markdown).not.toContain("[link](https://bad.invalid)");
});

test("rejects invalid model inputs and reports above five MiB", () => {
  expect(() =>
    buildReportModel({
      notebookId: "notebook-1",
      generatedAt: "not-a-date",
      requestedRunIds: [],
      runs: [],
      audit,
    }),
  ).toThrow("INVALID_ARGUMENT");
  const huge = buildReportModel({
    notebookId: "notebook-1",
    generatedAt: "2026-10-25T01:00:00.000Z",
    requestedRunIds: ["run-one"],
    runs: [
      run({
        parameters: { note: "x".repeat(5 * 1024 * 1024) },
      }),
    ],
    audit,
  });
  expect(() => renderHtmlReport(huge)).toThrow(
    new ReportError("LIMIT_EXCEEDED"),
  );
});
