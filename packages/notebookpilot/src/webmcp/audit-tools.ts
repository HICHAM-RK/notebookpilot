import { NotebookAuditor } from "../audit/auditor";
import type { SiteTool } from "./register";
import { boundedEnvelope, validateInput } from "./validation";

const schema = {
  type: "object",
  properties: {
    notebookId: { type: "string", minLength: 1, maxLength: 128 },
  },
  required: ["notebookId"],
  additionalProperties: false,
};

export function createAuditTool(auditor: NotebookAuditor): SiteTool {
  return {
    name: "notebook_audit",
    description:
      "Run bounded heuristic reproducibility checks on currently visible notebook cells. Findings are warnings with source evidence, not a security verdict.",
    inputSchema: schema,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async (input: unknown, { signal }: { signal: AbortSignal }) => {
      let payload: unknown;
      let isError = false;
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        const { notebookId } = validateInput<{ notebookId: string }>(
          input,
          schema,
        );
        payload = await auditor.audit(notebookId);
        if (signal.aborted) throw new Error("CANCELLED");
        return boundedEnvelope(payload);
      } catch (error) {
        const allowed = [
          "INVALID_ARGUMENT",
          "NOT_FOUND",
          "STALE_CELL",
          "CANCELLED",
          "LIMIT_EXCEEDED",
        ];
        const code =
          error instanceof Error && allowed.includes(error.message)
            ? error.message
            : "INTERNAL_ERROR";
        payload = {
          error: {
            code,
            message: code,
            retryable: code === "STALE_CELL",
          },
        };
        isError = true;
      }
      return boundedEnvelope(payload, isError);
    },
  };
}
