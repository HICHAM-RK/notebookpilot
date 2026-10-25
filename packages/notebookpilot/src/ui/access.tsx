import React from "react";
import type { AccessMode } from "../control/policy";
import type { CellsPage } from "../notebook/reader";

interface AccessProps {
  notebookMode: AccessMode;
  cells: { id: string; type: string; mode: AccessMode }[];
  pending: boolean;
  result: CellsPage | null;
  error: string | null;
  onNotebook: (value: string) => void;
  onCell: (id: string, value: string) => void;
  onPreview: (offset?: number) => void;
}

function Options(): React.ReactElement {
  return (
    <>
      <option value="read">Read only</option>
      <option value="write">Allow proposals</option>
      <option value="hidden">Hidden from agent</option>
    </>
  );
}

export function AccessControls(props: AccessProps): React.ReactElement {
  return (
    <div className="np-access" data-lm-suppress-shortcuts="">
      <h3>Agent permissions</h3>
      <p>
        These choices apply to this session. Editing and running will still need
        your approval.
      </p>
      <label>
        Notebook access
        <select
          value={props.notebookMode}
          onChange={(event) => props.onNotebook(event.target.value)}
        >
          <Options />
        </select>
      </label>
      <details>
        <summary>Cell permissions ({props.cells.length})</summary>
        {props.cells.map((cell, index) => (
          <label key={cell.id}>
            Cell {index + 1} access
            <select
              value={cell.mode}
              onChange={(event) => props.onCell(cell.id, event.target.value)}
            >
              <Options />
            </select>
          </label>
        ))}
      </details>
      <button disabled={props.pending} onClick={() => props.onPreview()}>
        Preview agent access
      </button>
      {props.pending && <p role="status">Reading current cells…</p>}
      {props.error && <p role="alert">{props.error}</p>}
      {props.result && (
        <div className="np-preview">
          <p>{props.result.cells.length} cells visible on this page.</p>
          {props.result.cells.map((cell) => (
            <details key={cell.cellId} open>
              <summary>
                {cell.type} cell{cell.truncated ? " (shortened preview)" : ""}
              </summary>
              <pre>{cell.source}</pre>
            </details>
          ))}
          {props.result.nextOffset !== null && (
            <button onClick={() => props.onPreview(props.result!.nextOffset!)}>
              Show next cells
            </button>
          )}
        </div>
      )}
    </div>
  );
}
