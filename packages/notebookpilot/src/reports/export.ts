import type { ExperimentRun } from "../experiments/store";
import { ReportError, type ReportModel, type ReportRun } from "./model";

export { ReportError } from "./model";

const MAX_REPORT_BYTES = 5 * 1024 * 1024;
const encoder = new TextEncoder();

function bounded(value: string): string {
  if (encoder.encode(value).length > MAX_REPORT_BYTES)
    throw new ReportError("LIMIT_EXCEEDED");
  return value;
}

function html(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdown(value: unknown): string {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replace(/([`*_[\]{}()#+\-.!|<>])/g, "\\$1")
    .replace(/[\r\n]+/g, " ");
}

function successful(
  run: ReportRun,
): run is ExperimentRun & { status: "succeeded" } {
  return run.status === "succeeded";
}

function htmlRun(run: ReportRun): string {
  if (!successful(run)) {
    const detail =
      run.status === "missing"
        ? "This requested run is no longer available."
        : `Execution ${run.status}${run.errorCode ? `: ${run.errorCode}` : "."}`;
    return `<article><h3>${html(run.runId)}</h3><p><strong>Status:</strong> ${html(run.status)}</p><p>${html(detail)}</p></article>`;
  }
  const parameters = Object.entries(run.parameters!)
    .map(([key, value]) => `<li>${html(key)}: ${html(value)}</li>`)
    .join("");
  const matrix = run
    .metrics!.confusionMatrix.map(
      (row) =>
        `<tr>${row.map((value) => `<td>${html(value)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<article><h3>${html(run.runId)}</h3><dl><dt>Status</dt><dd>succeeded</dd><dt>Dataset fingerprint</dt><dd><code>${html(run.datasetHash)}</code></dd><dt>Target</dt><dd>${html(run.target)}</dd><dt>Features</dt><dd>${run.features!.map(html).join(", ")}</dd><dt>Model</dt><dd>${html(run.model)}</dd><dt>Split fingerprint</dt><dd><code>${html(run.splitFingerprint)}</code></dd><dt>Seed</dt><dd>${html(run.seed)}</dd><dt>Test fraction</dt><dd>${html(run.testFraction)}</dd><dt>Created</dt><dd>${html(run.createdAt)}</dd><dt>Pandas</dt><dd>${html(run.versions!.pandas)}</dd><dt>scikit-learn</dt><dd>${html(run.versions!.scikitLearn)}</dd></dl><h4>Parameters</h4><ul>${parameters}</ul><h4>Metrics</h4><ul><li>Accuracy: ${html(run.metrics!.accuracy)}</li><li>Macro precision: ${html(run.metrics!.macroPrecision)}</li><li>Macro recall: ${html(run.metrics!.macroRecall)}</li><li>Macro F1: ${html(run.metrics!.macroF1)}</li></ul><h4>Confusion matrix</h4><table><tbody>${matrix}</tbody></table></article>`;
}

export function renderHtmlReport(model: ReportModel): string {
  const warnings = model.warnings
    .map((warning) => `<li>${html(warning)}</li>`)
    .join("");
  const findings = model.audit.findings
    .map(
      (finding) =>
        `<li><strong>${html(finding.ruleId)}</strong> (${html(finding.severity)}): ${html(finding.explanation)} — cell ${html(finding.cellId)}, line ${finding.span.start.line}, column ${finding.span.start.column}${finding.stale ? " (changed since audit)" : ""}</li>`,
    )
    .join("");
  const notEvaluated = model.audit.notEvaluated
    .map(
      (item) =>
        `<li>${html(item.ruleId)}, cell ${html(item.cellId)}: ${html(item.reason)}</li>`,
    )
    .join("");
  return bounded(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${html("default-src 'none'; style-src 'unsafe-inline'")}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(model.title)}</title><style>body{max-width:70rem;margin:2rem auto;padding:0 1rem;font:16px/1.5 system-ui,sans-serif;color:#18212b}article{border-top:1px solid #ccd3da;padding-top:1rem;margin-top:1rem}dt{font-weight:700}dd{margin:0 0 .5rem;overflow-wrap:anywhere}code{overflow-wrap:anywhere}table{border-collapse:collapse}td{border:1px solid #89939e;padding:.35rem}</style></head><body><main><h1>${html(model.title)}</h1><p>Generated ${html(model.generatedAt)}</p><section><h2>Scope</h2><dl><dt>Notebook</dt><dd>${html(model.scope.notebookId)}</dd><dt>Notebook cells</dt><dd>Visible cells only</dd><dt>Raw dataset rows</dt><dd>Excluded</dd></dl></section><section><h2>Warnings</h2><ul>${warnings}</ul></section><section><h2>Audit</h2><p>Score: ${model.audit.score === null ? "Not available" : `${model.audit.score}/100`}</p><p>Executed ${model.audit.executionCoverage.executed} of ${model.audit.executionCoverage.total} visible code cells.</p><h3>Findings</h3>${findings ? `<ul>${findings}</ul>` : "<p>No heuristic findings.</p>"}${notEvaluated ? `<h3>Not evaluated</h3><ul>${notEvaluated}</ul>` : ""}</section><section><h2>Experiment runs</h2>${model.runs.length ? model.runs.map(htmlRun).join("") : "<p>No runs selected.</p>"}</section></main></body></html>`,
  );
}

function markdownRun(run: ReportRun): string {
  if (!successful(run)) {
    const error =
      run.status !== "missing" && run.errorCode
        ? ` (${markdown(run.errorCode)})`
        : "";
    return `### ${markdown(run.runId)}\n\nStatus: ${markdown(run.status)}${error}.\n`;
  }
  const parameters = Object.entries(run.parameters!)
    .map(([key, value]) => `- ${markdown(key)}: ${markdown(value)}`)
    .join("\n");
  const matrix = run
    .metrics!.confusionMatrix.map((row) => `- ${row.map(markdown).join(", ")}`)
    .join("\n");
  return `### ${markdown(run.runId)}\n\n- Status: succeeded\n- Dataset fingerprint: ${markdown(run.datasetHash)}\n- Target: ${markdown(run.target)}\n- Features: ${run.features!.map(markdown).join(", ")}\n- Model: ${markdown(run.model)}\n- Split fingerprint: ${markdown(run.splitFingerprint)}\n- Seed: ${run.seed}\n- Test fraction: ${run.testFraction}\n- Created: ${markdown(run.createdAt)}\n- Pandas: ${markdown(run.versions!.pandas)}\n- scikit-learn: ${markdown(run.versions!.scikitLearn)}\n\n#### Parameters\n\n${parameters}\n\n#### Metrics\n\n- Accuracy: ${run.metrics!.accuracy}\n- Macro precision: ${run.metrics!.macroPrecision}\n- Macro recall: ${run.metrics!.macroRecall}\n- Macro F1: ${run.metrics!.macroF1}\n\n#### Confusion matrix\n\n${matrix}\n`;
}

export function renderMarkdownReport(model: ReportModel): string {
  const warnings = model.warnings
    .map((warning) => `- ${markdown(warning)}`)
    .join("\n");
  const findings = model.audit.findings.length
    ? model.audit.findings
        .map(
          (finding) =>
            `- ${markdown(finding.ruleId)} (${markdown(finding.severity)}): ${markdown(finding.explanation)} — cell ${markdown(finding.cellId)}, line ${finding.span.start.line}, column ${finding.span.start.column}${finding.stale ? " (changed since audit)" : ""}`,
        )
        .join("\n")
    : "No heuristic findings.";
  const notEvaluated = model.audit.notEvaluated.length
    ? `\n\n### Not evaluated\n\n${model.audit.notEvaluated.map((item) => `- ${markdown(item.ruleId)}, cell ${markdown(item.cellId)}: ${markdown(item.reason)}`).join("\n")}`
    : "";
  return bounded(
    `# ${markdown(model.title)}\n\nGenerated ${markdown(model.generatedAt)}\n\n## Scope\n\n- Notebook: ${markdown(model.scope.notebookId)}\n- Notebook cells: visible cells only\n- Raw dataset rows: excluded\n\n## Warnings\n\n${warnings}\n\n## Audit\n\n- Score: ${model.audit.score === null ? "Not available" : `${model.audit.score}/100`}\n- Execution coverage: ${model.audit.executionCoverage.executed} of ${model.audit.executionCoverage.total} visible code cells\n\n### Findings\n\n${findings}${notEvaluated}\n\n## Experiment runs\n\n${model.runs.length ? model.runs.map(markdownRun).join("\n") : "No runs selected."}\n`,
  );
}
