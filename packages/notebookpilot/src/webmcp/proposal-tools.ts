import { UpdateProposals } from "../control/proposals";
import type { SiteTool } from "./register";
import { boundedEnvelope, validateInput } from "./validation";

const statusSchema = {
  type: "object",
  properties: {
    proposalId: { type: "string", minLength: 1, maxLength: 128 },
  },
  required: ["proposalId"],
  additionalProperties: false,
};

const insertSchema = {
  type: "object",
  properties: {
    notebookId: { type: "string", minLength: 1, maxLength: 128 },
    afterCellId: {
      anyOf: [
        { type: "string", minLength: 1, maxLength: 128 },
        { type: "null" },
      ],
    },
    cellType: { enum: ["code", "markdown"] },
    source: {
      type: "string",
      maxLength: 262144,
      "x-maxUtf8Bytes": 262144,
    },
  },
  required: ["notebookId", "afterCellId", "cellType", "source"],
  additionalProperties: false,
};

const updateSchema = {
  type: "object",
  properties: {
    notebookId: { type: "string", minLength: 1, maxLength: 128 },
    cellId: { type: "string", minLength: 1, maxLength: 128 },
    expectedSourceHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    source: {
      type: "string",
      maxLength: 262144,
      "x-maxUtf8Bytes": 262144,
    },
  },
  required: ["notebookId", "cellId", "expectedSourceHash", "source"],
  additionalProperties: false,
};

export function createProposalStatusTool(proposals: UpdateProposals): SiteTool {
  return {
    name: "notebook_get_proposal",
    description:
      "Read a proposal outcome. This cannot approve, reject, edit or execute anything. Hidden or closed targets are unavailable.",
    inputSchema: statusSchema,
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async (input, { signal }) => {
      let payload: unknown;
      let isError = false;
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        const args = validateInput<{ proposalId: string }>(input, statusSchema);
        payload = proposals.status(args.proposalId);
      } catch (error) {
        const code =
          error instanceof Error &&
          ["NOT_FOUND", "INVALID_ARGUMENT", "CANCELLED"].includes(error.message)
            ? error.message
            : "INTERNAL_ERROR";
        payload = { error: { code, message: code, retryable: false } };
        isError = true;
      }
      return boundedEnvelope(payload, isError);
    },
  };
}

export function createUpdateTool(proposals: UpdateProposals): SiteTool {
  return createEditTool(proposals, false);
}

export function createInsertTool(proposals: UpdateProposals): SiteTool {
  return createEditTool(proposals, true);
}

function createEditTool(proposals: UpdateProposals, insert: boolean): SiteTool {
  return {
    name: insert ? "notebook_propose_insert" : "notebook_propose_update",
    description: insert
      ? "Propose a new visible notebook cell. Human acceptance is required before insertion. This does not execute code."
      : "Propose a replacement for a visible writable cell. The human must review and accept it. This never executes code and cannot approve itself.",
    inputSchema: insert ? insertSchema : updateSchema,
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
        const args = validateInput<Record<string, unknown>>(
          input,
          insert ? insertSchema : updateSchema,
        );
        const proposal = insert
          ? proposals.proposeInsert(
              args.notebookId as string,
              args.afterCellId as string | null,
              args.cellType as "code" | "markdown",
              args.source as string,
            )
          : await proposals.propose(
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
      return boundedEnvelope(payload, isError);
    },
  };
}
