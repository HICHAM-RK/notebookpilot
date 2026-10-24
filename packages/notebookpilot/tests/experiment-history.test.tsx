import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExperimentHistory } from "../src/ui/experiment-history";
import type { ExperimentRun } from "../src/experiments/store";

const runs: ExperimentRun[] = [
  {
    runId: "run-one",
    executionId: "execution-one",
    notebookKey: "welcome.ipynb",
    createdAt: "2026-10-25T00:00:00.000Z",
    status: "succeeded",
    model: "logistic_regression",
    metrics: {
      accuracy: 0.8,
      macroPrecision: 0.8,
      macroRecall: 0.8,
      macroF1: 0.8,
      confusionMatrix: [
        [1, 0],
        [1, 1],
      ],
    },
  },
];

test("renders history actions, metrics and visible storage failure", () => {
  const markup = renderToStaticMarkup(
    <ExperimentHistory
      runs={runs}
      selected={[]}
      comparison={null}
      storageError="STORAGE_FAILED"
      onSelect={() => {}}
      onCompare={() => {}}
      onDelete={() => {}}
      onExport={() => {}}
    />,
  );
  expect(markup).toContain('role="alert"');
  expect(markup).toContain("Experiment storage is unavailable");
  expect(markup).toContain("Accuracy 0.800");
  expect(markup).toContain("Macro F1 0.800");
  expect(markup).toContain("Delete result");
  expect(markup).toContain("Export selected JSON");
  expect(markup).toMatch(/<button[^>]*disabled[^>]*>Compare selected/);
});

test("explains incompatible comparisons instead of ranking them", () => {
  const markup = renderToStaticMarkup(
    <ExperimentHistory
      runs={runs}
      selected={["run-one", "run-two"]}
      storageError={null}
      onSelect={() => {}}
      onCompare={() => {}}
      onDelete={() => {}}
      onExport={() => {}}
      comparison={{
        compatible: false,
        reasons: ["Selected features differ."],
        runs: [{ ...runs[0], rank: null }],
      }}
    />,
  );
  expect(markup).toContain("These runs cannot be ranked.");
  expect(markup).toContain("Selected features differ.");
  expect(markup).toContain("Unranked logistic_regression");
});
