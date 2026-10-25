import React from "react";
import type { ExecutionQueue } from "../notebook/execution";

export function ExecutionReview({
  requests,
  onApprove,
  onCancel,
  onDismiss,
  canRun,
}: {
  requests: ReturnType<ExecutionQueue["review"]>;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
  canRun: boolean;
}) {
  return (
    <section aria-label="Execution approvals" data-lm-suppress-shortcuts="">
      <h3>Run requests</h3>
      <p>
        Running Python is separate from accepting edits. Review the code before
        approving.
      </p>
      <p>
        Cancellation requests a stop only when safe. If other work is present,
        Python may continue until it finishes.
      </p>
      {requests.length === 0 && <p>No run requests.</p>}
      {!canRun && <p>Waiting for an idle Python kernel before approval.</p>}
      {requests.map((request) => (
        <article
          key={request.requestId}
          aria-label={`Run ${request.requestId}`}
        >
          <p role="status">
            {request.status}
            {request.approved && request.status === "pending"
              ? " — queued"
              : ""}
            {request.errorCode ? ` (${request.errorCode})` : ""}
          </p>
          {request.status === "pending" &&
            request.sources.map((cell) => (
              <details key={cell.cellId}>
                <summary>Cell {cell.cellId}</summary>
                <pre className="np-preview">{cell.source}</pre>
              </details>
            ))}
          {request.status === "pending" && !request.approved && (
            <button
              type="button"
              disabled={!canRun}
              onClick={() => onApprove(request.requestId)}
            >
              Approve run
            </button>
          )}
          {(request.status === "pending" || request.status === "running") && (
            <button type="button" onClick={() => onCancel(request.requestId)}>
              Cancel run
            </button>
          )}
          {request.status !== "pending" && request.status !== "running" && (
            <button type="button" onClick={() => onDismiss(request.requestId)}>
              Dismiss run
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
