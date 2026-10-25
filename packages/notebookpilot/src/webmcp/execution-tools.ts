import { ExecutionQueue } from "../notebook/execution";
import type { SiteTool } from "./register";
import { boundedEnvelope, validateInput } from "./validation";

const idSchema = { type: "string", minLength: 1, maxLength: 128 };
const runSchema = {
  type: "object",
  properties: {
    notebookId: idSchema,
    cells: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cellId: idSchema,
          expectedSourceHash: {
            type: "string",
            pattern: "^[a-f0-9]{64}$",
          },
        },
        required: ["cellId", "expectedSourceHash"],
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 20,
    },
  },
  required: ["notebookId", "cells"],
  additionalProperties: false,
};
const statusSchema = {
  type: "object",
  properties: { requestId: idSchema },
  required: ["requestId"],
  additionalProperties: false,
};
export function createExecutionTools(queue: ExecutionQueue): SiteTool[] {
  return [true, false].map((run) => ({
    name: run ? "notebook_run_cells" : "notebook_get_execution",
    description: run
      ? "Request execution of visible code cells. This returns pending; only the human can approve execution through the UI."
      : "Read execution status and bounded untrusted output. This never approves execution.",
    annotations: {
      readOnlyHint: !run,
      untrustedContentHint: true,
      consequentialHint: false,
    },
    inputSchema: run ? runSchema : statusSchema,
    execute: async (input: unknown, { signal }: { signal: AbortSignal }) => {
      let payload: unknown;
      let isError = false;
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        if (run) {
          const args = validateInput<{
            notebookId: string;
            cells: { cellId: string; expectedSourceHash: string }[];
          }>(input, runSchema);
          const cells = args.cells;
          payload = await queue.request(args.notebookId, cells, signal);
        } else {
          const args = validateInput<{ requestId: string }>(
            input,
            statusSchema,
          );
          const result = queue.get(args.requestId);
          payload = { status: result.status, cells: result.cells };
        }
        return boundedEnvelope(payload);
      } catch (error) {
        const allowed = [
          "INVALID_ARGUMENT",
          "CANCELLED",
          "NOT_FOUND",
          "ACCESS_DENIED",
          "LIMIT_EXCEEDED",
          "STALE_CELL",
          "KERNEL_UNAVAILABLE",
        ];
        const code =
          error instanceof Error && allowed.includes(error.message)
            ? error.message
            : "INTERNAL_ERROR";
        payload = {
          error: { code, message: code, retryable: code === "STALE_CELL" },
        };
        isError = true;
      }
      return boundedEnvelope(payload, isError);
    },
  }));
}
