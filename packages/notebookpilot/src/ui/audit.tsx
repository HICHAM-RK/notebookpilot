import React from "react";
import type { AuditFinding, AuditResult } from "../audit/model";

function title(ruleId: AuditFinding["ruleId"]): string {
  return ruleId
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function AuditPanel({
  pending,
  result,
  error,
  onRun,
  onNavigate,
}: {
  pending: boolean;
  result: AuditResult | null;
  error: string | null;
  onRun: () => void;
  onNavigate: (finding: AuditFinding) => void;
}): React.ReactElement {
  return (
    <section className="np-audit" aria-labelledby="np-audit-heading">
      <h3 id="np-audit-heading">Reproducibility audit</h3>
      <p>
        Checks visible cells with documented heuristics. The score is guidance,
        not a security or correctness verdict.
      </p>
      <button type="button" disabled={pending} onClick={onRun}>
        {pending ? "Auditing…" : "Run audit"}
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div aria-label="Audit results">
          <p role="status">
            Score:{" "}
            {result.score === null ? "Not available" : `${result.score}/100`}
          </p>
          <p>
            Executed {result.executionCoverage.executed} of{" "}
            {result.executionCoverage.total} visible code cells.
          </p>
          {result.findings.length === 0 && <p>No heuristic findings.</p>}
          {result.findings.map((finding, index) => (
            <article
              key={`${finding.ruleId}-${finding.cellId}-${index}`}
              aria-label={`${title(finding.ruleId)} finding`}
            >
              <h4>{title(finding.ruleId)}</h4>
              <p>{finding.explanation}</p>
              <p>
                Cell {finding.cellId}, line {finding.span.start.line}, column{" "}
                {finding.span.start.column}
              </p>
              {finding.stale ? (
                <p role="alert">Changed since audit. Run the audit again.</p>
              ) : (
                <button type="button" onClick={() => onNavigate(finding)}>
                  Go to evidence
                </button>
              )}
            </article>
          ))}
          {result.notEvaluated.length > 0 && (
            <div>
              <h4>Not evaluated</h4>
              <ul>
                {result.notEvaluated.map((item, index) => (
                  <li key={`${item.ruleId}-${item.cellId}-${index}`}>
                    Cell {item.cellId}: {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
