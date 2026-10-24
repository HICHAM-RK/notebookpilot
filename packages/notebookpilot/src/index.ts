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
import { DatasetStore, type DatasetStorage } from "./data/store";
import {
  createDatasetListTool,
  createDatasetProfileTool,
} from "./webmcp/data-tools";
import {
  ExperimentStore,
  type ExperimentPersistence,
} from "./experiments/store";
import { ExperimentRecorder, ExperimentRegistry } from "./experiments/record";
import { createExperimentTools } from "./webmcp/experiment-tools";

const plugin: JupyterFrontEndPlugin<void> = {
  id: "@notebookpilot/extension:workspace",
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app, notebooks: INotebookTracker) => {
    const policies = new PolicyStore();
    const datasetStorage: DatasetStorage = {
      save: async (fileName, bytes) => {
        const content = new TextDecoder("utf-8", {
          fatal: true,
          ignoreBOM: true,
        }).decode(bytes);
        await app.serviceManager.contents.save(fileName, {
          type: "file",
          format: "text",
          mimetype: "text/csv",
          content,
        });
      },
      remove: (fileName) => app.serviceManager.contents.delete(fileName),
    };
    const datasets = new DatasetStore(datasetStorage);
    const experimentPersistence: ExperimentPersistence = {
      read: () => window.localStorage.getItem("notebookpilot.experiments.v1"),
      write: (value) =>
        window.localStorage.setItem("notebookpilot.experiments.v1", value),
    };
    let experiments: ExperimentStore;
    try {
      experiments = new ExperimentStore(experimentPersistence);
    } catch {
      experiments = new ExperimentStore({
        read: () => null,
        write: (value) => experimentPersistence.write(value),
      });
      experiments.storageError = "INVALID_STORAGE";
    }
    const experimentRegistry = new ExperimentRegistry();
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
        void datasets.clearNotebook(notebook.id);
        experimentRegistry.forgetNotebook(notebook.id);
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
    const notebookKey = (notebookId: string) => {
      const notebook = notebooks.find(
        (candidate) => candidate.id === notebookId && !candidate.isDisposed,
      );
      return notebook?.context.path ?? null;
    };
    const experimentRecorder = new ExperimentRecorder(
      executions,
      experimentRegistry,
      experiments,
      notebookKey,
      (notebookId, datasetHash) => datasets.hasHash(notebookId, datasetHash),
    );
    const panel = new WorkspacePanel(
      notebooks,
      policies,
      reader,
      proposals,
      executions,
      datasets,
      experimentRegistry,
      experimentRecorder,
      experiments,
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
        createDatasetListTool(datasets, policies),
        createDatasetProfileTool(datasets, policies),
        ...createExperimentTools(
          experimentRecorder,
          experiments,
          policies,
          () => {
            const notebook = notebooks.currentWidget;
            return notebook && !notebook.isDisposed
              ? { notebookId: notebook.id, notebookKey: notebook.context.path }
              : null;
          },
        ),
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
