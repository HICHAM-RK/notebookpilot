import { PolicyStore } from "../control/policy";
import { ExperimentRecorder } from "../experiments/record";
import { ExperimentStore } from "../experiments/store";
import type { SiteTool } from "./register";
import { boundedEnvelope, validateInput } from "./validation";

const idSchema = { type: "string", minLength: 1, maxLength: 128 };
const recordSchema = {
  type: "object",
  properties: { notebookId: idSchema, executionId: idSchema },
  required: ["notebookId", "executionId"],
  additionalProperties: false,
};
const compareSchema = {
  type: "object",
  properties: {
    runIds: {
      type: "array",
      items: idSchema,
      minItems: 2,
      maxItems: 10,
      uniqueItems: true,
    },
  },
  required: ["runIds"],
  additionalProperties: false,
};

function errorResult(error: unknown) {
  const allowed = [
    "INVALID_ARGUMENT",
    "NOT_FOUND",
    "NOT_READY",
    "UNTRUSTED_EXECUTION",
    "INVALID_RESULT",
    "RESULT_MISMATCH",
    "DATASET_MISMATCH",
    "STORAGE_FAILED",
    "LIMIT_EXCEEDED",
    "CANCELLED",
  ];
  let code =
    error instanceof Error && allowed.includes(error.message)
      ? error.message
      : "INTERNAL_ERROR";
  if (
    code === "UNTRUSTED_EXECUTION" ||
    code === "RESULT_MISMATCH" ||
    code === "DATASET_MISMATCH"
  )
    code = "NOT_FOUND";
  return boundedEnvelope(
    { error: { code, message: code, retryable: code === "NOT_READY" } },
    true,
  );
}

export function createExperimentTools(
  recorder: ExperimentRecorder,
  store: ExperimentStore,
  policies: PolicyStore,
  active: () => { notebookId: string; notebookKey: string } | null,
): SiteTool[] {
  const record: SiteTool = {
    name: "experiment_record",
    description:
      "Persist a completed app-generated experiment from its approved execution record. Imported or copied output is not trusted.",
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    inputSchema: recordSchema,
    execute: async (input, { signal }) => {
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        const args = validateInput<{
          notebookId: string;
          executionId: string;
        }>(input, recordSchema);
        const current = active();
        if (
          !current ||
          current.notebookId !== args.notebookId ||
          !policies.canRead(args.notebookId)
        ) {
          throw new Error("NOT_FOUND");
        }
        const run = recorder.record(args.notebookId, args.executionId);
        return boundedEnvelope({ runId: run.runId, status: run.status });
      } catch (error) {
        return errorResult(error);
      }
    },
  };

  const compare: SiteTool = {
    name: "experiment_compare",
    description:
      "Compare two to ten persisted experiment runs. Incompatible or unsuccessful runs are returned without ranking.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: compareSchema,
    execute: async (input, { signal }) => {
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        const args = validateInput<{ runIds: string[] }>(input, compareSchema);
        const current = active();
        if (!current || !policies.canRead(current.notebookId))
          throw new Error("NOT_FOUND");
        const runs = args.runIds.map((runId) => store.get(runId));
        if (runs.some((run) => run.notebookKey !== current.notebookKey))
          throw new Error("NOT_FOUND");
        const comparison = store.compare(args.runIds);
        const payload = {
          ...comparison,
          runs: comparison.runs.map(
            ({ notebookKey: _notebookKey, ...run }) => run,
          ),
        };
        return boundedEnvelope(payload);
      } catch (error) {
        return errorResult(error);
      }
    },
  };
  return [record, compare];
}
