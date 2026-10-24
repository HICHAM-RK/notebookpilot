import { PolicyStore } from "../control/policy";
import { hashSource, truncateUtf8 } from "./revisions";

export interface ExecutionTarget {
  source: string;
  kernelId: string;
  type: string;
}
export interface ExecutionAdapter {
  read(notebookId: string, cellId: string): ExecutionTarget | null;
  // Must atomically recheck source/kernel and dispatch only the visible cell.
  // Abort may interrupt only work owned by this request; never unrelated work.
  run(
    notebookId: string,
    cellId: string,
    expected: ExecutionTarget,
    signal: AbortSignal,
  ): Promise<string>;
}
export interface ExecutionRecord {
  requestId: string;
  notebookId: string;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  cells: {
    cellId: string;
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    outputSummary: string;
  }[];
  errorCode?: string;
}
interface PendingRun {
  record: ExecutionRecord;
  targets: { cellId: string; expected: ExecutionTarget }[];
  controller: AbortController;
  completion?: Promise<void>;
}

export class ExecutionQueue {
  private readonly records = new Map<string, PendingRun>();
  private readonly lanes = new Map<string, Promise<void>>();
  constructor(
    private readonly policies: PolicyStore,
    private readonly adapter: ExecutionAdapter,
  ) {}

  async request(
    notebookId: string,
    cells: { cellId: string; expectedSourceHash: string }[],
  ): Promise<{ requestId: string; status: "pending" }> {
    const id = (value: unknown) =>
      typeof value === "string" && value.length > 0 && value.length <= 128;
    if (
      !id(notebookId) ||
      !Array.isArray(cells) ||
      cells.length < 1 ||
      cells.length > 20 ||
      cells.some(
        (cell) =>
          !cell ||
          !id(cell.cellId) ||
          typeof cell.expectedSourceHash !== "string" ||
          !/^[a-f0-9]{64}$/.test(cell.expectedSourceHash),
      ) ||
      new Set(cells.map((cell) => cell.cellId)).size !== cells.length
    )
      throw new Error("INVALID_ARGUMENT");
    if (this.records.size >= 100) throw new Error("LIMIT_EXCEEDED");
    const version = this.policies.version;
    const targets: PendingRun["targets"] = [];
    for (const cell of cells) {
      if (!this.policies.canWrite(notebookId, cell.cellId))
        throw new Error("ACCESS_DENIED");
      const current = this.adapter.read(notebookId, cell.cellId);
      if (!current || current.type !== "code") throw new Error("NOT_FOUND");
      if (new TextEncoder().encode(current.source).length > 256 * 1024)
        throw new Error("LIMIT_EXCEEDED");
      const expected = { ...current };
      if ((await hashSource(expected.source)) !== cell.expectedSourceHash)
        throw new Error("STALE_CELL");
      targets.push({ cellId: cell.cellId, expected });
    }
    if (version !== this.policies.version) throw new Error("ACCESS_DENIED");
    if (targets.some((target) => !this.matches(notebookId, target)))
      throw new Error("STALE_CELL");
    if (new Set(targets.map((target) => target.expected.kernelId)).size !== 1)
      throw new Error("KERNEL_UNAVAILABLE");
    if (this.records.size >= 100) throw new Error("LIMIT_EXCEEDED");
    const requestId = crypto.randomUUID();
    this.records.set(requestId, {
      record: { requestId, notebookId, status: "pending", cells: [] },
      targets,
      controller: new AbortController(),
    });
    return { requestId, status: "pending" };
  }

  private matches(
    notebookId: string,
    target: PendingRun["targets"][number],
  ): boolean {
    if (!this.policies.canWrite(notebookId, target.cellId)) return false;
    const current = this.adapter.read(notebookId, target.cellId);
    return (
      !!current &&
      current.source === target.expected.source &&
      current.kernelId === target.expected.kernelId &&
      current.type === "code"
    );
  }

  get(requestId: string): ExecutionRecord {
    const pending = this.records.get(requestId);
    if (
      !pending ||
      pending.targets.some(
        (target) =>
          !this.policies.canRead(pending.record.notebookId, target.cellId) ||
          !this.adapter.read(pending.record.notebookId, target.cellId),
      )
    )
      throw new Error("NOT_FOUND");
    return structuredClone(pending.record);
  }

  approve(requestId: string): Promise<void> {
    const pending = this.records.get(requestId);
    if (!pending) return Promise.reject(new Error("NOT_FOUND"));
    if (pending.completion) return pending.completion;
    if (pending.record.status !== "pending") return Promise.resolve();
    const kernel = pending.targets[0].expected.kernelId;
    const previous = this.lanes.get(kernel) ?? Promise.resolve();
    pending.completion = previous.then(() => this.dispatch(pending));
    this.lanes.set(kernel, pending.completion);
    void pending.completion.then(() => {
      if (this.lanes.get(kernel) === pending.completion)
        this.lanes.delete(kernel);
    });
    return pending.completion;
  }

  cancel(requestId: string): void {
    const pending = this.records.get(requestId);
    if (!pending) throw new Error("NOT_FOUND");
    if (
      pending.record.status !== "pending" &&
      pending.record.status !== "running"
    )
      return;
    pending.record.status = "cancelled";
    for (const cell of pending.record.cells)
      if (cell.status === "queued" || cell.status === "running")
        cell.status = "cancelled";
    pending.controller.abort();
  }

  cancelNotebook(notebookId: string): void {
    for (const pending of this.records.values())
      if (pending.record.notebookId === notebookId)
        this.cancel(pending.record.requestId);
  }

  private async dispatch(pending: PendingRun): Promise<void> {
    const { record, targets, controller } = pending;
    if (controller.signal.aborted) return;
    const timer = setTimeout(() => {
      if (controller.signal.aborted) return;
      record.status = "failed";
      record.errorCode = "TIMEOUT";
      for (const cell of record.cells)
        if (cell.status === "running" || cell.status === "queued")
          cell.status = "cancelled";
      controller.abort();
    }, 120000);
    try {
      if (targets.some((target) => !this.matches(record.notebookId, target)))
        throw new Error("STALE_CELL");
      record.status = "running";
      record.cells = targets.map((target) => ({
        cellId: target.cellId,
        status: "queued",
        outputSummary: "",
      }));
      for (let index = 0; index < targets.length; index++) {
        if (controller.signal.aborted) return;
        const target = targets[index];
        if (!this.matches(record.notebookId, target))
          throw new Error("STALE_CELL");
        record.cells[index].status = "running";
        const output = await this.adapter.run(
          record.notebookId,
          target.cellId,
          target.expected,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (!this.policies.canRead(record.notebookId, target.cellId))
          throw new Error("ACCESS_DENIED");
        record.cells[index].outputSummary = truncateUtf8(output, 1024).text;
        record.cells[index].status = "succeeded";
      }
      record.status = "succeeded";
    } catch (error) {
      if (!controller.signal.aborted) {
        record.status = "failed";
        record.errorCode =
          error instanceof Error &&
          ["STALE_CELL", "ACCESS_DENIED", "KERNEL_UNAVAILABLE"].includes(
            error.message,
          )
            ? error.message
            : "EXECUTION_FAILED";
        for (const cell of record.cells) {
          if (cell.status === "running") cell.status = "failed";
          else if (cell.status === "queued") cell.status = "cancelled";
        }
      }
    } finally {
      clearTimeout(timer);
      // Keep the kernel lane occupied until the adapter settles, even after abort.
    }
  }
}
