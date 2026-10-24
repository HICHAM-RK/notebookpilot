import type { INotebookTracker } from "@jupyterlab/notebook";
import { PolicyStore } from "../control/policy";

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
