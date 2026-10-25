import type { UpdateProposal } from "../src/control/proposals";
import type { ExecutionRecord } from "../src/notebook/execution";
import {
  ExperimentRecorder,
  ExperimentRegistry,
  type TrustedExecutionSource,
} from "../src/experiments/record";
import {
  ExperimentStore,
  type ExperimentPersistence,
} from "../src/experiments/store";
import {
  generateTrainingCell,
  type ExperimentSelection,
} from "../src/experiments/templates";

class MemoryPersistence implements ExperimentPersistence {
  value: string | null = null;
  read() {
    return this.value;
  }
  write(value: string) {
    this.value = value;
  }
}

const selection: ExperimentSelection = {
  datasetHash: "a".repeat(64),
  fileName: "notebookpilot-data.csv",
  target: "target",
  features: ["age", "segment"],
  model: "logistic_regression",
};

function setup(status: ExecutionRecord["status"] = "succeeded") {
  const source = generateTrainingCell(selection);
  const proposal: UpdateProposal = {
    proposalId: "proposal-one",
    notebookId: "notebook-one",
    cellId: "cell-one",
    original: "",
    source,
    expiresAt: Date.now() + 1000,
    status: "pending",
  };
  const registry = new ExperimentRegistry();
  registry.register(proposal, selection);
  proposal.status = "accepted";
  registry.settle(proposal);
  const result = {
    schemaVersion: 1,
    status: "succeeded",
    datasetHash: selection.datasetHash,
    target: selection.target,
    features: selection.features,
    model: selection.model,
    splitFingerprint: "b".repeat(64),
    seed: 42,
    testFraction: 0.2,
    parameters: { max_iter: 1000, random_state: 42 },
    versions: {
      pythonPackages: { pandas: "3.0.2", scikitLearn: "1.8.0" },
    },
    metrics: {
      accuracy: 0.8,
      macroPrecision: 0.8,
      macroRecall: 0.8,
      macroF1: 0.8,
      confusionMatrix: [
        [2, 1],
        [0, 2],
      ],
    },
  };
  const evidence = {
    record: {
      requestId: "execution-one",
      notebookId: "notebook-one",
      status,
      cells: [],
      ...(status === "failed" ? { errorCode: "EXECUTION_FAILED" } : {}),
    } as ExecutionRecord,
    targets: [{ cellId: "cell-one", source }],
    outputs: [
      JSON.stringify([
        {
          output_type: "stream",
          name: "stdout",
          text: `NOTEBOOKPILOT_RESULT ${JSON.stringify(result)}\n`,
        },
      ]),
    ],
  };
  const executions: TrustedExecutionSource = { trusted: () => evidence };
  const store = new ExperimentStore(new MemoryPersistence());
  const recorder = new ExperimentRecorder(
    executions,
    registry,
    store,
    () => "welcome.ipynb",
    (_, datasetHash) => datasetHash === selection.datasetHash,
    () => "fixed",
    () => new Date("2026-10-25T00:00:00.000Z"),
  );
  return { evidence, proposal, recorder, registry, result, source, store };
}

test("records a successful result only from its bound app-generated cell", () => {
  const { recorder } = setup();
  expect(recorder.record("notebook-one", "execution-one")).toMatchObject({
    runId: "run_fixed",
    executionId: "execution-one",
    notebookKey: "welcome.ipynb",
    status: "succeeded",
    datasetHash: selection.datasetHash,
    target: "target",
    features: ["age", "segment"],
    metrics: { macroF1: 0.8 },
  });
});

test("rejects copied cells, changed provenance and missing datasets", () => {
  const copied = setup();
  copied.evidence.targets[0].cellId = "copied-cell";
  expect(() => copied.recorder.record("notebook-one", "execution-one")).toThrow(
    "UNTRUSTED_EXECUTION",
  );

  const changed = setup();
  changed.result.datasetHash = "c".repeat(64);
  changed.evidence.outputs[0] = JSON.stringify([
    {
      output_type: "stream",
      name: "stdout",
      text: `NOTEBOOKPILOT_RESULT ${JSON.stringify(changed.result)}\n`,
    },
  ]);
  expect(() =>
    changed.recorder.record("notebook-one", "execution-one"),
  ).toThrow("RESULT_MISMATCH");

  const missing = setup();
  const recorder = new ExperimentRecorder(
    { trusted: () => missing.evidence },
    missing.registry,
    missing.store,
    () => "welcome.ipynb",
    () => false,
  );
  expect(() => recorder.record("notebook-one", "execution-one")).toThrow(
    "DATASET_MISMATCH",
  );
});

test("persists a trusted failed execution without ranking fields", () => {
  const { recorder, store } = setup("failed");
  const run = recorder.record("notebook-one", "execution-one");
  expect(run).toMatchObject({
    status: "failed",
    errorCode: "EXECUTION_FAILED",
  });
  expect(run).not.toHaveProperty("metrics");
  expect(store.list()).toEqual([run]);
});

test("recording is idempotent by execution ID", () => {
  const { recorder, store } = setup();
  const first = recorder.record("notebook-one", "execution-one");
  const second = recorder.record("notebook-one", "execution-one");
  expect(second).toEqual(first);
  expect(store.list()).toHaveLength(1);
});
