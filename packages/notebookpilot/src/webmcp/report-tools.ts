import { ReportError } from "../reports/model";
import { ReportManager } from "../reports/manager";
import type { SiteTool } from "./register";

const schema = {
  type: "object",
  properties: {
    notebookId: { type: "string", minLength: 1, maxLength: 128 },
    runIds: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 128 },
      minItems: 0,
      maxItems: 10,
      uniqueItems: true,
    },
    format: { enum: ["html", "markdown"] },
  },
  required: ["notebookId", "format"],
  additionalProperties: false,
};

const opaqueId = /^[A-Za-z0-9_-]{1,128}$/;

export function createReportTool(reports: ReportManager): SiteTool {
  return {
    name: "report_generate",
    description:
      "Prepare a bounded offline reproducibility report from visible audit evidence and trusted experiment records. A human must download it from NotebookPilot.",
    inputSchema: schema,
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute: async (input: unknown, { signal }: { signal: AbortSignal }) => {
      let payload: unknown;
      let isError = false;
      try {
        if (signal.aborted) throw new Error("CANCELLED");
        if (!input || typeof input !== "object" || Array.isArray(input))
          throw new ReportError("INVALID_ARGUMENT");
        const value = input as Record<string, unknown>;
        if (
          Object.keys(value).some(
            (key) => !["notebookId", "runIds", "format"].includes(key),
          ) ||
          !opaqueId.test(value.notebookId as string) ||
          (value.format !== "html" && value.format !== "markdown") ||
          (value.runIds !== undefined &&
            (!Array.isArray(value.runIds) ||
              value.runIds.length > 10 ||
              new Set(value.runIds).size !== value.runIds.length ||
              !value.runIds.every((id) =>
                opaqueId.test(typeof id === "string" ? id : ""),
              )))
        ) {
          throw new ReportError("INVALID_ARGUMENT");
        }
        const report = await reports.prepare(
          value.notebookId as string,
          value.runIds as string[] | undefined,
          value.format,
        );
        if (signal.aborted) {
          reports.remove(report.exportId);
          throw new Error("CANCELLED");
        }
        payload = {
          exportId: report.exportId,
          fileName: report.fileName,
          bytes: report.bytes,
        };
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
