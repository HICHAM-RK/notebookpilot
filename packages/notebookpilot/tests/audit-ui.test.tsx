import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuditPanel } from "../src/ui/audit";

test("renders limitations, findings, locations and native navigation buttons", () => {
  const markup = renderToStaticMarkup(
    <AuditPanel
      pending={false}
      error={null}
      onRun={() => {}}
      onNavigate={() => {}}
      result={{
        score: 80,
        executionCoverage: { executed: 1, total: 2 },
        notEvaluated: [],
        findings: [
          {
            ruleId: "absolute-path",
            cellId: "cell-1",
            sourceHash: "a".repeat(64),
            severity: "warning",
            explanation:
              "Literal absolute filesystem path reduces portability.",
            span: {
              start: { line: 2, column: 3 },
              end: { line: 2, column: 12 },
            },
            stale: false,
          },
        ],
      }}
    />,
  );
  expect(markup).toContain("documented heuristics");
  expect(markup).toContain("not a security or correctness verdict");
  expect(markup).toContain("Score: 80/100");
  expect(markup).toContain("line 2, column 3");
  expect(markup).toContain("Go to evidence");
});

test("shows empty, pending, error, unevaluated and stale states", () => {
  const empty = renderToStaticMarkup(
    <AuditPanel
      pending={false}
      error={null}
      onRun={() => {}}
      onNavigate={() => {}}
      result={{
        score: null,
        executionCoverage: { executed: 0, total: 0 },
        findings: [],
        notEvaluated: [],
      }}
    />,
  );
  expect(empty).toContain("Score: Not available");
  expect(empty).toContain("No heuristic findings.");
  const states = renderToStaticMarkup(
    <AuditPanel
      pending={true}
      error="Audit failed."
      onRun={() => {}}
      onNavigate={() => {}}
      result={{
        score: 90,
        executionCoverage: { executed: 0, total: 1 },
        findings: [
          {
            ruleId: "documentation",
            cellId: "c",
            sourceHash: "a".repeat(64),
            severity: "info",
            explanation: "Missing notes.",
            span: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 1 },
            },
            stale: true,
          },
        ],
        notEvaluated: [
          {
            ruleId: "external-effects",
            cellId: "c",
            reason: "Dynamic call target could not be evaluated.",
          },
        ],
      }}
    />,
  );
  expect(states).toContain("Auditing…");
  expect(states).toContain('role="alert"');
  expect(states).toContain("Changed since audit");
  expect(states).not.toContain("Go to evidence");
  expect(states).toContain("Not evaluated");
});
