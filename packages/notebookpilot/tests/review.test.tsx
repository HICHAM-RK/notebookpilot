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
    />,
  );
  expect(markup).toContain("Accept edit");
  expect(markup).toContain("Reject edit");
  expect(markup).toContain("does not run Python");
  expect(markup).not.toContain("<script>");
  expect(markup).toContain("&lt;script&gt;");
});
