export type AuditRuleId =
  | "seed"
  | "execution-order"
  | "absolute-path"
  | "external-effects"
  | "possible-leakage"
  | "documentation"
  | "versions";

export interface AuditCell {
  cellId: string;
  type: "code" | "markdown" | "raw";
  source: string;
  executionCount: number | null;
}

export interface SourcePosition {
  line: number;
  column: number;
}

export interface AuditFinding {
  ruleId: AuditRuleId;
  cellId: string;
  sourceHash: string;
  severity: "info" | "warning" | "error";
  explanation: string;
  span: { start: SourcePosition; end: SourcePosition };
  stale: boolean;
}

export interface NotEvaluated {
  ruleId: AuditRuleId;
  cellId: string;
  reason: string;
}

export interface AuditResult {
  score: number | null;
  findings: AuditFinding[];
  notEvaluated: NotEvaluated[];
  executionCoverage: { executed: number; total: number };
}
