import type { INotebookTracker } from "@jupyterlab/notebook";
import { PolicyStore } from "../control/policy";
import type { InsertionAdapter } from "../control/proposals";

export function createNotebookInsertion(
  tracker: INotebookTracker,
  policies: PolicyStore,
): InsertionAdapter {
  function model(id: string) {
    if (!policies.canRead(id)) return null;
    const panel = tracker.find((candidate) => candidate.id === id);
    return panel && !panel.isDisposed ? panel.content.model : null;
  }
  return {
    order: (id) => {
      const notebook = model(id);
      return notebook ? Array.from(notebook.cells, (cell) => cell.id) : null;
    },
    insert: (id, expected, after, cellId, cellType, source) => {
      if (
        policies.notebookMode(id) !== "write" ||
        (after !== null && !policies.canWrite(id, after))
      )
        return false;
      const notebook = model(id);
      if (!notebook) return false;
      const order = Array.from(notebook.cells, (cell) => cell.id);
      if (
        JSON.stringify(order) !== JSON.stringify(expected) ||
        order.includes(cellId) ||
        (after !== null && !order.includes(after))
      )
        return false;
      const index = after === null ? 0 : order.indexOf(after) + 1;
      notebook.sharedModel.insertCell(
        index,
        cellType === "code"
          ? {
              id: cellId,
              cell_type: "code",
              source,
              metadata: {},
              outputs: [],
              execution_count: null,
            }
          : { id: cellId, cell_type: "markdown", source, metadata: {} },
      );
      return true;
    },
  };
}

export function createNotebookMutations(
  tracker: INotebookTracker,
  policies: PolicyStore,
) {
  function find(notebookId: string, cellId: string) {
    if (!policies.canRead(notebookId, cellId)) return null;
    const panel = tracker.find((candidate) => candidate.id === notebookId);
    if (!panel || panel.isDisposed || !panel.content.model) return null;
    const matches = Array.from(panel.content.model.cells).filter(
      (cell) => cell.id === cellId,
    );
    return matches.length === 1 ? matches[0] : null;
  }
  return {
    read: (notebookId: string, cellId: string): string | null =>
      find(notebookId, cellId)?.sharedModel.getSource() ?? null,
    replace: (
      notebookId: string,
      cellId: string,
      expected: string,
      source: string,
    ): boolean => {
      if (!policies.canWrite(notebookId, cellId)) return false;
      const cell = find(notebookId, cellId);
      if (!cell || cell.sharedModel.getSource() !== expected) return false;
      cell.sharedModel.setSource(source);
      return true;
    },
  };
}
