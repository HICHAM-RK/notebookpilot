import type { UpdateProposal } from "../control/proposals";
import type { ExecutionRecord } from "../notebook/execution";
import type { ExperimentSelection } from "./templates";
import { ExperimentStore, type ExperimentRun } from "./store";

export interface TrustedExecutionSource {
  trusted(executionId: string): {
    record: ExecutionRecord;
    targets: { cellId: string; source: string }[];
    outputs: string[];
  };
}

interface BoundExperiment extends ExperimentSelection {
  notebookId: string;
  cellId: string;
  source: string;
}

export class ExperimentRegistry {
  private readonly pending = new Map<
    string,
    {
      notebookId: string;
      expiresAt: number;
      selection: ExperimentSelection;
      source: string;
    }
  >();
  private readonly accepted = new Map<string, BoundExperiment>();

  register(proposal: UpdateProposal, selection: ExperimentSelection): void {
    this.prune();
    if (
      !proposal.proposalId ||
      proposal.status !== "pending" ||
      this.pending.has(proposal.proposalId)
    )
      throw new Error("INVALID_ARGUMENT");
    if (this.pending.size + this.accepted.size >= 100)
      throw new Error("LIMIT_EXCEEDED");
    this.pending.set(proposal.proposalId, {
      notebookId: proposal.notebookId,
      expiresAt: proposal.expiresAt,
      selection: structuredClone(selection),
      source: proposal.source,
    });
  }

  settle(proposal: UpdateProposal): void {
    const pending = this.pending.get(proposal.proposalId);
    if (!pending) return;
    this.pending.delete(proposal.proposalId);
    if (proposal.status !== "accepted" || proposal.source !== pending.source)
      return;
    this.accepted.set(this.key(proposal.notebookId, proposal.cellId), {
      ...structuredClone(pending.selection),
      notebookId: proposal.notebookId,
      cellId: proposal.cellId,
      source: pending.source,
    });
  }

  resolve(notebookId: string, cellId: string, source: string): BoundExperiment {
    const experiment = this.accepted.get(this.key(notebookId, cellId));
    if (!experiment || experiment.source !== source)
      throw new Error("UNTRUSTED_EXECUTION");
    return structuredClone(experiment);
  }

  forgetNotebook(notebookId: string): void {
    for (const [proposalId, experiment] of this.pending)
      if (experiment.notebookId === notebookId) this.pending.delete(proposalId);
    for (const [key, experiment] of this.accepted)
      if (experiment.notebookId === notebookId) this.accepted.delete(key);
  }

  private prune(): void {
    const now = Date.now();
    for (const [proposalId, experiment] of this.pending)
      if (experiment.expiresAt <= now) this.pending.delete(proposalId);
  }

  private key(notebookId: string, cellId: string): string {
    return `${notebookId}\u0000${cellId}`;
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID_RESULT");
  return value as Record<string, unknown>;
}

function parseResult(output: string): Record<string, unknown> {
  const marker = "NOTEBOOKPILOT_RESULT ";
  try {
    const notebookOutputs: unknown = JSON.parse(output);
    if (!Array.isArray(notebookOutputs) || notebookOutputs.length > 100)
      throw new Error("INVALID_RESULT");
    const text = notebookOutputs
      .map((item) => {
        const value = object(item);
        if (value.output_type !== "stream") return "";
        if (typeof value.text === "string") return value.text;
        if (
          Array.isArray(value.text) &&
          value.text.every((line) => typeof line === "string")
        )
          return value.text.join("");
        throw new Error("INVALID_RESULT");
      })
      .join("");
    const lines = text.split(/\r?\n/).filter((line) => line.startsWith(marker));
    if (lines.length !== 1) throw new Error("INVALID_RESULT");
    return object(JSON.parse(lines[0].slice(marker.length)));
  } catch {
    throw new Error("INVALID_RESULT");
  }
}

export class ExperimentRecorder {
  constructor(
    private readonly executions: TrustedExecutionSource,
    private readonly registry: ExperimentRegistry,
    private readonly store: ExperimentStore,
    private readonly notebookKey: (notebookId: string) => string | null,
    private readonly hasDataset: (
      notebookId: string,
      datasetHash: string,
    ) => boolean,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  record(notebookId: string, executionId: string): ExperimentRun {
    const existing = this.store
      .list()
      .find((run) => run.executionId === executionId);
    if (existing) {
      if (existing.notebookKey !== this.notebookKey(notebookId))
        throw new Error("NOT_FOUND");
      return existing;
    }
    const evidence = this.executions.trusted(executionId);
    if (
      evidence.record.notebookId !== notebookId ||
      evidence.targets.length !== 1
    ) {
      throw new Error("NOT_FOUND");
    }
    const target = evidence.targets[0];
    const definition = this.registry.resolve(
      notebookId,
      target.cellId,
      target.source,
    );
    const key = this.notebookKey(notebookId);
    if (!key) throw new Error("NOT_FOUND");
    if (
      evidence.record.status === "pending" ||
      evidence.record.status === "running"
    ) {
      throw new Error("NOT_READY");
    }
    const base = {
      runId: `run_${this.createId()}`,
      executionId,
      notebookKey: key,
      createdAt: this.now().toISOString(),
    };
    if (evidence.record.status !== "succeeded") {
      return this.store.save({
        ...base,
        status: evidence.record.status,
        ...(evidence.record.errorCode
          ? { errorCode: evidence.record.errorCode }
          : {}),
      });
    }
    if (
      evidence.outputs.length !== 1 ||
      !this.hasDataset(notebookId, definition.datasetHash)
    ) {
      throw new Error("DATASET_MISMATCH");
    }
    const result = parseResult(evidence.outputs[0]);
    const versions = object(result.versions);
    const packages = object(versions.pythonPackages);
    if (
      result.schemaVersion !== 1 ||
      result.status !== "succeeded" ||
      result.datasetHash !== definition.datasetHash ||
      result.target !== definition.target ||
      JSON.stringify(result.features) !== JSON.stringify(definition.features) ||
      result.model !== definition.model
    ) {
      throw new Error("RESULT_MISMATCH");
    }
    return this.store.save({
      ...base,
      status: "succeeded",
      datasetHash: definition.datasetHash,
      target: definition.target,
      features: [...definition.features],
      model: definition.model,
      splitFingerprint: result.splitFingerprint as string,
      seed: result.seed as number,
      testFraction: result.testFraction as number,
      parameters: object(result.parameters) as Record<
        string,
        string | number | boolean
      >,
      versions: {
        pandas: packages.pandas as string,
        scikitLearn: packages.scikitLearn as string,
      },
      metrics: object(result.metrics) as unknown as ExperimentRun["metrics"],
    });
  }
}
