import type { JupyterFrontEndPlugin } from "@jupyterlab/application";
import { INotebookTracker } from "@jupyterlab/notebook";
import { WorkspacePanel } from "./workspace";

const plugin: JupyterFrontEndPlugin<void> = {
  id: "@notebookpilot/extension:workspace",
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app, notebooks: INotebookTracker) => {
    const panel = new WorkspacePanel(notebooks);
    app.shell.add(panel, "left", { rank: 600 });
  },
};

export default plugin;
