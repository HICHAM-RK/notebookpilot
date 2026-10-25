import { PolicyStore } from "../control/policy";
import { hashSource, truncateUtf8 } from "./revisions";

export interface LiveCell {
  id: string;
  type: "code" | "markdown" | "raw";
  source: string;
  outputs: string;
  executionCount?: number | null;
}
export interface LiveNotebook {
  id: string;
  cells: LiveCell[];
}
export interface CellSnapshot {
  cellId: string;
  type: LiveCell["type"];
  source: string;
  sourceHash: string;
  outputs: string;
  truncated: boolean;
}
export interface CellsPage {
  cells: CellSnapshot[];
  nextOffset: number | null;
  truncated: boolean;
}
export class NotebookError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INVALID_ARGUMENT" | "STALE_CELL",
  ) {
    super(code);
  }
}

function envelopeBytes(payload: CellsPage): number {
  return new TextEncoder().encode(
    JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    }),
  ).length;
}

/** Domain reader; the provider resolves current live models on each invocation. */
export class NotebookReader {
  constructor(
    private readonly resolve: (id: string) => LiveNotebook | null,
    private readonly policies: PolicyStore,
  ) {}

  async getCells(
    notebookId: string,
    offset = 0,
    limit = 20,
  ): Promise<CellsPage> {
    if (
      !Number.isInteger(offset) ||
      offset < 0 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new NotebookError("INVALID_ARGUMENT");
    }
    const notebook = this.resolve(notebookId);
    if (!notebook || !this.policies.canRead(notebookId))
      throw new NotebookError("NOT_FOUND");
    const policyVersion = this.policies.version;
    const visible = notebook.cells.filter((cell) =>
      this.policies.canRead(notebookId, cell.id),
    );
    if (
      visible.some((cell) => !cell.id || cell.id.length > 128) ||
      new Set(visible.map((cell) => cell.id)).size !== visible.length
    ) {
      throw new NotebookError("INVALID_ARGUMENT");
    }
    const selected = visible
      .slice(offset, offset + limit)
      .map((cell) => ({ ...cell }));
    const page: CellsPage = { cells: [], nextOffset: null, truncated: false };
    for (const cell of selected) {
      const sourceHash = await hashSource(cell.source);
      let sourceLimit = 25 * 1024;
      let outputLimit = 10 * 1024;
      while (true) {
        const source = truncateUtf8(cell.source, sourceLimit);
        const outputs = truncateUtf8(cell.outputs, outputLimit);
        const snapshot: CellSnapshot = {
          cellId: cell.id,
          type: cell.type,
          source: source.text,
          sourceHash,
          outputs: outputs.text,
          truncated: source.truncated || outputs.truncated,
        };
        const count = page.cells.length + 1;
        const candidate: CellsPage = {
          cells: [...page.cells, snapshot],
          nextOffset: offset + count < visible.length ? offset + count : null,
          truncated: page.truncated || snapshot.truncated,
        };
        if (envelopeBytes(candidate) <= 50 * 1024) {
          Object.assign(page, candidate);
          break;
        }
        // Later cells move to the next page. A large first cell is shortened
        // further to account for escaping and duplicated transport content.
        if (page.cells.length > 0) break;
        sourceLimit = Math.floor(sourceLimit / 2);
        outputLimit = Math.floor(outputLimit / 2);
      }
      if (page.cells.at(-1)?.cellId !== cell.id) break;
    }
    const current = this.resolve(notebookId);
    if (
      !current ||
      policyVersion !== this.policies.version ||
      !this.policies.canRead(notebookId)
    ) {
      throw new NotebookError("NOT_FOUND");
    }
    const currentVisible = current.cells.filter((cell) =>
      this.policies.canRead(notebookId, cell.id),
    );
    if (
      currentVisible.length !== visible.length ||
      currentVisible.some((cell, index) => cell.id !== visible[index].id)
    ) {
      throw new NotebookError("STALE_CELL");
    }
    for (const original of selected) {
      const latest = currentVisible.find((cell) => cell.id === original.id);
      if (
        !latest ||
        latest.source !== original.source ||
        latest.type !== original.type
      ) {
        throw new NotebookError("STALE_CELL");
      }
    }
    return page;
  }
}
