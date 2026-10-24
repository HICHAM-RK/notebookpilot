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
  return (
    <section aria-label="NotebookPilot workspace">
      <h2>NotebookPilot</h2>
      <p className="np-subtitle">Your notebook, with you in control.</p>
      <div role="status" aria-live="polite">
        <h3>Current notebook</h3>
        <p>{notebookName ?? "Open a notebook to get started."}</p>
      </div>
      {children}
      <h3>Agent connection</h3>
      <p role="status">
        {connection === "available"
          ? "Read-only notebook tools are registered with this browser."
          : connection === "connecting"
            ? "Checking browser tool support…"
            : connection === "failed"
              ? "Browser tool registration failed. Reload to try again."
              : "Agent tools are not connected."}
      </p>
      <p>
        You can use your notebook normally. Tool registration does not mean an
        agent is connected. Edit proposals and execution tools are still being
        built.
      </p>
    </section>
  );
}
