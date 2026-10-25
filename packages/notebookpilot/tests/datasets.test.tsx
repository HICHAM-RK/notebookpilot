import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DatasetSummary } from "../src/data/store";
import { DatasetPanel } from "../src/ui/datasets";

const dataset: DatasetSummary = {
  datasetId: "dataset_1",
  displayName: "<script>alert(1)</script>.csv",
  fileName: "notebookpilot-1.csv",
  sha256: "a".repeat(64),
  rowCount: 2,
  columns: [
    { name: "name", type: "string", missingCount: 0 },
    { name: "value", type: "integer", missingCount: 1 },
  ],
  duplicateRowCount: 0,
  warnings: [],
  shareSamples: false,
};

const handlers = {
  onUpload: (_file: File) => {},
  onCancel: () => {},
  onShareSamples: (_datasetId: string, _enabled: boolean) => {},
  onRemove: (_datasetId: string) => {},
};

test("renders an accessible empty upload state", () => {
  const markup = renderToStaticMarkup(
    <DatasetPanel
      datasets={[]}
      pendingName={null}
      error={null}
      {...handlers}
    />,
  );
  expect(markup).toContain("Upload CSV");
  expect(markup).toContain('accept=".csv,text/csv"');
  expect(markup).toContain("No datasets uploaded for this notebook.");
  expect(markup).toContain("Raw rows are private by default.");
});

test("renders hostile names as inert text and raw sharing unchecked", () => {
  const markup = renderToStaticMarkup(
    <DatasetPanel
      datasets={[dataset]}
      pendingName={null}
      error={null}
      {...handlers}
    />,
  );
  expect(markup).toContain("&lt;script&gt;alert(1)&lt;/script&gt;.csv");
  expect(markup).not.toContain("<script>");
  expect(markup).toContain("2 rows · 2 columns");
  expect(markup).toContain("Share up to 5 raw rows with the agent");
  expect(markup).not.toContain("checked");
  expect(markup).toContain("Remove dataset");
});

test("shows upload progress, cancellation and actionable errors", () => {
  const pending = renderToStaticMarkup(
    <DatasetPanel
      datasets={[]}
      pendingName="people.csv"
      error={null}
      {...handlers}
    />,
  );
  expect(pending).toContain("Uploading people.csv…");
  expect(pending).toContain("Cancel upload");
  expect(pending).toContain("disabled");

  const failed = renderToStaticMarkup(
    <DatasetPanel
      datasets={[]}
      pendingName={null}
      error="CSV rows must have the same number of columns."
      {...handlers}
    />,
  );
  expect(failed).toContain('role="alert"');
  expect(failed).toContain("CSV rows must have the same number of columns.");
});
