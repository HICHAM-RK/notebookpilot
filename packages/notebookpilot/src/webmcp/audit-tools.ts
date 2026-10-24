import { AuditError, NotebookAuditor } from "../audit/auditor";
import type { SiteTool } from "./register";

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
        if (
          !input ||
          typeof input !== "object" ||
          Array.isArray(input) ||
          Object.keys(input).some((key) => key !== "notebookId") ||
          !Object.hasOwn(input, "notebookId")
        )
          throw new AuditError("INVALID_ARGUMENT");
        const notebookId = (input as Record<string, unknown>).notebookId;
        if (
          typeof notebookId !== "string" ||
          !notebookId ||
          notebookId.length > 128
        )
          throw new AuditError("INVALID_ARGUMENT");
        payload = await auditor.audit(notebookId);
        if (signal.aborted) throw new Error("CANCELLED");
        const resultBytes = new TextEncoder().encode(
          JSON.stringify({
            content: [{ type: "text", text: JSON.stringify(payload) }],
            structuredContent: payload,
          }),
        ).length;
        if (resultBytes > 50 * 1024) throw new Error("LIMIT_EXCEEDED");
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
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload,
        ...(isError ? { isError: true } : {}),
      };
    },
  };
}
