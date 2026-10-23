import { ReactWidget } from "@jupyterlab/apputils";
import type { INotebookTracker } from "@jupyterlab/notebook";
import React from "react";
import { WorkspaceContent } from "./view";

export class WorkspacePanel extends ReactWidget {
  constructor(private readonly notebooks: INotebookTracker) {
    super();
    this.id = "notebookpilot-workspace";
    this.title.label = "NotebookPilot";
    this.title.caption = "NotebookPilot";
    this.addClass("np-workspace");
    this.notebooks.currentChanged.connect(this.refresh, this);
  }

  private refresh(): void {
    this.update();
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.notebooks.currentChanged.disconnect(this.refresh, this);
    super.dispose();
  }

  protected render(): React.ReactElement {
    const notebook = this.notebooks.currentWidget;
    return <WorkspaceContent notebookName={notebook?.title.label ?? null} />;
  }
}
