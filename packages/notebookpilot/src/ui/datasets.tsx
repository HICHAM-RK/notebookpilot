import React from "react";
import type { DatasetSummary } from "../data/store";

export function DatasetPanel({
  datasets,
  pendingName,
  error,
  onUpload,
  onCancel,
  onShareSamples,
  onRemove,
}: {
  datasets: DatasetSummary[];
  pendingName: string | null;
  error: string | null;
  onUpload: (file: File) => void;
  onCancel: () => void;
  onShareSamples: (datasetId: string, enabled: boolean) => void;
  onRemove: (datasetId: string) => void;
}): React.ReactElement {
  return (
    <section className="np-datasets" aria-labelledby="np-datasets-heading">
      <h3 id="np-datasets-heading">Datasets</h3>
      <p>
        Upload a UTF-8 CSV for local profiling. Raw rows are private by default.
      </p>
      <label htmlFor="np-dataset-upload">Upload CSV</label>
      <input
        id="np-dataset-upload"
        type="file"
        accept=".csv,text/csv"
        disabled={pendingName !== null}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onUpload(file);
          event.currentTarget.value = "";
        }}
      />
      {pendingName && (
        <div className="np-upload-status" role="status" aria-live="polite">
          <span>Uploading {pendingName}…</span>
          <button type="button" onClick={onCancel}>
            Cancel upload
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {datasets.length === 0 && !pendingName && (
        <p>No datasets uploaded for this notebook.</p>
      )}
      {datasets.map((dataset) => (
        <article
          key={dataset.datasetId}
          aria-label={`Dataset ${dataset.displayName}`}
        >
          <h4>{dataset.displayName}</h4>
          <p>
            {dataset.rowCount} rows · {dataset.columns.length} columns
          </p>
          <p>
            Python file: <code>{dataset.fileName}</code>
          </p>
          <label>
            <input
              type="checkbox"
              checked={dataset.shareSamples}
              onChange={(event) =>
                onShareSamples(dataset.datasetId, event.currentTarget.checked)
              }
            />{" "}
            Share up to 5 raw rows with the agent
          </label>
          <p className="np-help">
            The profile always includes column names and counts. This setting
            controls sample values only.
          </p>
          <details>
            <summary>Profile details</summary>
            <ul>
              {dataset.columns.map((column) => (
                <li key={column.name}>
                  <code>{column.name}</code>: {column.type},{" "}
                  {column.missingCount} missing
                </li>
              ))}
            </ul>
            <p>{dataset.duplicateRowCount} duplicate rows</p>
            {dataset.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </details>
          <button type="button" onClick={() => onRemove(dataset.datasetId)}>
            Remove dataset
          </button>
        </article>
      ))}
    </section>
  );
}
