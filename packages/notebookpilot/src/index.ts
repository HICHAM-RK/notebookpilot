import type { JupyterFrontEndPlugin } from "@jupyterlab/application";
import { INotebookTracker } from "@jupyterlab/notebook";
import { WorkspacePanel } from "./workspace";
import { PolicyStore } from "./control/policy";
import { NotebookReader } from "./notebook/reader";
import { readLiveNotebook } from "./notebook/adapter";

const plugin: JupyterFrontEndPlugin<void> = {
  id: "@notebookpilot/extension:workspace",
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app, notebooks: INotebookTracker) => {
    const policies = new PolicyStore();
    const reader = new NotebookReader(
      (id) => readLiveNotebook(notebooks, id, policies),
      policies,
    );
    notebooks.widgetAdded.connect((_, notebook) => {
      notebook.disposed.connect(() => policies.forget(notebook.id));
    });
    const panel = new WorkspacePanel(notebooks, policies, reader);
    app.shell.add(panel, "left", { rank: 600 });
  },
};

export default plugin;
