import React from "react";
import type { DatasetSummary } from "../data/store";
import type { ExperimentModel } from "../experiments/templates";

export function ExperimentPanel({
  datasets,
  error,
  status,
  datasetId,
  target,
  features,
  model,
  onDataset,
  onTarget,
  onFeature,
  onModel,
  onCreate,
}: {
  datasets: DatasetSummary[];
  error: string | null;
  status: string | null;
  datasetId: string;
  target: string;
  features: string[];
  model: ExperimentModel;
  onDataset: (datasetId: string) => void;
  onTarget: (target: string) => void;
  onFeature: (feature: string, enabled: boolean) => void;
  onModel: (model: ExperimentModel) => void;
  onCreate: (
    datasetId: string,
    target: string,
    features: string[],
    model: ExperimentModel,
  ) => void;
}): React.ReactElement {
  const dataset = datasets.find((item) => item.datasetId === datasetId);

  return (
    <section
      className="np-experiments"
      aria-labelledby="np-experiments-heading"
    >
      <h3 id="np-experiments-heading">Experiment builder</h3>
      <p>
        Choose the target and features yourself. NotebookPilot creates a visible
        training-cell proposal; running it still needs separate approval.
      </p>
      <label>
        Dataset
        <select
          aria-label="Experiment dataset"
          value={datasetId}
          onChange={(event) => onDataset(event.currentTarget.value)}
        >
          <option value="">Choose a dataset</option>
          {datasets.map((item) => (
            <option key={item.datasetId} value={item.datasetId}>
              {item.displayName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Target
        <select
          aria-label="Experiment target"
          value={target}
          disabled={!dataset}
          onChange={(event) => onTarget(event.currentTarget.value)}
        >
          <option value="">Choose the target</option>
          {dataset?.columns.map((column) => (
            <option key={column.name} value={column.name}>
              {column.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset disabled={!dataset || !target}>
        <legend>Features</legend>
        {dataset?.columns
          .filter((column) => column.name !== target)
          .map((column) => (
            <label key={column.name}>
              <input
                type="checkbox"
                checked={features.includes(column.name)}
                onChange={(event) =>
                  onFeature(column.name, event.currentTarget.checked)
                }
              />{" "}
              {column.name}
            </label>
          ))}
      </fieldset>
      <label>
        Model
        <select
          aria-label="Experiment model"
          value={model}
          onChange={(event) =>
            onModel(event.currentTarget.value as ExperimentModel)
          }
        >
          <option value="logistic_regression">Logistic regression</option>
          <option value="random_forest">Random forest</option>
        </select>
      </label>
      <button
        type="button"
        disabled={!dataset || !target || features.length === 0}
        onClick={() => onCreate(datasetId, target, features, model)}
      >
        Create training proposal
      </button>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
