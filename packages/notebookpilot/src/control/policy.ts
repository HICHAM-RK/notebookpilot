export type AccessMode = "hidden" | "read" | "write";

function parseMode(value: unknown): AccessMode {
  return value === "read" || value === "write" ? value : "hidden";
}

/** Session-only human policy. Never load authority from notebook metadata. */
export class PolicyStore {
  private notebooks = new Map<string, AccessMode>();
  private cells = new Map<string, Map<string, AccessMode>>();
  private revision = 0;

  get version(): number {
    return this.revision;
  }

  notebookMode(notebookId: string): AccessMode {
    return this.notebooks.get(notebookId) ?? "read";
  }

  cellMode(notebookId: string, cellId: string): AccessMode {
    return (
      this.cells.get(notebookId)?.get(cellId) ?? this.notebookMode(notebookId)
    );
  }

  setNotebook(notebookId: string, value: unknown): void {
    this.notebooks.set(notebookId, parseMode(value));
    this.revision++;
  }

  setCell(notebookId: string, cellId: string, value: unknown): void {
    let cells = this.cells.get(notebookId);
    if (!cells) {
      cells = new Map();
      this.cells.set(notebookId, cells);
    }
    cells.set(cellId, parseMode(value));
    this.revision++;
  }

  canRead(notebookId: string, cellId?: string): boolean {
    return (
      this.notebookMode(notebookId) !== "hidden" &&
      (cellId === undefined || this.cellMode(notebookId, cellId) !== "hidden")
    );
  }

  canWrite(notebookId: string, cellId: string): boolean {
    return (
      this.notebookMode(notebookId) === "write" &&
      this.cellMode(notebookId, cellId) === "write"
    );
  }

  forget(notebookId: string): void {
    this.notebooks.delete(notebookId);
    this.cells.delete(notebookId);
    this.revision++;
  }
}
