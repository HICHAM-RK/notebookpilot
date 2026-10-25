import {
  ExperimentStore,
  type ExperimentPersistence,
  type ExperimentRun,
} from "../src/experiments/store";

class MemoryPersistence implements ExperimentPersistence {
  value: string | null = null;
  fail = false;

  read(): string | null {
    return this.value;
  }

  write(value: string): void {
    if (this.fail) throw new DOMException("quota", "QuotaExceededError");
    this.value = value;
  }
}

const successful = (overrides: Partial<ExperimentRun> = {}): ExperimentRun => ({
  runId: "run-one",
  executionId: "execution-one",
  notebookKey: "welcome.ipynb",
  createdAt: "2026-10-25T00:00:00.000Z",
  status: "succeeded",
  datasetHash: "a".repeat(64),
  target: "target",
  features: ["age", "segment"],
  model: "logistic_regression",
  splitFingerprint: "b".repeat(64),
  seed: 42,
  testFraction: 0.2,
  parameters: { max_iter: 1000, random_state: 42 },
  versions: { pandas: "3.0.2", scikitLearn: "1.8.0" },
  metrics: {
    accuracy: 0.8,
    macroPrecision: 0.81,
    macroRecall: 0.79,
    macroF1: 0.8,
    confusionMatrix: [
      [2, 1],
      [0, 2],
    ],
  },
  ...overrides,
});

test("persists versioned runs and restores independent copies", () => {
  const persistence = new MemoryPersistence();
  const first = new ExperimentStore(persistence);
  first.save(successful());
  const second = new ExperimentStore(persistence);
  const restored = second.list("welcome.ipynb");
  expect(restored).toEqual([successful()]);
  restored[0].features?.push("mutated");
  expect(second.list("welcome.ipynb")[0].features).toEqual(["age", "segment"]);
  expect(JSON.parse(persistence.value!)).toMatchObject({ schemaVersion: 1 });
});

test("storage failure is atomic and remains visible", () => {
  const persistence = new MemoryPersistence();
  const store = new ExperimentStore(persistence);
  store.save(successful());
  persistence.fail = true;
  expect(() =>
    store.save(successful({ runId: "run-two", executionId: "execution-two" })),
  ).toThrow("STORAGE_FAILED");
  expect(store.list()).toHaveLength(1);
  expect(store.storageError).toBe("STORAGE_FAILED");
});

test("failed and cancelled executions persist but are never ranked", () => {
  const store = new ExperimentStore(new MemoryPersistence());
  store.save(successful());
  store.save({
    runId: "run-failed",
    executionId: "execution-failed",
    notebookKey: "welcome.ipynb",
    createdAt: "2026-10-25T00:01:00.000Z",
    status: "failed",
    errorCode: "EXECUTION_FAILED",
  });
  const comparison = store.compare(["run-one", "run-failed"]);
  expect(comparison.compatible).toBe(false);
  expect(comparison.reasons).toContain("Only successful runs can be ranked.");
  expect(comparison.runs.every((run) => run.rank === null)).toBe(true);
});

test("ranks compatible runs by macro F1 and explains exact mismatches", () => {
  const store = new ExperimentStore(new MemoryPersistence());
  store.save(successful());
  store.save(
    successful({
      runId: "run-two",
      executionId: "execution-two",
      model: "random_forest",
      metrics: {
        ...successful().metrics!,
        macroF1: 0.9,
      },
    }),
  );
  expect(store.compare(["run-one", "run-two"])).toMatchObject({
    compatible: true,
    reasons: [],
    runs: [
      { runId: "run-two", rank: 1 },
      { runId: "run-one", rank: 2 },
    ],
  });

  store.save(
    successful({
      runId: "run-three",
      executionId: "execution-three",
      features: ["age"],
      splitFingerprint: "c".repeat(64),
    }),
  );
  const mismatch = store.compare(["run-one", "run-three"]);
  expect(mismatch.compatible).toBe(false);
  expect(mismatch.reasons).toEqual([
    "Selected features differ.",
    "Dataset split differs.",
  ]);
});

test("rejects forged identifiers, duplicate executions and malformed persisted data", () => {
  const persistence = new MemoryPersistence();
  const store = new ExperimentStore(persistence);
  expect(() => store.save(successful({ runId: "../forged" }))).toThrow(
    "INVALID_RECORD",
  );
  store.save(successful());
  expect(() => store.save(successful({ runId: "run-other" }))).toThrow(
    "DUPLICATE_EXECUTION",
  );
  persistence.value = '{"schemaVersion":1,"runs":[{"status":"succeeded"}]}';
  expect(() => new ExperimentStore(persistence)).toThrow("INVALID_STORAGE");
});

test("deletes and exports records without raw dataset rows", () => {
  const store = new ExperimentStore(new MemoryPersistence());
  store.save(successful());
  const exported = JSON.parse(store.export(["run-one"]));
  expect(exported).toMatchObject({
    schemaVersion: 1,
    runs: [{ runId: "run-one" }],
  });
  expect(JSON.stringify(exported)).not.toContain("Ada");
  store.remove("run-one");
  expect(store.list()).toEqual([]);
});
