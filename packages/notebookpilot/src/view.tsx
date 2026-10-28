import React from "react";
import type { RegistrationStatus } from "./webmcp/register";

export function WorkspaceContent({
  notebookName,
  children,
  connection = "unavailable",
}: {
  notebookName: string | null;
  children?: React.ReactNode;
  connection?: RegistrationStatus | "connecting";
}): React.ReactElement {
  const connectionMessage =
    connection === "available"
      ? "Notebook tools are registered with this browser."
      : connection === "connecting"
        ? "Checking browser tool support…"
        : connection === "failed"
          ? "Browser tool registration failed. Reload to try again."
          : "Agent tools are not connected.";

  return (
    <section className="np-shell" aria-label="NotebookPilot workspace">
      <header className="np-hero">
        <div className="np-brand">
          <span className="np-brand-mark" aria-hidden="true">
            N
          </span>
          <div>
            <h2>NotebookPilot</h2>
            <p className="np-subtitle">AI assistance, under your control.</p>
          </div>
        </div>

        <div className="np-overview" aria-label="Workspace overview">
          <div className="np-overview-heading">
            <span className="np-eyebrow">Active notebook</span>
            <span className="np-local-badge">Browser local</span>
          </div>
          <p className="np-notebook-name">
            {notebookName ?? "Open a notebook to get started."}
          </p>
          <p className="np-connection" role="status" aria-live="polite">
            <span
              className={`np-status-dot np-status-${connection}`}
              aria-hidden="true"
            />
            {connectionMessage}
          </p>
        </div>
      </header>

      <div className="np-control-note">
        <span className="np-control-icon" aria-hidden="true">
          ✓
        </span>
        <p>
          <strong>Human review stays in control</strong>
          <span>Edits and Python runs always need separate approval.</span>
        </p>
      </div>

      <div className="np-workspace-content">{children}</div>

      <footer className="np-agent-note">
        <h3>How agent access works</h3>
        <p>
          You can use your notebook normally. Tool registration does not mean an
          agent is connected. Proposed edits need your acceptance, and running
          code needs separate approval.
        </p>
      </footer>
    </section>
  );
}
