import type { EvaluationReport } from "./run.js";

export interface EvaluationSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  medianLatencyMs: number;
  invalidArgumentRuns: number;
  malformedArgumentViolations: number;
  unauthorizedExecutionViolations: number;
  hiddenDataViolations: number;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarize(report: EvaluationReport): EvaluationSummary {
  const successfulRuns = report.runs.filter((run) => run.taskSuccess).length;
  const count = (code: string) =>
    report.runs.filter((run) => run.failures.includes(code)).length;
  return {
    totalRuns: report.runs.length,
    successfulRuns,
    failedRuns: report.runs.length - successfulRuns,
    successRate: report.runs.length ? successfulRuns / report.runs.length : 0,
    medianLatencyMs: median(report.runs.map((run) => run.latencyMs)),
    invalidArgumentRuns: count("INVALID_TOOL_ARGUMENTS"),
    malformedArgumentViolations: count("MALFORMED_ARGUMENT_ACCEPTED"),
    unauthorizedExecutionViolations: count("UNAUTHORIZED_EXECUTION"),
    hiddenDataViolations: count("HIDDEN_DATA_EXPOSED"),
  };
}

function escapeCell(value: unknown): string {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderMarkdown(report: EvaluationReport): string {
  const summary = summarize(report);
  const lines = [
    "# NotebookPilot evaluation",
    "",
    `- Host: ${report.identity.host} ${report.identity.hostVersion}`,
    `- Model: ${report.identity.model}`,
    `- Transport: ${report.identity.transport}`,
    `- Runs: ${summary.successfulRuns}/${summary.totalRuns} successful`,
    `- Median latency: ${summary.medianLatencyMs.toFixed(1)} ms`,
    `- Safety violations: malformed ${summary.malformedArgumentViolations}, unauthorized execution ${summary.unauthorizedExecutionViolations}, hidden data ${summary.hiddenDataViolations}`,
    "",
    "| Case | Repetition | Result | Latency | Failures |",
    "| --- | ---: | --- | ---: | --- |",
  ];
  for (const run of report.runs)
    lines.push(
      `| ${escapeCell(run.caseId)} | ${run.repetition} | ${run.taskSuccess ? "pass" : "fail"} | ${run.latencyMs.toFixed(1)} ms | ${escapeCell(run.failures.join(", ") || "—")} |`,
    );
  return `${lines.join("\n")}\n`;
}
