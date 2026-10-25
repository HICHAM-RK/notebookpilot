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
import { ExecutionQueue } from "./notebook/execution";
import { ExecutionReview } from "./ui/execution";
import { DatasetStore, DatasetError } from "./data/store";
import { DataError } from "./data/import";
import { DatasetPanel } from "./ui/datasets";
import {
  exportNotebook,
  importNotebook,
  NotebookPortabilityError,
  type NotebookJson,
  type PortabilityWarning,
} from "./notebook/portability";
import { PortabilityPanel } from "./ui/portability";
import {
  generateTrainingCell,
  type ExperimentModel,
} from "./experiments/templates";
import { ExperimentPanel } from "./ui/experiments";
import { ExperimentRecorder, ExperimentRegistry } from "./experiments/record";
import {
  ExperimentStore,
  type ExperimentComparison,
} from "./experiments/store";
import { ExperimentHistory } from "./ui/experiment-history";
import { NotebookAuditor, AuditError } from "./audit/auditor";
import type { AuditCell, AuditFinding, AuditResult } from "./audit/model";
import { refreshStaleness } from "./audit/rules";
import { AuditPanel } from "./ui/audit";
import {
  ReportManager,
  type PreparedReport,
  type ReportFormat,
} from "./reports/manager";
import { ReportPanel } from "./ui/reports";

export class WorkspacePanel extends ReactWidget {
  private active: NotebookPanel | null = null;
  private result: CellsPage | null = null;
  private pending = false;
  private error: string | null = null;
  private request = 0;
  private connection: RegistrationStatus | "connecting" = "connecting";
  private unsubscribeProposals: () => void;
  private unsubscribeDatasets: () => void;
  private expiryTimer: ReturnType<typeof setInterval>;
  private uploadController: AbortController | null = null;
  private uploadName: string | null = null;
  private datasetError: string | null = null;
  private portabilityRequest = 0;
  private portabilityPending = false;
  private portabilityPreview: {
    name: string;
    notebook: NotebookJson;
    warnings: PortabilityWarning[];
  } | null = null;
  private portabilityWarnings: PortabilityWarning[] = [];
  private portabilityError: string | null = null;
  private portabilityStatus: string | null = null;
  private experimentError: string | null = null;
  private experimentStatus: string | null = null;
  private experimentDatasetId = "";
  private experimentTarget = "";
  private experimentFeatures: string[] = [];
  private experimentModel: ExperimentModel = "logistic_regression";
  private experimentSelection: string[] = [];
  private experimentComparison: ExperimentComparison | null = null;
  private unsubscribeExperiments: () => void;
  private auditPending = false;
  private auditResult: AuditResult | null = null;
  private auditError: string | null = null;
  private auditRequest = 0;
  private reportSelection: string[] = [];
  private reportFormat: ReportFormat = "html";
  private reportPending = false;
  private reportError: string | null = null;
  private reportRequest = 0;
  private unsubscribeReports: () => void;

  setConnectionStatus(status: RegistrationStatus): void {
    this.connection = status;
    this.update();
  }

  constructor(
    private readonly notebooks: INotebookTracker,
    private readonly policies: PolicyStore,
    private readonly reader: NotebookReader,
    private readonly proposals: UpdateProposals,
    private readonly executions: ExecutionQueue,
    private readonly datasets: DatasetStore,
    private readonly experimentRegistry: ExperimentRegistry,
    private readonly experimentRecorder: ExperimentRecorder,
    private readonly experiments: ExperimentStore,
    private readonly auditor: NotebookAuditor,
    private readonly reports: ReportManager,
  ) {
    super();
    this.id = "notebookpilot-workspace";
    this.title.label = "NotebookPilot";
    this.title.caption = "NotebookPilot";
    this.addClass("np-workspace");
    this.notebooks.currentChanged.connect(this.selectNotebook, this);
    this.selectNotebook();
    this.unsubscribeProposals = proposals.subscribe(() => this.update());
    this.unsubscribeDatasets = datasets.subscribe(() => this.update());
    this.unsubscribeExperiments = experiments.subscribe(() => this.update());
    this.unsubscribeReports = reports.subscribe(() => this.update());
    this.expiryTimer = setInterval(() => this.update(), 1000);
  }

  private refresh(): void {
    if (this.active) this.proposals.list(this.active.id);
    if (this.active) this.executions.review(this.active.id);
    this.request++;
    this.result = null;
    this.pending = false;
    this.error = null;
    void this.refreshAuditFindings();
    this.update();
  }

  private selectNotebook(): void {
    this.uploadController?.abort();
    this.uploadController = null;
    this.uploadName = null;
    this.datasetError = null;
    this.portabilityRequest++;
    this.portabilityPending = false;
    this.portabilityPreview = null;
    this.portabilityWarnings = [];
    this.portabilityError = null;
    this.portabilityStatus = null;
    this.experimentError = null;
    this.experimentStatus = null;
    this.experimentDatasetId = "";
    this.experimentTarget = "";
    this.experimentFeatures = [];
    this.experimentModel = "logistic_regression";
    this.experimentSelection = [];
    this.experimentComparison = null;
    this.auditRequest++;
    this.auditPending = false;
    this.auditResult = null;
    this.auditError = null;
    this.reportRequest++;
    this.reportSelection = [];
    this.reportFormat = "html";
    this.reportPending = false;
    this.reportError = null;
    this.active?.content.model?.contentChanged.disconnect(this.refresh, this);
    this.active?.title.changed.disconnect(this.refresh, this);
    this.active = this.notebooks.currentWidget;
    this.active?.content.model?.contentChanged.connect(this.refresh, this);
    this.active?.title.changed.connect(this.refresh, this);
    this.refresh();
  }

  private async prepareNotebookImport(file: File): Promise<void> {
    const notebook = this.active;
    if (!notebook || this.portabilityPending || this.portabilityPreview) return;
    const request = ++this.portabilityRequest;
    this.portabilityPending = true;
    this.portabilityError = null;
    this.portabilityStatus = null;
    this.update();
    try {
      if (!file.name.toLowerCase().endsWith(".ipynb")) {
        throw new NotebookPortabilityError("INVALID_NOTEBOOK");
      }
      const imported = importNotebook(new Uint8Array(await file.arrayBuffer()));
      if (request !== this.portabilityRequest || notebook !== this.active)
        return;
      this.portabilityPreview = {
        name: file.name.split(/[\\/]/).at(-1) ?? "notebook.ipynb",
        notebook: imported.notebook,
        warnings: imported.warnings,
      };
    } catch (error) {
      if (request !== this.portabilityRequest) return;
      this.portabilityError =
        error instanceof NotebookPortabilityError &&
        error.code === "LIMIT_EXCEEDED"
          ? "Notebook exceeds the 20 MiB import limit."
          : "Notebook must be a valid UTF-8 nbformat 4 .ipynb file.";
    } finally {
      if (request === this.portabilityRequest) {
        this.portabilityPending = false;
        this.update();
      }
    }
  }

  private applyNotebookImport(): void {
    const notebook = this.active;
    const preview = this.portabilityPreview;
    const model = notebook?.content.model;
    if (!notebook || !model || !preview) return;
    this.proposals.cancelNotebook(notebook.id);
    this.executions.cancelNotebook(notebook.id);
    void this.datasets.clearNotebook(notebook.id);
    model.fromString(JSON.stringify(preview.notebook));
    this.portabilityWarnings = preview.warnings;
    this.portabilityPreview = null;
    this.portabilityError = null;
    this.portabilityStatus =
      "Notebook imported without running code. Review cells before execution.";
    this.update();
  }

  private downloadNotebook(): void {
    const notebook = this.active;
    const model = notebook?.content.model;
    if (!notebook || !model) return;
    try {
      const bytes = exportNotebook(model.toJSON());
      const blob = new Blob([new TextDecoder().decode(bytes)], {
        type: "application/x-ipynb+json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stem = notebook.title.label.replace(/\.ipynb$/i, "") || "notebook";
      link.href = url;
      link.download = `${stem.slice(0, 180)}-notebookpilot.ipynb`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.portabilityError = null;
      this.portabilityStatus = "Notebook download prepared.";
    } catch (error) {
      this.portabilityError =
        error instanceof NotebookPortabilityError &&
        error.code === "LIMIT_EXCEEDED"
          ? "Notebook exceeds the 20 MiB export limit."
          : "Notebook could not be downloaded.";
    }
    this.update();
  }

  private createTrainingProposal(
    datasetId: string,
    target: string,
    features: string[],
    model: ExperimentModel,
  ): void {
    const notebook = this.active;
    if (!notebook) return;
    try {
      const dataset = this.datasets
        .list(notebook.id)
        .find((item) => item.datasetId === datasetId);
      if (!dataset) throw new Error("NOT_FOUND");
      const source = generateTrainingCell({
        datasetHash: dataset.sha256,
        fileName: dataset.fileName,
        target,
        features,
        model,
      });
      const proposal = this.proposals.proposeInsert(
        notebook.id,
        null,
        "code",
        source,
      );
      this.experimentRegistry.register(proposal, {
        datasetHash: dataset.sha256,
        fileName: dataset.fileName,
        target,
        features,
        model,
      });
      this.experimentError = null;
      this.experimentStatus =
        "Training cell proposed. Review the code below before accepting it.";
    } catch {
      this.experimentError =
        "Training proposal needs notebook write access and a valid dataset selection.";
      this.experimentStatus = null;
    }
    this.update();
  }

  private recordExperiment(executionId: string): void {
    const notebook = this.active;
    if (!notebook) return;
    try {
      this.experimentRecorder.record(notebook.id, executionId);
      this.experimentError = null;
      this.experimentStatus = "Experiment result saved in this browser.";
    } catch (error) {
      if (error instanceof Error && error.message === "UNTRUSTED_EXECUTION")
        return;
      this.experimentError =
        error instanceof Error && error.message === "STORAGE_FAILED"
          ? "Experiment finished, but browser storage could not save it."
          : "Experiment result could not be verified and saved.";
      this.experimentStatus = null;
    }
    this.update();
  }

  private downloadExperiments(): void {
    if (this.experimentSelection.length === 0) return;
    try {
      const content = this.experiments.export(this.experimentSelection);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "notebookpilot-experiments.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.experimentError = null;
      this.experimentStatus = "Experiment export prepared.";
    } catch {
      this.experimentError = "Experiment results could not be exported.";
      this.experimentStatus = null;
    }
    this.update();
  }

  private async runAudit(): Promise<void> {
    const notebook = this.active;
    if (!notebook || this.auditPending) return;
    const request = ++this.auditRequest;
    this.auditPending = true;
    this.auditError = null;
    this.update();
    try {
      const result = await this.auditor.audit(notebook.id);
      if (request === this.auditRequest && notebook === this.active)
        this.auditResult = result;
    } catch (error) {
      if (request !== this.auditRequest) return;
      this.auditError =
        error instanceof AuditError && error.code === "STALE_CELL"
          ? "Notebook changed during the audit. Run it again."
          : "Audit could not read the current visible cells.";
    } finally {
      if (request === this.auditRequest) {
        this.auditPending = false;
        this.update();
      }
    }
  }

  private async refreshAuditFindings(): Promise<void> {
    const notebook = this.active;
    const result = this.auditResult;
    if (!notebook || !result) return;
    const request = ++this.auditRequest;
    const cells = notebook.content.model
      ? Array.from(notebook.content.model.cells)
          .filter((cell) => this.policies.canRead(notebook.id, cell.id))
          .map((cell) => {
            const type: AuditCell["type"] =
              cell.type === "code" ||
              cell.type === "markdown" ||
              cell.type === "raw"
                ? cell.type
                : "raw";
            const data = cell.toJSON();
            return {
              cellId: cell.id,
              type,
              source: cell.sharedModel.getSource(),
              executionCount:
                data.cell_type === "code" &&
                typeof data.execution_count === "number"
                  ? data.execution_count
                  : null,
            };
          })
      : [];
    const findings = await refreshStaleness(result.findings, cells);
    if (request === this.auditRequest && notebook === this.active) {
      this.auditResult = { ...result, findings };
      this.update();
    }
  }

  private navigateToFinding(finding: AuditFinding): void {
    const notebook = this.active?.content;
    if (!notebook) return;
    const index = notebook.widgets.findIndex(
      (cell) => cell.model.id === finding.cellId,
    );
    if (index < 0) return;
    notebook.activeCellIndex = index;
    const cell = notebook.widgets[index];
    void notebook.scrollToCell(cell, "center").then(() => {
      notebook.activate();
      cell.node.focus();
    });
  }

  private async prepareReport(): Promise<void> {
    const notebook = this.active;
    if (!notebook || this.reportPending) return;
    const request = ++this.reportRequest;
    this.reportPending = true;
    this.reportError = null;
    this.update();
    try {
      await this.reports.prepare(
        notebook.id,
        this.reportSelection,
        this.reportFormat,
      );
    } catch {
      if (request === this.reportRequest)
        this.reportError =
          "Report could not be prepared from current evidence.";
    } finally {
      if (request === this.reportRequest) {
        this.reportPending = false;
        this.update();
      }
    }
  }

  private downloadReport(report: PreparedReport): void {
    const blob = new Blob([report.content], {
      type:
        report.format === "html"
          ? "text/html;charset=utf-8"
          : "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private async upload(file: File): Promise<void> {
    const notebook = this.active;
    if (!notebook || this.uploadController) return;
    const controller = new AbortController();
    this.uploadController = controller;
    this.uploadName = file.name;
    this.datasetError = null;
    this.update();
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (controller.signal.aborted) throw new DatasetError("CANCELLED");
      await this.datasets.upload(
        notebook.id,
        file.name,
        bytes,
        controller.signal,
      );
    } catch (error) {
      const code =
        error instanceof DatasetError || error instanceof DataError
          ? error.code
          : "INTERNAL_ERROR";
      if (code !== "CANCELLED") {
        this.datasetError =
          code === "LIMIT_EXCEEDED"
            ? "CSV exceeds a dataset or session size limit."
            : code === "INVALID_ARGUMENT"
              ? `CSV could not be read${error instanceof DataError && error.line ? ` near line ${error.line}` : ""}.`
              : "Dataset could not be stored. Try again.";
      }
    } finally {
      if (this.uploadController === controller) {
        this.uploadController = null;
        this.uploadName = null;
        this.update();
      }
    }
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
    this.portabilityRequest++;
    this.auditRequest++;
    this.reportRequest++;
    this.uploadController?.abort();
    this.unsubscribeProposals();
    this.unsubscribeDatasets();
    this.unsubscribeExperiments();
    this.unsubscribeReports();
    clearInterval(this.expiryTimer);
    super.dispose();
  }

  protected render(): React.ReactElement {
    const notebook = this.active;
    const cells = notebook?.content.model
      ? Array.from(notebook.content.model.cells)
      : [];
    const notebookKey = notebook?.context.path ?? null;
    const experimentRuns = notebookKey
      ? this.experiments.list(notebookKey)
      : [];
    return (
      <WorkspaceContent
        notebookName={notebook?.title.label ?? null}
        connection={this.connection}
      >
        {notebook && (
          <PortabilityPanel
            pending={this.portabilityPending}
            importedName={this.portabilityPreview?.name ?? null}
            cellCount={this.portabilityPreview?.notebook.cells.length ?? null}
            warnings={
              this.portabilityPreview?.warnings ?? this.portabilityWarnings
            }
            error={this.portabilityError}
            status={this.portabilityStatus}
            onChoose={(file) => {
              void this.prepareNotebookImport(file);
            }}
            onApply={() => this.applyNotebookImport()}
            onCancel={() => {
              this.portabilityRequest++;
              this.portabilityPending = false;
              this.portabilityPreview = null;
              this.portabilityError = null;
              this.update();
            }}
            onExport={() => this.downloadNotebook()}
          />
        )}
        {notebook && (
          <DatasetPanel
            datasets={this.datasets.list(notebook.id)}
            pendingName={this.uploadName}
            error={this.datasetError}
            onUpload={(file) => {
              void this.upload(file);
            }}
            onCancel={() => this.uploadController?.abort()}
            onShareSamples={(datasetId, enabled) => {
              try {
                this.datasets.setSampleSharing(notebook.id, datasetId, enabled);
                this.datasetError = null;
              } catch {
                this.datasetError = "Dataset is no longer available.";
                this.update();
              }
            }}
            onRemove={(datasetId) => {
              this.datasetError = null;
              void this.datasets.remove(notebook.id, datasetId).catch(() => {
                this.datasetError = "Dataset could not be removed.";
                this.update();
              });
            }}
          />
        )}
        {notebook && (
          <ExperimentPanel
            datasets={this.datasets.list(notebook.id)}
            error={this.experimentError}
            status={this.experimentStatus}
            datasetId={this.experimentDatasetId}
            target={this.experimentTarget}
            features={this.experimentFeatures}
            model={this.experimentModel}
            onDataset={(datasetId) => {
              this.experimentDatasetId = datasetId;
              this.experimentTarget = "";
              this.experimentFeatures = [];
              this.experimentError = null;
              this.experimentStatus = null;
              this.update();
            }}
            onTarget={(target) => {
              this.experimentTarget = target;
              this.experimentFeatures = this.experimentFeatures.filter(
                (feature) => feature !== target,
              );
              this.experimentError = null;
              this.experimentStatus = null;
              this.update();
            }}
            onFeature={(feature, enabled) => {
              this.experimentFeatures = enabled
                ? [...new Set([...this.experimentFeatures, feature])]
                : this.experimentFeatures.filter((item) => item !== feature);
              this.update();
            }}
            onModel={(model) => {
              this.experimentModel = model;
              this.update();
            }}
            onCreate={(datasetId, target, features, model) =>
              this.createTrainingProposal(datasetId, target, features, model)
            }
          />
        )}
        {notebook && (
          <ExperimentHistory
            runs={experimentRuns}
            selected={this.experimentSelection}
            comparison={this.experimentComparison}
            storageError={this.experiments.storageError}
            onSelect={(runId, enabled) => {
              this.experimentSelection = enabled
                ? [...new Set([...this.experimentSelection, runId])]
                : this.experimentSelection.filter((id) => id !== runId);
              this.experimentComparison = null;
              this.update();
            }}
            onCompare={() => {
              try {
                this.experimentComparison = this.experiments.compare(
                  this.experimentSelection,
                );
                this.experimentError = null;
              } catch {
                this.experimentError =
                  "Selected experiment results are unavailable.";
              }
              this.update();
            }}
            onDelete={(runId) => {
              try {
                this.experiments.remove(runId);
                this.experimentSelection = this.experimentSelection.filter(
                  (id) => id !== runId,
                );
                this.experimentComparison = null;
              } catch {
                this.experimentError =
                  "Experiment result could not be deleted.";
              }
              this.update();
            }}
            onExport={() => this.downloadExperiments()}
          />
        )}
        {notebook && (
          <AuditPanel
            pending={this.auditPending}
            result={this.auditResult}
            error={this.auditError}
            onRun={() => {
              void this.runAudit();
            }}
            onNavigate={(finding) => this.navigateToFinding(finding)}
          />
        )}
        {notebook && (
          <ReportPanel
            runs={experimentRuns}
            selected={this.reportSelection}
            format={this.reportFormat}
            pending={this.reportPending}
            error={this.reportError}
            reports={this.reports.list(notebook.id)}
            onSelect={(runId, enabled) => {
              this.reportSelection = enabled
                ? [...new Set([...this.reportSelection, runId])]
                : this.reportSelection.filter((id) => id !== runId);
              this.update();
            }}
            onFormat={(format) => {
              this.reportFormat = format;
              this.update();
            }}
            onPrepare={() => {
              void this.prepareReport();
            }}
            onDownload={(report) => this.downloadReport(report)}
            onRemove={(exportId) => this.reports.remove(exportId)}
          />
        )}
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
              this.auditResult = null;
              this.refresh();
            }}
            onCell={(id, value) => {
              this.policies.setCell(notebook.id, id, value);
              this.auditResult = null;
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
              this.experimentRegistry.settle(this.proposals.accept(id));
            }}
            onReject={(id) => {
              this.experimentRegistry.settle(this.proposals.reject(id));
            }}
          />
        )}
        {notebook && (
          <ExecutionReview
            canRun={notebook.sessionContext.session?.kernel?.status === "idle"}
            requests={this.executions.review(notebook.id)}
            onApprove={(id) => {
              void this.executions
                .approve(id)
                .then(() => this.recordExperiment(id))
                .catch(() => {
                  this.error = "Run request could not be approved.";
                })
                .finally(() => this.update());
              this.update();
            }}
            onCancel={(id) => {
              this.executions.cancel(id);
              this.recordExperiment(id);
              this.update();
            }}
          />
        )}
      </WorkspaceContent>
    );
  }
}
