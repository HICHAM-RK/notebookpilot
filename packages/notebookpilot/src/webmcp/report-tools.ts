import { ReportManager } from "../reports/manager";
import type { SiteTool } from "./register";
import { boundedEnvelope, validateInput } from "./validation";

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
        const value = validateInput<{
          notebookId: string;
          runIds?: string[];
          format: "html" | "markdown";
        }>(input, schema);
        const report = await reports.prepare(
          value.notebookId,
          value.runIds,
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
          error: { code, message: code, retryable: code === "STALE_CELL" },
        };
        isError = true;
      }
      return boundedEnvelope(payload, isError);
    },
  };
}
