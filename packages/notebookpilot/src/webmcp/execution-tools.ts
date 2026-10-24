import { ExecutionQueue } from "../notebook/execution";
import type { SiteTool } from "./register";

const idSchema = { type: "string", minLength: 1, maxLength: 128 };
function closed(input: unknown, keys: string[]): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(input, key))
  )
    throw new Error("INVALID_ARGUMENT");
  return input as Record<string, unknown>;
}
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
    inputSchema: run
      ? {
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
        }
      : {
          type: "object",
          properties: { requestId: idSchema },
          required: ["requestId"],
          additionalProperties: false,
        },
    execute: async (input: unknown, { signal }: { signal: AbortSignal }) => {
      let payload: unknown;
      let isError = false;
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        if (run) {
          const args = closed(input, ["notebookId", "cells"]);
          if (
            typeof args.notebookId !== "string" ||
            !Array.isArray(args.cells) ||
            args.cells.length < 1 ||
            args.cells.length > 20
          )
            throw new Error("INVALID_ARGUMENT");
          const cells = args.cells.map((value) => {
            const cell = closed(value, ["cellId", "expectedSourceHash"]);
            if (
              typeof cell.cellId !== "string" ||
              typeof cell.expectedSourceHash !== "string"
            )
              throw new Error("INVALID_ARGUMENT");
            return {
              cellId: cell.cellId,
              expectedSourceHash: cell.expectedSourceHash,
            };
          });
          payload = await queue.request(args.notebookId, cells, signal);
        } else {
          const args = closed(input, ["requestId"]);
          if (
            typeof args.requestId !== "string" ||
            !args.requestId ||
            args.requestId.length > 128
          )
            throw new Error("INVALID_ARGUMENT");
          const result = queue.get(args.requestId);
          payload = { status: result.status, cells: result.cells };
        }
        const bytes = new TextEncoder().encode(
          JSON.stringify({
            content: [{ type: "text", text: JSON.stringify(payload) }],
            structuredContent: payload,
          }),
        ).length;
        if (bytes > 50 * 1024) throw new Error("LIMIT_EXCEEDED");
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
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload,
        ...(isError ? { isError: true } : {}),
      };
    },
  }));
}
