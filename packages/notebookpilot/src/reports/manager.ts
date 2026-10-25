import { NotebookAuditor } from "../audit/auditor";
import { ExperimentStore } from "../experiments/store";
import { renderHtmlReport, renderMarkdownReport } from "./export";
import { buildReportModel, ReportError } from "./model";

export type ReportFormat = "html" | "markdown";

export interface PreparedReport {
  exportId: string;
  notebookId: string;
  fileName: string;
  format: ReportFormat;
  bytes: number;
  content: string;
}

const MAX_PREPARED_REPORTS = 10;

export class ReportManager {
  private readonly reports: PreparedReport[] = [];
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly experiments: ExperimentStore,
    private readonly auditor: NotebookAuditor,
    private readonly notebookKey: (notebookId: string) => string | null,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  list(notebookId: string): PreparedReport[] {
    return this.reports
      .filter((report) => report.notebookId === notebookId)
      .map((report) => ({ ...report }));
  }

  async prepare(
    notebookId: string,
    runIds: string[] | undefined,
    format: ReportFormat,
  ): Promise<PreparedReport> {
    const notebookKey = this.notebookKey(notebookId);
    if (!notebookKey) throw new ReportError("INVALID_ARGUMENT");
    const available = this.experiments.list(notebookKey);
    const selected = runIds ?? available.map((run) => run.runId);
    if (selected.length > 10) throw new ReportError("LIMIT_EXCEEDED");
    const audit = await this.auditor.audit(notebookId);
    if (this.notebookKey(notebookId) !== notebookKey)
      throw new ReportError("INVALID_ARGUMENT");
    const model = buildReportModel({
      notebookId: notebookKey,
      generatedAt: this.now(),
      requestedRunIds: selected,
      runs: available,
      audit,
    });
    const content =
      format === "html"
        ? renderHtmlReport(model)
        : format === "markdown"
          ? renderMarkdownReport(model)
          : (() => {
              throw new ReportError("INVALID_ARGUMENT");
            })();
    const exportId = this.createId();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(exportId))
      throw new ReportError("INVALID_ARGUMENT");
    const report: PreparedReport = {
      exportId,
      notebookId,
      fileName: `notebookpilot-report-${exportId}.${format === "html" ? "html" : "md"}`,
      format,
      bytes: new TextEncoder().encode(content).length,
      content,
    };
    if (this.reports.length >= MAX_PREPARED_REPORTS) this.reports.shift();
    this.reports.push(report);
    this.emit();
    return { ...report };
  }

  remove(exportId: string): void {
    const index = this.reports.findIndex(
      (report) => report.exportId === exportId,
    );
    if (index < 0) throw new ReportError("INVALID_ARGUMENT");
    this.reports.splice(index, 1);
    this.emit();
  }

  clearNotebook(notebookId: string): void {
    let removed = false;
    for (let index = this.reports.length - 1; index >= 0; index--) {
      if (this.reports[index].notebookId === notebookId) {
        this.reports.splice(index, 1);
        removed = true;
      }
    }
    if (removed) this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
