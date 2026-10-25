import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportPanel } from "../src/ui/reports";

const base = {
  runs: [],
  selected: [],
  format: "html" as const,
  pending: false,
  error: null,
  reports: [],
  onSelect: () => undefined,
  onFormat: () => undefined,
  onPrepare: () => undefined,
  onDownload: () => undefined,
  onRemove: () => undefined,
};

test("shows report scope, empty state and human download controls", () => {
  const empty = renderToStaticMarkup(<ReportPanel {...base} />);
  expect(empty).toContain("Raw dataset rows are excluded");
  expect(empty).toContain("No saved experiments to include");
  expect(empty).toContain("No reports prepared");
  const prepared = renderToStaticMarkup(
    <ReportPanel
      {...base}
      reports={[
        {
          exportId: "e",
          notebookId: "n",
          fileName: "report.html",
          format: "html",
          bytes: 42,
          content: "safe",
        },
      ]}
    />,
  );
  expect(prepared).toContain("Download report");
  expect(prepared).toContain("Remove report");
  expect(prepared).not.toContain("safe");
});

test("shows pending and error states", () => {
  const markup = renderToStaticMarkup(
    <ReportPanel {...base} pending error="Report failed." />,
  );
  expect(markup).toContain("Preparing…");
  expect(markup).toContain('role="alert"');
  expect(markup).toContain("Report failed.");
});
