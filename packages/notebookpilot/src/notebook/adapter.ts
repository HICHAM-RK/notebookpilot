import type { INotebookTracker } from "@jupyterlab/notebook";
import { PolicyStore } from "../control/policy";
import { NotebookError, type LiveCell, type LiveNotebook } from "./reader";

export function readLiveNotebook(
  tracker: INotebookTracker,
  id: string,
  policies: PolicyStore,
): LiveNotebook | null {
  const panel = tracker.find((candidate) => candidate.id === id);
  if (
    !panel ||
    panel.isDisposed ||
    !panel.content.model ||
    !policies.canRead(id)
  )
    return null;
  return {
    id,
    cells: Array.from(panel.content.model.cells)
      .filter((cell) => policies.canRead(id, cell.id))
      .map((cell): LiveCell => {
        const type = cell.type;
        if (type !== "code" && type !== "markdown" && type !== "raw")
          throw new NotebookError("INVALID_ARGUMENT");
        const data = cell.toJSON();
        return {
          id: cell.id,
          type,
          source: cell.sharedModel.getSource(),
          outputs:
            data.cell_type === "code" ? JSON.stringify(data.outputs) : "",
          executionCount:
            data.cell_type === "code" &&
            typeof data.execution_count === "number"
              ? data.execution_count
              : null,
        };
      }),
  };
}
