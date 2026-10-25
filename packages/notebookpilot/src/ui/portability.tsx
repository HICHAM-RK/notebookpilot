import React from "react";
import type { PortabilityWarning } from "../notebook/portability";

export function PortabilityPanel({
  pending,
  importedName,
  cellCount,
  warnings,
  error,
  status,
  onChoose,
  onApply,
  onCancel,
  onExport,
}: {
  pending: boolean;
  importedName: string | null;
  cellCount: number | null;
  warnings: PortabilityWarning[];
  error: string | null;
  status: string | null;
  onChoose: (file: File) => void;
  onApply: () => void;
  onCancel: () => void;
  onExport: () => void;
}): React.ReactElement {
  return (
    <section
      className="np-portability"
      aria-labelledby="np-portability-heading"
    >
      <h3 id="np-portability-heading">Notebook files</h3>
      <p>
        Import or download a Colab-compatible <code>.ipynb</code> file. Imported
        code never runs automatically.
      </p>
      <label htmlFor="np-notebook-import">Choose notebook</label>
      <input
        id="np-notebook-import"
        type="file"
        accept=".ipynb,application/x-ipynb+json,application/json"
        disabled={pending || importedName !== null}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onChoose(file);
          event.currentTarget.value = "";
        }}
      />
      {pending && <p role="status">Checking notebook…</p>}
      {error && <p role="alert">{error}</p>}
      {importedName && (
        <div
          className="np-import-review"
          role="group"
          aria-label="Import review"
        >
          <p>
            Replace the current notebook with <strong>{importedName}</strong> (
            {cellCount} cells)? Existing cells will be replaced.
          </p>
          {warnings.length > 0 && (
            <ul aria-label="Compatibility warnings">
              {warnings.map((warning) => (
                <li key={warning.code}>{warning.message}</li>
              ))}
            </ul>
          )}
          <button type="button" onClick={onApply}>
            Apply import
          </button>{" "}
          <button type="button" onClick={onCancel}>
            Cancel import
          </button>
        </div>
      )}
      {status && <p role="status">{status}</p>}
      <button type="button" onClick={onExport} disabled={pending}>
        Download notebook
      </button>
    </section>
  );
}
