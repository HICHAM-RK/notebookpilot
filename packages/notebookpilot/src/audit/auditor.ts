import { PolicyStore } from "../control/policy";
import type { LiveNotebook } from "../notebook/reader";
import { auditNotebook } from "./rules";
import type { AuditResult } from "./model";

export class AuditError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "STALE_CELL" | "INVALID_ARGUMENT",
  ) {
    super(code);
  }
}

/** Permission-scoped live audit coordinator. Hidden cells are removed before hashing. */
export class NotebookAuditor {
  constructor(
    private readonly resolve: (notebookId: string) => LiveNotebook | null,
    private readonly policies: PolicyStore,
  ) {}

  async audit(notebookId: string): Promise<AuditResult> {
    if (!notebookId || notebookId.length > 128)
      throw new AuditError("INVALID_ARGUMENT");
    const notebook = this.resolve(notebookId);
    if (!notebook || !this.policies.canRead(notebookId))
      throw new AuditError("NOT_FOUND");
    const policyVersion = this.policies.version;
    const visible = notebook.cells
      .filter((cell) => this.policies.canRead(notebookId, cell.id))
      .map((cell) => ({
        cellId: cell.id,
        type: cell.type,
        source: cell.source,
        executionCount:
          cell.type === "code" ? (cell.executionCount ?? null) : null,
      }));
    if (
      visible.some((cell) => !cell.cellId || cell.cellId.length > 128) ||
      new Set(visible.map((cell) => cell.cellId)).size !== visible.length
    )
      throw new AuditError("INVALID_ARGUMENT");
    const result = await auditNotebook(visible);
    const current = this.resolve(notebookId);
    if (
      !current ||
      policyVersion !== this.policies.version ||
      !this.policies.canRead(notebookId)
    )
      throw new AuditError("NOT_FOUND");
    const latest = current.cells.filter((cell) =>
      this.policies.canRead(notebookId, cell.id),
    );
    if (
      latest.length !== visible.length ||
      latest.some(
        (cell, index) =>
          cell.id !== visible[index].cellId ||
          cell.type !== visible[index].type ||
          cell.source !== visible[index].source ||
          (cell.type === "code" ? (cell.executionCount ?? null) : null) !==
            visible[index].executionCount,
      )
    )
      throw new AuditError("STALE_CELL");
    return result;
  }
}
