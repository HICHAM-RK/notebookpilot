import { UpdateProposals } from "../control/proposals";
import type { SiteTool } from "./register";

export function createUpdateTool(proposals: UpdateProposals): SiteTool {
  return {
    name: "notebook_propose_update",
    description:
      "Propose a replacement for a visible writable cell. The human must review and accept it. This never executes code and cannot approve itself.",
    inputSchema: {
      type: "object",
      properties: {
        notebookId: { type: "string", minLength: 1, maxLength: 128 },
        cellId: { type: "string", minLength: 1, maxLength: 128 },
        expectedSourceHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
        source: { type: "string", maxLength: 262144, "x-maxUtf8Bytes": 262144 },
      },
      required: ["notebookId", "cellId", "expectedSourceHash", "source"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
      consequentialHint: false,
    },
    execute: async (input, { signal }) => {
      let payload: unknown;
      let isError = false;
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        const keys = ["notebookId", "cellId", "expectedSourceHash", "source"];
        if (
          !input ||
          typeof input !== "object" ||
          Array.isArray(input) ||
          Object.keys(input).some((key) => !keys.includes(key))
        )
          throw new Error("INVALID_ARGUMENT");
        const args = input as Record<string, unknown>;
        if (keys.some((key) => typeof args[key] !== "string"))
          throw new Error("INVALID_ARGUMENT");
        const proposal = await proposals.propose(
          args.notebookId as string,
          args.cellId as string,
          args.expectedSourceHash as string,
          args.source as string,
          signal,
        );
        payload = { proposalId: proposal.proposalId, status: proposal.status };
      } catch (error) {
        const allowed = [
          "INVALID_ARGUMENT",
          "LIMIT_EXCEEDED",
          "ACCESS_DENIED",
          "NOT_FOUND",
          "STALE_CELL",
          "CANCELLED",
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
  };
}
