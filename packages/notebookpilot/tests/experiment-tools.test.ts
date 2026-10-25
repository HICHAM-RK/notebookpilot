import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PolicyStore } from "../src/control/policy";
import { ExperimentRecorder } from "../src/experiments/record";
import {
  ExperimentStore,
  type ExperimentPersistence,
  type ExperimentRun,
} from "../src/experiments/store";
import { createExperimentTools } from "../src/webmcp/experiment-tools";

class MemoryPersistence implements ExperimentPersistence {
  value: string | null = null;
  read() {
    return this.value;
  }
  write(value: string) {
    this.value = value;
  }
}

const run = (id: string): ExperimentRun => ({
  runId: id,
  executionId: `execution-${id}`,
  notebookKey: "welcome.ipynb",
  createdAt: "2026-10-25T00:00:00.000Z",
  status: "failed",
  errorCode: "EXECUTION_FAILED",
});

function setup() {
  const store = new ExperimentStore(new MemoryPersistence());
  store.save(run("run-one"));
  store.save(run("run-two"));
  const policies = new PolicyStore();
  policies.setNotebook("notebook-one", "read");
  const recorder = {
    record: jest.fn(() => run("run-recorded")),
  } as unknown as ExperimentRecorder;
  const tools = createExperimentTools(recorder, store, policies, () => ({
    notebookId: "notebook-one",
    notebookKey: "welcome.ipynb",
  }));
  return { policies, recorder, tools };
}

const options = (signal = new AbortController().signal) => ({ signal });

test("schemas match the checked-in contracts and reject extra authority", async () => {
  const { tools } = setup();
  const contract = JSON.parse(
    readFileSync(resolve(__dirname, "../../../contracts/tools.json"), "utf8"),
  );
  for (const tool of tools) {
    expect(tool.inputSchema).toEqual(
      contract.tools.find((entry: { name: string }) => entry.name === tool.name)
        .inputSchema,
    );
  }
  const result = await tools[0].execute(
    { notebookId: "notebook-one", executionId: "execution-one", approve: true },
    options(),
  );
  expect(
    (result as { structuredContent: unknown }).structuredContent,
  ).toMatchObject({
    error: { code: "INVALID_ARGUMENT" },
  });
});

test("records only in the active readable notebook and compares without ranking failures", async () => {
  const { policies, recorder, tools } = setup();
  const recorded = await tools[0].execute(
    { notebookId: "notebook-one", executionId: "execution-one" },
    options(),
  );
  expect(
    (recorded as { structuredContent: unknown }).structuredContent,
  ).toEqual({
    runId: "run-recorded",
    status: "failed",
  });
  expect(recorder.record).toHaveBeenCalledWith("notebook-one", "execution-one");

  const compared = await tools[1].execute(
    { runIds: ["run-one", "run-two"] },
    options(),
  );
  expect(
    (compared as { structuredContent: unknown }).structuredContent,
  ).toMatchObject({
    compatible: false,
    reasons: ["Only successful runs can be ranked."],
    runs: [{ rank: null }, { rank: null }],
  });

  policies.setNotebook("notebook-one", "hidden");
  const hidden = await tools[1].execute(
    { runIds: ["run-one", "run-two"] },
    options(),
  );
  expect(
    (hidden as { structuredContent: unknown }).structuredContent,
  ).toMatchObject({
    error: { code: "NOT_FOUND" },
  });
});
