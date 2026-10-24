import React from "react";
import type { ExperimentComparison, ExperimentRun } from "../experiments/store";

export function ExperimentHistory({
  runs,
  selected,
  comparison,
  storageError,
  onSelect,
  onCompare,
  onDelete,
  onExport,
}: {
  runs: ExperimentRun[];
  selected: string[];
  comparison: ExperimentComparison | null;
  storageError: string | null;
  onSelect: (runId: string, enabled: boolean) => void;
  onCompare: () => void;
  onDelete: (runId: string) => void;
  onExport: () => void;
}): React.ReactElement {
  return (
    <section aria-labelledby="np-history-heading">
      <h3 id="np-history-heading">Experiment history</h3>
      <p>
        Saved results contain metrics and provenance, without uploaded dataset
        rows.
      </p>
      {storageError && (
        <p role="alert">
          Experiment storage is unavailable. New results may not survive a
          reload.
        </p>
      )}
      {runs.length === 0 && <p>No saved experiments.</p>}
      {runs.map((run) => (
        <article key={run.runId} aria-label={`Experiment ${run.runId}`}>
          <label>
            <input
              type="checkbox"
              aria-label={`Select ${run.runId}`}
              checked={selected.includes(run.runId)}
              onChange={(event) =>
                onSelect(run.runId, event.currentTarget.checked)
              }
            />
            {run.model ?? "Experiment"} — {run.status}
          </label>
          {run.metrics && (
            <p>
              Accuracy {run.metrics.accuracy.toFixed(3)} · Macro F1{" "}
              {run.metrics.macroF1.toFixed(3)}
            </p>
          )}
          {run.errorCode && <p>{run.errorCode}</p>}
          <button type="button" onClick={() => onDelete(run.runId)}>
            Delete result
          </button>
        </article>
      ))}
      <button type="button" disabled={selected.length < 2} onClick={onCompare}>
        Compare selected
      </button>
      <button type="button" disabled={selected.length === 0} onClick={onExport}>
        Export selected JSON
      </button>
      {comparison && (
        <div role="status" aria-label="Experiment comparison">
          {comparison.compatible ? (
            <p>Compatible runs ranked by macro F1.</p>
          ) : (
            <>
              <p>These runs cannot be ranked.</p>
              <ul>
                {comparison.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </>
          )}
          <ol>
            {comparison.runs.map((run) => (
              <li key={run.runId}>
                {run.rank === null ? "Unranked" : `#${run.rank}`}{" "}
                {run.model ?? run.status}
                {run.metrics ? ` — ${run.metrics.macroF1.toFixed(3)}` : ""}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
