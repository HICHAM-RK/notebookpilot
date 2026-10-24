import { PolicyStore } from "./policy";
import { hashSource } from "../notebook/revisions";

export interface UpdateProposal {
  proposalId: string;
  notebookId: string;
  cellId: string;
  original: string;
  source: string;
  expiresAt: number;
  status: "pending" | "accepted" | "denied" | "expired" | "cancelled";
  insertion?: {
    afterCellId: string | null;
    cellType: "code" | "markdown";
    order: string[];
  };
}

export interface InsertionAdapter {
  order(notebookId: string): string[] | null;
  insert(
    notebookId: string,
    expectedOrder: string[],
    afterCellId: string | null,
    cellId: string,
    cellType: "code" | "markdown",
    source: string,
  ): boolean;
}

/** Human acceptance is intentionally separate from any exposed agent tool. */
export class UpdateProposals {
  private readonly records = new Map<string, UpdateProposal>();
  private readonly listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }

  list(notebookId: string): UpdateProposal[] {
    return Array.from(this.records.values())
      .filter((proposal) => proposal.notebookId === notebookId)
      .map((proposal) => structuredClone(this.current(proposal.proposalId)));
  }

  status(id: string): { status: UpdateProposal["status"] } {
    const record = this.records.get(id);
    if (
      !record ||
      !this.policies.canRead(
        record.notebookId,
        record.insertion
          ? (record.insertion.afterCellId ?? undefined)
          : record.cellId,
      ) ||
      (record.insertion
        ? this.insertionAdapter?.order(record.notebookId) == null
        : this.read(record.notebookId, record.cellId) === null)
    )
      throw new Error("NOT_FOUND");
    return { status: this.current(id).status };
  }

  constructor(
    private readonly policies: PolicyStore,
    private readonly read: (
      notebookId: string,
      cellId: string,
    ) => string | null,
    // Adapter must compare and write synchronously, with no await between them.
    private readonly replace: (
      notebookId: string,
      cellId: string,
      expected: string,
      source: string,
    ) => boolean,
    private readonly now: () => number = Date.now,
    private readonly insertionAdapter?: InsertionAdapter,
  ) {}

  proposeInsert(
    notebookId: string,
    afterCellId: string | null,
    cellType: "code" | "markdown",
    source: string,
  ): UpdateProposal {
    const validId = (id: unknown): id is string =>
      typeof id === "string" && id.length > 0 && id.length <= 128;
    if (
      !validId(notebookId) ||
      (afterCellId !== null && !validId(afterCellId)) ||
      !["code", "markdown"].includes(cellType) ||
      typeof source !== "string"
    )
      throw new Error("INVALID_ARGUMENT");
    if (!this.canInsert(notebookId, afterCellId))
      throw new Error("ACCESS_DENIED");
    if (
      this.records.size >= 100 ||
      new TextEncoder().encode(source).length > 256 * 1024
    )
      throw new Error("LIMIT_EXCEEDED");
    const order = this.insertionAdapter?.order(notebookId);
    if (!order || (afterCellId !== null && !order.includes(afterCellId)))
      throw new Error("NOT_FOUND");
    if (
      order.length > 10000 ||
      new Set(order).size !== order.length ||
      order.some((id) => !validId(id))
    )
      throw new Error("LIMIT_EXCEEDED");
    const proposal: UpdateProposal = {
      proposalId: crypto.randomUUID(),
      notebookId,
      cellId: crypto.randomUUID(),
      original: "",
      source,
      expiresAt: this.now() + 600000,
      status: "pending",
      insertion: { afterCellId, cellType, order: [...order] },
    };
    this.records.set(proposal.proposalId, proposal);
    this.changed();
    return structuredClone(proposal);
  }

  private canInsert(notebookId: string, afterCellId: string | null): boolean {
    return (
      this.policies.notebookMode(notebookId) === "write" &&
      (afterCellId === null || this.policies.canWrite(notebookId, afterCellId))
    );
  }

  async propose(
    notebookId: string,
    cellId: string,
    expectedHash: string,
    source: string,
    signal?: AbortSignal,
  ): Promise<UpdateProposal> {
    if (signal?.aborted) throw new Error("CANCELLED");
    if (
      ![notebookId, cellId].every(
        (id) => typeof id === "string" && id.length > 0 && id.length <= 128,
      ) ||
      typeof source !== "string" ||
      !/^[a-f0-9]{64}$/.test(expectedHash)
    )
      throw new Error("INVALID_ARGUMENT");
    if (new TextEncoder().encode(source).length > 256 * 1024)
      throw new Error("LIMIT_EXCEEDED");
    if (!this.policies.canWrite(notebookId, cellId))
      throw new Error("ACCESS_DENIED");
    const original = this.read(notebookId, cellId);
    if (original === null) throw new Error("NOT_FOUND");
    if (
      new TextEncoder().encode(original).length > 256 * 1024 ||
      this.records.size >= 100
    )
      throw new Error("LIMIT_EXCEEDED");
    const version = this.policies.version;
    const hash = await hashSource(original);
    if (signal?.aborted) throw new Error("CANCELLED");
    if (
      version !== this.policies.version ||
      !this.policies.canWrite(notebookId, cellId)
    )
      throw new Error("ACCESS_DENIED");
    if (hash !== expectedHash || this.read(notebookId, cellId) !== original)
      throw new Error("STALE_CELL");
    if (this.records.size >= 100) throw new Error("LIMIT_EXCEEDED");
    const proposal: UpdateProposal = {
      proposalId: crypto.randomUUID(),
      notebookId,
      cellId,
      original,
      source,
      expiresAt: this.now() + 600000,
      status: "pending",
    };
    this.records.set(proposal.proposalId, proposal);
    this.changed();
    return { ...proposal };
  }

  private current(id: string): UpdateProposal {
    const proposal = this.records.get(id);
    if (!proposal) throw new Error("NOT_FOUND");
    if (proposal.status === "pending") {
      if (this.now() >= proposal.expiresAt) proposal.status = "expired";
      else if (proposal.insertion) {
        if (
          !this.canInsert(
            proposal.notebookId,
            proposal.insertion.afterCellId,
          ) ||
          JSON.stringify(this.insertionAdapter?.order(proposal.notebookId)) !==
            JSON.stringify(proposal.insertion.order)
        )
          proposal.status = "cancelled";
      } else if (
        !this.policies.canWrite(proposal.notebookId, proposal.cellId) ||
        this.read(proposal.notebookId, proposal.cellId) !== proposal.original
      )
        proposal.status = "cancelled";
    }
    return proposal;
  }

  accept(id: string): UpdateProposal {
    const proposal = this.current(id);
    if (proposal.status === "pending") {
      // Mark terminal before calling the adapter to prevent reentrant acceptance.
      proposal.status = "cancelled";
      if (
        proposal.insertion
          ? this.insertionAdapter?.insert(
              proposal.notebookId,
              proposal.insertion.order,
              proposal.insertion.afterCellId,
              proposal.cellId,
              proposal.insertion.cellType,
              proposal.source,
            )
          : this.replace(
              proposal.notebookId,
              proposal.cellId,
              proposal.original,
              proposal.source,
            )
      )
        proposal.status = "accepted";
    }
    this.changed();
    return structuredClone(proposal);
  }

  reject(id: string): UpdateProposal {
    const proposal = this.current(id);
    if (proposal.status === "pending") proposal.status = "denied";
    this.changed();
    return structuredClone(proposal);
  }

  cancelNotebook(notebookId: string): void {
    for (const proposal of this.records.values()) {
      if (proposal.notebookId === notebookId && proposal.status === "pending")
        proposal.status = "cancelled";
    }
    this.changed();
  }
}
