import type { ExperimentModel } from "./templates";

export type ExperimentStatus = "succeeded" | "failed" | "cancelled";

export interface ExperimentMetrics {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  confusionMatrix: number[][];
}

export interface ExperimentRun {
  runId: string;
  executionId: string;
  notebookKey: string;
  createdAt: string;
  status: ExperimentStatus;
  errorCode?: string;
  datasetHash?: string;
  target?: string;
  features?: string[];
  model?: ExperimentModel;
  splitFingerprint?: string;
  seed?: number;
  testFraction?: number;
  parameters?: Record<string, string | number | boolean>;
  versions?: { pandas: string; scikitLearn: string };
  metrics?: ExperimentMetrics;
}

export interface ExperimentPersistence {
  read(): string | null;
  write(value: string): void;
}

export interface ComparedRun extends ExperimentRun {
  rank: number | null;
}

export interface ExperimentComparison {
  runs: ComparedRun[];
  compatible: boolean;
  reasons: string[];
}

const MAX_STORED_BYTES = 1024 * 1024;
const MAX_RUNS = 100;
const encoder = new TextEncoder();
const opaqueId = /^[A-Za-z0-9_-]{1,128}$/;
const hash = /^[a-f0-9]{64}$/;

function fail(code: string): never {
  throw new Error(code);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validText(value: unknown, max: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= max &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function validMetric(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function validateMetrics(value: unknown): value is ExperimentMetrics {
  if (!isPlainObject(value)) return false;
  const keys = [
    "accuracy",
    "macroPrecision",
    "macroRecall",
    "macroF1",
    "confusionMatrix",
  ];
  if (
    Object.keys(value).some((key) => !keys.includes(key)) ||
    !keys.every((key) => Object.hasOwn(value, key)) ||
    !validMetric(value.accuracy) ||
    !validMetric(value.macroPrecision) ||
    !validMetric(value.macroRecall) ||
    !validMetric(value.macroF1) ||
    !Array.isArray(value.confusionMatrix) ||
    value.confusionMatrix.length < 2 ||
    value.confusionMatrix.length > 100
  ) {
    return false;
  }
  const size = value.confusionMatrix.length;
  return value.confusionMatrix.every(
    (row) =>
      Array.isArray(row) &&
      row.length === size &&
      row.every((cell) => Number.isSafeInteger(cell) && (cell as number) >= 0),
  );
}

function validateParameters(
  value: unknown,
): value is Record<string, string | number | boolean> {
  return (
    isPlainObject(value) &&
    Object.keys(value).length <= 20 &&
    Object.entries(value).every(
      ([key, item]) =>
        validText(key, 128) &&
        ((typeof item === "string" && item.length <= 256) ||
          (typeof item === "number" && Number.isFinite(item)) ||
          typeof item === "boolean"),
    )
  );
}

function validateRun(value: unknown): ExperimentRun {
  if (!isPlainObject(value)) fail("INVALID_RECORD");
  const allowed = [
    "runId",
    "executionId",
    "notebookKey",
    "createdAt",
    "status",
    "errorCode",
    "datasetHash",
    "target",
    "features",
    "model",
    "splitFingerprint",
    "seed",
    "testFraction",
    "parameters",
    "versions",
    "metrics",
  ];
  if (
    Object.keys(value).some((key) => !allowed.includes(key)) ||
    typeof value.runId !== "string" ||
    !opaqueId.test(value.runId) ||
    typeof value.executionId !== "string" ||
    !opaqueId.test(value.executionId) ||
    !validText(value.notebookKey, 512) ||
    typeof value.createdAt !== "string" ||
    !["succeeded", "failed", "cancelled"].includes(value.status as string)
  ) {
    fail("INVALID_RECORD");
  }
  const timestamp = new Date(value.createdAt);
  if (
    !Number.isFinite(timestamp.valueOf()) ||
    timestamp.toISOString() !== value.createdAt
  )
    fail("INVALID_RECORD");
  if (value.status !== "succeeded") {
    const successOnly = [
      "datasetHash",
      "target",
      "features",
      "model",
      "splitFingerprint",
      "seed",
      "testFraction",
      "parameters",
      "versions",
      "metrics",
    ];
    if (
      successOnly.some((key) => Object.hasOwn(value, key)) ||
      (value.errorCode !== undefined && !validText(value.errorCode, 128))
    ) {
      fail("INVALID_RECORD");
    }
    return structuredClone(value) as unknown as ExperimentRun;
  }
  if (
    typeof value.datasetHash !== "string" ||
    !hash.test(value.datasetHash) ||
    !validText(value.target, 256) ||
    !Array.isArray(value.features) ||
    value.features.length < 1 ||
    value.features.length > 100 ||
    !value.features.every((item) => validText(item, 256)) ||
    new Set(value.features).size !== value.features.length ||
    value.features.includes(value.target) ||
    (value.model !== "logistic_regression" &&
      value.model !== "random_forest") ||
    typeof value.splitFingerprint !== "string" ||
    !hash.test(value.splitFingerprint) ||
    value.seed !== 42 ||
    value.testFraction !== 0.2 ||
    value.errorCode !== undefined ||
    !validateParameters(value.parameters) ||
    !isPlainObject(value.versions) ||
    Object.keys(value.versions).some(
      (key) => key !== "pandas" && key !== "scikitLearn",
    ) ||
    !validText(value.versions.pandas, 64) ||
    !validText(value.versions.scikitLearn, 64) ||
    !validateMetrics(value.metrics)
  ) {
    fail("INVALID_RECORD");
  }
  return structuredClone(value) as unknown as ExperimentRun;
}

function serialize(runs: ExperimentRun[]): string {
  const value = JSON.stringify({ schemaVersion: 1, runs });
  if (encoder.encode(value).length > MAX_STORED_BYTES) fail("LIMIT_EXCEEDED");
  return value;
}

function parseStored(value: string): ExperimentRun[] {
  if (encoder.encode(value).length > MAX_STORED_BYTES) fail("INVALID_STORAGE");
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !isPlainObject(parsed) ||
      Object.keys(parsed).some(
        (key) => key !== "schemaVersion" && key !== "runs",
      ) ||
      parsed.schemaVersion !== 1 ||
      !Array.isArray(parsed.runs) ||
      parsed.runs.length > MAX_RUNS
    ) {
      fail("INVALID_STORAGE");
    }
    const runs = parsed.runs.map(validateRun);
    if (
      new Set(runs.map((run) => run.runId)).size !== runs.length ||
      new Set(runs.map((run) => run.executionId)).size !== runs.length
    ) {
      fail("INVALID_STORAGE");
    }
    return runs;
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_STORAGE")
      throw error;
    throw new Error("INVALID_STORAGE");
  }
}

export class ExperimentStore {
  private runs: ExperimentRun[];
  private readonly listeners = new Set<() => void>();
  storageError: "STORAGE_FAILED" | "INVALID_STORAGE" | null = null;

  constructor(private readonly persistence: ExperimentPersistence) {
    const stored = persistence.read();
    this.runs = stored === null ? [] : parseStored(stored);
  }

  list(notebookKey?: string): ExperimentRun[] {
    return this.runs
      .filter(
        (run) => notebookKey === undefined || run.notebookKey === notebookKey,
      )
      .map((run) => structuredClone(run));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get(runId: string): ExperimentRun {
    if (!opaqueId.test(runId)) fail("INVALID_ARGUMENT");
    const run = this.runs.find((candidate) => candidate.runId === runId);
    if (!run) fail("NOT_FOUND");
    return structuredClone(run);
  }

  save(value: ExperimentRun): ExperimentRun {
    const run = validateRun(value);
    if (this.runs.some((item) => item.runId === run.runId))
      fail("DUPLICATE_RUN");
    if (this.runs.some((item) => item.executionId === run.executionId))
      fail("DUPLICATE_EXECUTION");
    if (this.runs.length >= MAX_RUNS) fail("LIMIT_EXCEEDED");
    const next = [...this.runs, run];
    this.commit(next);
    return structuredClone(run);
  }

  remove(runId: string): void {
    if (!opaqueId.test(runId)) fail("INVALID_ARGUMENT");
    if (!this.runs.some((run) => run.runId === runId)) fail("NOT_FOUND");
    this.commit(this.runs.filter((run) => run.runId !== runId));
  }

  export(runIds: string[]): string {
    if (
      !Array.isArray(runIds) ||
      runIds.length < 1 ||
      runIds.length > 100 ||
      new Set(runIds).size !== runIds.length
    ) {
      fail("INVALID_ARGUMENT");
    }
    return serialize(runIds.map((runId) => this.get(runId)));
  }

  compare(runIds: string[]): ExperimentComparison {
    if (
      !Array.isArray(runIds) ||
      runIds.length < 2 ||
      runIds.length > 10 ||
      new Set(runIds).size !== runIds.length
    ) {
      fail("INVALID_ARGUMENT");
    }
    const selected = runIds.map((runId) => this.get(runId));
    const reasons: string[] = [];
    if (selected.some((run) => run.status !== "succeeded")) {
      reasons.push("Only successful runs can be ranked.");
    } else {
      const first = selected[0];
      const differs = <K extends keyof ExperimentRun>(key: K) =>
        selected
          .slice(1)
          .some(
            (run) => JSON.stringify(run[key]) !== JSON.stringify(first[key]),
          );
      if (differs("datasetHash")) reasons.push("Datasets differ.");
      if (differs("target")) reasons.push("Targets differ.");
      if (differs("features")) reasons.push("Selected features differ.");
      if (differs("splitFingerprint")) reasons.push("Dataset split differs.");
      if (differs("seed") || differs("testFraction"))
        reasons.push("Split settings differ.");
      if (differs("versions")) reasons.push("Runtime versions differ.");
    }
    const compatible = reasons.length === 0;
    const ranked = compatible
      ? [...selected].sort(
          (left, right) => right.metrics!.macroF1 - left.metrics!.macroF1,
        )
      : selected;
    return {
      compatible,
      reasons,
      runs: ranked.map((run, index) => ({
        ...structuredClone(run),
        rank: compatible ? index + 1 : null,
      })),
    };
  }

  private commit(next: ExperimentRun[]): void {
    const serialized = serialize(next);
    try {
      this.persistence.write(serialized);
    } catch {
      this.storageError = "STORAGE_FAILED";
      fail("STORAGE_FAILED");
    }
    this.runs = next;
    this.storageError = null;
    for (const listener of this.listeners) listener();
  }
}
