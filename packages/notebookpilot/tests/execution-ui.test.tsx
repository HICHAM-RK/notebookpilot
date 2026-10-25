import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExecutionReview } from "../src/ui/execution";
import type { ExecutionQueue } from "../src/notebook/execution";

type ReviewRequest = ReturnType<ExecutionQueue["review"]>[number];

const request = (status: ReviewRequest["status"]): ReviewRequest => ({
  requestId: "run-one",
  notebookId: "notebook-one",
  status,
  cells: [],
  approved: status !== "pending",
  sources: [{ cellId: "cell-one", source: "print(1)" }],
});

const callbacks = {
  onApprove: () => undefined,
  onCancel: () => undefined,
  onDismiss: () => undefined,
};

test("pending execution exposes approval and cancellation but not dismissal", () => {
  const markup = renderToStaticMarkup(
    <ExecutionReview {...callbacks} canRun requests={[request("pending")]} />,
  );
  expect(markup).toContain("Approve run");
  expect(markup).toContain("Cancel run");
  expect(markup).not.toContain("Dismiss run");
  expect(markup).toContain("print(1)");
});

test("terminal execution can be dismissed without exposing approval", () => {
  const markup = renderToStaticMarkup(
    <ExecutionReview {...callbacks} canRun requests={[request("cancelled")]} />,
  );
  expect(markup).toContain("Dismiss run");
  expect(markup).not.toContain("Approve run");
  expect(markup).not.toContain("Cancel run");
});
