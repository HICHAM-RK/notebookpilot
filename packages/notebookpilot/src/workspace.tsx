import { ReactWidget } from "@jupyterlab/apputils";
import type { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";
import React from "react";
import { WorkspaceContent } from "./view";
import { PolicyStore } from "./control/policy";
import {
  NotebookError,
  NotebookReader,
  type CellsPage,
} from "./notebook/reader";
import { AccessControls } from "./ui/access";
import type { RegistrationStatus } from "./webmcp/register";
import { UpdateProposals } from "./control/proposals";
import { ProposalReview } from "./ui/review";

export class WorkspacePanel extends ReactWidget {
  private active: NotebookPanel | null = null;
  private result: CellsPage | null = null;
  private pending = false;
  private error: string | null = null;
  private request = 0;
  private connection: RegistrationStatus | "connecting" = "connecting";
  private unsubscribe: () => void;
  private expiryTimer: ReturnType<typeof setInterval>;

  setConnectionStatus(status: RegistrationStatus): void {
    this.connection = status;
    this.update();
  }

  constructor(
    private readonly notebooks: INotebookTracker,
    private readonly policies: PolicyStore,
    private readonly reader: NotebookReader,
    private readonly proposals: UpdateProposals,
  ) {
    super();
    this.id = "notebookpilot-workspace";
    this.title.label = "NotebookPilot";
    this.title.caption = "NotebookPilot";
    this.addClass("np-workspace");
    this.notebooks.currentChanged.connect(this.selectNotebook, this);
    this.selectNotebook();
    this.unsubscribe = proposals.subscribe(() => this.update());
    this.expiryTimer = setInterval(() => this.update(), 1000);
  }

  private refresh(): void {
    if (this.active) this.proposals.list(this.active.id);
    this.request++;
    this.result = null;
    this.pending = false;
    this.error = null;
    this.update();
  }

  private selectNotebook(): void {
    this.active?.content.model?.contentChanged.disconnect(this.refresh, this);
    this.active?.title.changed.disconnect(this.refresh, this);
    this.active = this.notebooks.currentWidget;
    this.active?.content.model?.contentChanged.connect(this.refresh, this);
    this.active?.title.changed.connect(this.refresh, this);
    this.refresh();
  }

  private async preview(offset = 0): Promise<void> {
    const notebook = this.active;
    if (!notebook) return;
    const request = ++this.request;
    this.pending = true;
    this.result = null;
    this.error = null;
    this.update();
    try {
      const result = await this.reader.getCells(notebook.id, offset);
      if (request === this.request) this.result = result;
    } catch (error) {
      if (request === this.request) {
        this.error =
          error instanceof NotebookError && error.code === "NOT_FOUND"
            ? "Notebook is unavailable for agent access."
            : "The notebook changed or could not be read. Try previewing again.";
      }
    } finally {
      if (request === this.request) {
        this.pending = false;
        this.update();
      }
    }
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.notebooks.currentChanged.disconnect(this.selectNotebook, this);
    this.active?.content.model?.contentChanged.disconnect(this.refresh, this);
    this.active?.title.changed.disconnect(this.refresh, this);
    this.request++;
    this.unsubscribe();
    clearInterval(this.expiryTimer);
    super.dispose();
  }

  protected render(): React.ReactElement {
    const notebook = this.active;
    const cells = notebook?.content.model
      ? Array.from(notebook.content.model.cells)
      : [];
    return (
      <WorkspaceContent
        notebookName={notebook?.title.label ?? null}
        connection={this.connection}
      >
        {notebook && (
          <AccessControls
            notebookMode={this.policies.notebookMode(notebook.id)}
            cells={cells.map((cell) => ({
              id: cell.id,
              type: cell.type,
              mode: this.policies.cellMode(notebook.id, cell.id),
            }))}
            pending={this.pending}
            result={this.result}
            error={this.error}
            onNotebook={(value) => {
              this.policies.setNotebook(notebook.id, value);
              this.refresh();
            }}
            onCell={(id, value) => {
              this.policies.setCell(notebook.id, id, value);
              this.refresh();
            }}
            onPreview={(offset) => {
              void this.preview(offset);
            }}
          />
        )}
        {notebook && (
          <ProposalReview
            proposals={this.proposals.list(notebook.id)}
            onAccept={(id) => {
              this.proposals.accept(id);
            }}
            onReject={(id) => {
              this.proposals.reject(id);
            }}
          />
        )}
      </WorkspaceContent>
    );
  }
}
