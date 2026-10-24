import { PolicyStore } from "../control/policy";
import { ExperimentRecorder } from "../experiments/record";
import { ExperimentStore } from "../experiments/store";
import type { SiteTool } from "./register";

const idSchema = { type: "string", minLength: 1, maxLength: 128 };
const opaqueId = /^[A-Za-z0-9_-]{1,128}$/;

function envelope(payload: unknown, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
    ...(isError ? { isError: true } : {}),
  };
}

function closed(input: unknown, keys: string[]): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(input, key))
  ) {
    throw new Error("INVALID_ARGUMENT");
  }
  return input as Record<string, unknown>;
}

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
  return envelope(
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
    inputSchema: {
      type: "object",
      properties: { notebookId: idSchema, executionId: idSchema },
      required: ["notebookId", "executionId"],
      additionalProperties: false,
    },
    execute: async (input, { signal }) => {
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        const args = closed(input, ["notebookId", "executionId"]);
        if (
          typeof args.notebookId !== "string" ||
          !opaqueId.test(args.notebookId) ||
          typeof args.executionId !== "string" ||
          !opaqueId.test(args.executionId)
        ) {
          throw new Error("INVALID_ARGUMENT");
        }
        const current = active();
        if (
          !current ||
          current.notebookId !== args.notebookId ||
          !policies.canRead(args.notebookId)
        ) {
          throw new Error("NOT_FOUND");
        }
        const run = recorder.record(args.notebookId, args.executionId);
        return envelope({ runId: run.runId, status: run.status });
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
    inputSchema: {
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
    },
    execute: async (input, { signal }) => {
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        const args = closed(input, ["runIds"]);
        if (
          !Array.isArray(args.runIds) ||
          args.runIds.length < 2 ||
          args.runIds.length > 10 ||
          !args.runIds.every(
            (runId) => typeof runId === "string" && opaqueId.test(runId),
          ) ||
          new Set(args.runIds).size !== args.runIds.length
        ) {
          throw new Error("INVALID_ARGUMENT");
        }
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
        if (
          new TextEncoder().encode(JSON.stringify(payload)).length >
          50 * 1024
        )
          throw new Error("LIMIT_EXCEEDED");
        return envelope(payload);
      } catch (error) {
        return errorResult(error);
      }
    },
  };
  return [record, compare];
}
