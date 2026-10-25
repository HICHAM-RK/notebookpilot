import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProposalReview } from "../src/ui/review";

test("review renders source as inert text with explicit human controls", () => {
  const markup = renderToStaticMarkup(
    <ProposalReview
      proposals={[
        {
          proposalId: "p",
          notebookId: "n",
          cellId: "c",
          original: "before",
          source: "<script>alert(1)</script>",
          status: "pending",
          expiresAt: 600000,
        },
      ]}
      onAccept={() => {}}
      onReject={() => {}}
      onDismiss={() => {}}
    />,
  );
  expect(markup).toContain("Accept edit");
  expect(markup).toContain("Reject edit");
  expect(markup).not.toContain("Dismiss proposal");
  expect(markup).toContain("does not run Python");
  expect(markup).not.toContain("<script>");
  expect(markup).toContain("&lt;script&gt;");
});

test("terminal review records can be dismissed", () => {
  const markup = renderToStaticMarkup(
    <ProposalReview
      proposals={[
        {
          proposalId: "p",
          notebookId: "n",
          cellId: "c",
          original: "before",
          source: "after",
          status: "denied",
          expiresAt: 600000,
        },
      ]}
      onAccept={() => {}}
      onReject={() => {}}
      onDismiss={() => {}}
    />,
  );
  expect(markup).toContain("Dismiss proposal");
  expect(markup).not.toContain("Accept edit");
});
