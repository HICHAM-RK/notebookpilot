import React from "react";

export function WorkspaceContent({
  notebookName,
}: {
  notebookName: string | null;
}): React.ReactElement {
  return (
    <section aria-label="NotebookPilot workspace">
      <h2>NotebookPilot</h2>
      <p className="np-subtitle">Your notebook, with you in control.</p>
      <div role="status" aria-live="polite">
        <h3>Current notebook</h3>
        <p>{notebookName ?? "Open a notebook to get started."}</p>
      </div>
      <h3>Agent connection</h3>
      <p>Agent tools are not connected.</p>
      <p>
        You can use your notebook normally while this connection is being built.
      </p>
    </section>
  );
}
