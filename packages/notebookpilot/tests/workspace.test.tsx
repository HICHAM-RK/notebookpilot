import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceContent } from "../src/view";

test("shows the selected notebook without promising an agent connection", () => {
  const empty = renderToStaticMarkup(<WorkspaceContent notebookName={null} />);
  expect(empty).toContain("Open a notebook to get started.");
  const selected = renderToStaticMarkup(
    <WorkspaceContent notebookName="analysis.ipynb" />,
  );
  expect(selected).toContain("analysis.ipynb");
  expect(selected).not.toContain("Open a notebook to get started.");
  expect(selected).toContain("Agent tools are not connected.");
});
