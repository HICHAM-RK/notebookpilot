import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceContent } from "../src/view";

test("registration status does not claim an agent is connected", () => {
  const markup = renderToStaticMarkup(
    <WorkspaceContent notebookName={null} connection="available" />,
  );
  expect(markup).toContain(
    "Notebook read and edit-proposal tools are registered with this browser.",
  );
  expect(markup).toContain(
    "Tool registration does not mean an agent is connected.",
  );
  const failed = renderToStaticMarkup(
    <WorkspaceContent notebookName={null} connection="failed" />,
  );
  expect(failed).toContain("Browser tool registration failed.");
});

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
