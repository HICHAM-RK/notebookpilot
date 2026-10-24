import type { JupyterFrontEndPlugin } from "@jupyterlab/application";
import { CodeCell } from "@jupyterlab/cells";
import { pythonPlugin } from "./runtime/plugin";
import { ExecutionQueue } from "./notebook/execution";
import { createExecutionAdapter } from "./notebook/execution-adapter";
import { createExecutionTools } from "./webmcp/execution-tools";
import { INotebookTracker, type NotebookPanel } from "@jupyterlab/notebook";
import { WorkspacePanel } from "./workspace";
import { PolicyStore } from "./control/policy";
import { NotebookReader } from "./notebook/reader";
import { readLiveNotebook } from "./notebook/adapter";
import { ToolRegistration } from "./webmcp/register";
import { createReadTools, type NotebookContext } from "./webmcp/read-tools";
import {
  createNotebookMutations,
  createNotebookInsertion,
} from "./notebook/mutations";
import { UpdateProposals } from "./control/proposals";
import {
  createUpdateTool,
  createProposalStatusTool,
  createInsertTool,
} from "./webmcp/proposal-tools";

const plugin: JupyterFrontEndPlugin<void> = {
  id: "@notebookpilot/extension:workspace",
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app, notebooks: INotebookTracker) => {
    const policies = new PolicyStore();
    const executions = new ExecutionQueue(
      policies,
      createExecutionAdapter(notebooks, policies, CodeCell.execute),
    );
    const reader = new NotebookReader(
      (id) => readLiveNotebook(notebooks, id, policies),
      policies,
    );
    const mutations = createNotebookMutations(notebooks, policies);
    const proposals = new UpdateProposals(
      policies,
      mutations.read,
      mutations.replace,
      Date.now,
      createNotebookInsertion(notebooks, policies),
    );
    const trackNotebook = (notebook: NotebookPanel) => {
      notebook.disposed.connect(() => {
        proposals.cancelNotebook(notebook.id);
        executions.cancelNotebook(notebook.id);
        policies.forget(notebook.id);
      });
      notebook.sessionContext.kernelChanged.connect(() => {
        proposals.cancelNotebook(notebook.id);
        executions.cancelNotebook(notebook.id);
      });
      notebook.sessionContext.statusChanged.connect((_, status) => {
        if (
          status === "restarting" ||
          status === "autorestarting" ||
          status === "dead"
        ) {
          proposals.cancelNotebook(notebook.id);
          executions.cancelNotebook(notebook.id);
        }
      });
    };
    notebooks.forEach(trackNotebook);
    notebooks.widgetAdded.connect((_, notebook) => trackNotebook(notebook));
    const panel = new WorkspacePanel(
      notebooks,
      policies,
      reader,
      proposals,
      executions,
    );
    const tools = createReadTools(reader, policies, () => {
      const notebook = notebooks.currentWidget;
      const status = notebook?.sessionContext.kernelDisplayStatus;
      const kernelStatus: NotebookContext["kernelStatus"] =
        status === "idle" ||
        status === "busy" ||
        status === "starting" ||
        status === "dead"
          ? status
          : "unknown";
      return {
        notebookId: notebook && !notebook.isDisposed ? notebook.id : null,
        activeCellId: notebook?.content.activeCell?.model.id ?? null,
        kernelStatus,
      };
    });
    const registration = new ToolRegistration(
      (document as Document & { modelContext?: unknown }).modelContext,
      [
        ...tools,
        createUpdateTool(proposals),
        createInsertTool(proposals),
        createProposalStatusTool(proposals),
        ...createExecutionTools(executions),
      ],
    );
    panel.disposed.connect(() => {
      registration.dispose();
      notebooks.forEach((notebook) => executions.cancelNotebook(notebook.id));
    });
    void registration.start().then((status) => {
      if (!panel.isDisposed) panel.setConnectionStatus(status);
    });
    app.shell.add(panel, "left", { rank: 600 });
  },
};

export default [pythonPlugin, plugin];
