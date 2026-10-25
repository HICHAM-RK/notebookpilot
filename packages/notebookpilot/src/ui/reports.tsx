import React from "react";
import type { ExperimentRun } from "../experiments/store";
import type { PreparedReport, ReportFormat } from "../reports/manager";

export function ReportPanel({
  runs,
  selected,
  format,
  pending,
  error,
  reports,
  onSelect,
  onFormat,
  onPrepare,
  onDownload,
  onRemove,
}: {
  runs: ExperimentRun[];
  selected: string[];
  format: ReportFormat;
  pending: boolean;
  error: string | null;
  reports: PreparedReport[];
  onSelect: (runId: string, enabled: boolean) => void;
  onFormat: (format: ReportFormat) => void;
  onPrepare: () => void;
  onDownload: (report: PreparedReport) => void;
  onRemove: (exportId: string) => void;
}): React.ReactElement {
  return (
    <section className="np-reports" aria-labelledby="np-reports-heading">
      <h3 id="np-reports-heading">Portable reports</h3>
      <p>
        Reports include visible-cell audit evidence and selected experiment
        records. Raw dataset rows are excluded.
      </p>
      <fieldset>
        <legend>Experiment runs</legend>
        {runs.length === 0 && <p>No saved experiments to include.</p>}
        {runs.map((run) => (
          <label key={run.runId}>
            <input
              type="checkbox"
              checked={selected.includes(run.runId)}
              onChange={(event) =>
                onSelect(run.runId, event.currentTarget.checked)
              }
            />
            {run.model ?? run.runId} — {run.status}
          </label>
        ))}
      </fieldset>
      <label>
        Report format
        <select
          value={format}
          onChange={(event) =>
            onFormat(event.currentTarget.value as ReportFormat)
          }
        >
          <option value="html">Standalone HTML</option>
          <option value="markdown">Markdown</option>
        </select>
      </label>
      <button type="button" disabled={pending} onClick={onPrepare}>
        {pending ? "Preparing…" : "Prepare report"}
      </button>
      {error && <p role="alert">{error}</p>}
      <h4>Prepared reports</h4>
      {reports.length === 0 && <p>No reports prepared.</p>}
      {reports.map((report) => (
        <article key={report.exportId} aria-label={`Report ${report.fileName}`}>
          <p>
            {report.fileName} · {report.bytes} bytes
          </p>
          <button type="button" onClick={() => onDownload(report)}>
            Download report
          </button>
          <button type="button" onClick={() => onRemove(report.exportId)}>
            Remove report
          </button>
        </article>
      ))}
    </section>
  );
}
