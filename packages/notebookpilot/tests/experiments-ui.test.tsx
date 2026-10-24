import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DatasetSummary } from "../src/data/store";
import { ExperimentPanel } from "../src/ui/experiments";

const dataset: DatasetSummary = {
  datasetId: "dataset_1",
  displayName: "labelled.csv",
  fileName: "notebookpilot-1.csv",
  sha256: "a".repeat(64),
  rowCount: 24,
  columns: [
    { name: "age", type: "integer", missingCount: 0 },
    { name: "target", type: "string", missingCount: 0 },
  ],
  duplicateRowCount: 0,
  warnings: [],
  shareSamples: false,
};

test("requires explicit dataset, target and features", () => {
  const markup = renderToStaticMarkup(
    <ExperimentPanel
      datasets={[dataset]}
      error={null}
      status={null}
      onCreate={() => {}}
    />,
  );
  expect(markup).toContain("Choose the target and features yourself.");
  expect(markup).toContain("Choose a dataset");
  expect(markup).toContain("Choose the target");
  expect(markup).toContain("Logistic regression");
  expect(markup).toContain("Random forest");
  expect(markup).toContain("Create training proposal");
  expect(markup).toMatch(/<button[^>]*disabled/);
});

test("renders dataset names and errors as inert text", () => {
  const markup = renderToStaticMarkup(
    <ExperimentPanel
      datasets={[{ ...dataset, displayName: "<script>x</script>.csv" }]}
      error="Training proposal could not be created."
      status={null}
      onCreate={() => {}}
    />,
  );
  expect(markup).toContain("&lt;script&gt;x&lt;/script&gt;.csv");
  expect(markup).not.toContain("<script>");
  expect(markup).toContain('role="alert"');
});
