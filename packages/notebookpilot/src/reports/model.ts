import type { AuditResult } from "../audit/model";
import type { ExperimentRun } from "../experiments/store";

export type ReportRun = ExperimentRun | { runId: string; status: "missing" };

export interface ReportModel {
  title: string;
  generatedAt: string;
  scope: {
    notebookId: string;
    visibleCellsOnly: true;
    rawRowsIncluded: false;
  };
  warnings: string[];
  audit: AuditResult;
  runs: ReportRun[];
}

export interface ReportModelInput {
  notebookId: string;
  generatedAt: string;
  requestedRunIds: string[];
  runs: ExperimentRun[];
  audit: AuditResult;
}

const opaqueId = /^[A-Za-z0-9_-]{1,128}$/;

export class ReportError extends Error {
  constructor(readonly code: "INVALID_ARGUMENT" | "LIMIT_EXCEEDED") {
    super(code);
  }
}

export function buildReportModel(input: ReportModelInput): ReportModel {
  if (
    typeof input.notebookId !== "string" ||
    input.notebookId.length < 1 ||
    input.notebookId.length > 512 ||
    !Array.isArray(input.requestedRunIds) ||
    input.requestedRunIds.length > 10 ||
    new Set(input.requestedRunIds).size !== input.requestedRunIds.length ||
    !input.requestedRunIds.every((id) => opaqueId.test(id))
  ) {
    throw new ReportError("INVALID_ARGUMENT");
  }
  const generated = new Date(input.generatedAt);
  if (
    !Number.isFinite(generated.valueOf()) ||
    generated.toISOString() !== input.generatedAt
  ) {
    throw new ReportError("INVALID_ARGUMENT");
  }
  const available = new Map(
    input.runs
      .filter((run) => run.notebookKey === input.notebookId)
      .map((run) => [run.runId, run]),
  );
  const selected = input.requestedRunIds.map<ReportRun>((runId) => {
    const run = available.get(runId);
    return run ? structuredClone(run) : { runId, status: "missing" };
  });
  const warnings = [
    "Audit findings are reproducibility heuristics, not security or correctness verdicts.",
    "Only cells visible to NotebookPilot at audit time were checked.",
    "Raw dataset rows are excluded from this report.",
  ];
  for (const run of selected) {
    if (run.status === "missing") warnings.push(`Run ${run.runId} is missing.`);
    else if (run.status !== "succeeded")
      warnings.push(
        `Run ${run.runId} ${run.status}${run.errorCode ? ` (${run.errorCode})` : ""}.`,
      );
  }
  if (input.audit.findings.some((finding) => finding.stale))
    warnings.push("Some audit evidence changed after the audit was run.");
  return {
    title: "NotebookPilot reproducibility report",
    generatedAt: input.generatedAt,
    scope: {
      notebookId: input.notebookId,
      visibleCellsOnly: true,
      rawRowsIncluded: false,
    },
    warnings,
    audit: structuredClone(input.audit),
    runs: selected,
  };
}
