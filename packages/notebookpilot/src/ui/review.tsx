import React from "react";
import type { UpdateProposal } from "../control/proposals";

export function ProposalReview({
  proposals,
  onAccept,
  onReject,
}: {
  proposals: UpdateProposal[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}): React.ReactElement {
  return (
    <section aria-label="Review proposed edits" data-lm-suppress-shortcuts="">
      <h3>Proposed edits</h3>
      <p>Accepting changes the cell source. It does not run Python.</p>
      {proposals.length === 0 && <p>No proposed edits for this notebook.</p>}
      {proposals.map((proposal) => (
        <article
          key={proposal.proposalId}
          aria-label={`Proposal for cell ${proposal.cellId}`}
        >
          <h4>
            {proposal.insertion
              ? `New ${proposal.insertion.cellType} cell`
              : `Cell ${proposal.cellId}`}
          </h4>
          <p role="status">{proposal.status}</p>
          {proposal.status === "pending" && (
            <>
              {proposal.insertion ? (
                <p>
                  {proposal.insertion.afterCellId === null
                    ? "Insert at the beginning."
                    : `Insert after cell ${proposal.insertion.afterCellId}.`}
                </p>
              ) : (
                <>
                  <h5>Before</h5>
                  <pre className="np-preview">{proposal.original}</pre>
                </>
              )}
              <h5>
                {proposal.insertion
                  ? "Proposed new cell"
                  : "Proposed replacement"}
              </h5>
              <pre className="np-preview">{proposal.source}</pre>
              <button
                type="button"
                onClick={() => onAccept(proposal.proposalId)}
              >
                Accept edit
              </button>
              <button
                type="button"
                onClick={() => onReject(proposal.proposalId)}
              >
                Reject edit
              </button>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
