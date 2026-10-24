import { hashSource } from "../notebook/revisions";
import type {
  AuditCell,
  AuditFinding,
  AuditResult,
  AuditRuleId,
  SourcePosition,
} from "./model";

export const AUDIT_PENALTIES: Readonly<Record<AuditRuleId, number>> = {
  seed: 15,
  "execution-order": 15,
  "absolute-path": 10,
  "external-effects": 20,
  "possible-leakage": 20,
  documentation: 10,
  versions: 10,
};

interface PreparedCell extends AuditCell {
  sourceHash: string;
}

function position(source: string, index: number): SourcePosition {
  const before = source.slice(0, index);
  const lines = before.split("\n");
  return { line: lines.length, column: lines.at(-1)!.length + 1 };
}

function span(source: string, index: number, length: number) {
  return {
    start: position(source, index),
    end: position(source, index + Math.max(length - 1, 0)),
  };
}

function finding(
  cell: PreparedCell,
  ruleId: AuditRuleId,
  severity: AuditFinding["severity"],
  explanation: string,
  index = 0,
  length = 1,
): AuditFinding {
  return {
    ruleId,
    cellId: cell.cellId,
    sourceHash: cell.sourceHash,
    severity,
    explanation,
    span: span(cell.source, index, length),
    stale: false,
  };
}

function callText(source: string, open: number): string | null {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let index = open; index < source.length; index++) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (character === "(") depth++;
    else if (character === ")" && --depth === 0)
      return source.slice(open, index + 1);
  }
  return null;
}

function seedFindings(cells: PreparedCell[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const calls =
    /\b(train_test_split|RandomForestClassifier|LogisticRegression)\s*\(/g;
  for (const cell of cells) {
    for (const match of cell.source.matchAll(calls)) {
      const open = match.index + match[0].lastIndexOf("(");
      const text = callText(cell.source, open);
      if (!text || !/\b(random_state|seed)\s*=/.test(text)) {
        findings.push(
          finding(
            cell,
            "seed",
            "warning",
            "Recognized stochastic operation has no explicit seed or random_state.",
            match.index,
            match[0].length,
          ),
        );
      }
    }
  }
  return findings;
}

function executionFindings(cells: PreparedCell[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  let previous: number | null = null;
  const seen = new Set<number>();
  for (const cell of cells) {
    if (cell.executionCount === null) continue;
    if (
      seen.has(cell.executionCount) ||
      (previous !== null && cell.executionCount <= previous)
    ) {
      findings.push(
        finding(
          cell,
          "execution-order",
          "warning",
          "Visible execution counts are duplicate or non-monotonic.",
        ),
      );
    }
    seen.add(cell.executionCount);
    previous = cell.executionCount;
  }
  return findings;
}

function regexFindings(
  cells: PreparedCell[],
  expression: RegExp,
  ruleId: AuditRuleId,
  severity: AuditFinding["severity"],
  explanation: string,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const cell of cells) {
    for (const match of cell.source.matchAll(expression))
      findings.push(
        finding(
          cell,
          ruleId,
          severity,
          explanation,
          match.index,
          match[0].length,
        ),
      );
  }
  return findings;
}

function leakageFindings(cells: PreparedCell[]): AuditFinding[] {
  const flattened = cells.flatMap((cell, cellIndex) =>
    cell.source.split("\n").map((line, lineIndex) => ({
      cell,
      cellIndex,
      line,
      lineIndex,
    })),
  );
  const split = flattened.findIndex((item) =>
    /\btrain_test_split\s*\(/.test(item.line),
  );
  if (split < 0) return [];
  const fit =
    /\b(?:scaler|imputer|encoder|preprocessor)\w*\s*\.\s*(?:fit|fit_transform)\s*\(/i;
  return flattened.slice(0, split).flatMap((item) => {
    const match = fit.exec(item.line);
    if (!match) return [];
    const lineOffset = item.cell.source
      .split("\n")
      .slice(0, item.lineIndex)
      .reduce((total, line) => total + line.length + 1, 0);
    return [
      finding(
        item.cell,
        "possible-leakage",
        "warning",
        "Recognized preprocessing appears to fit before the train/test split; this may leak test information.",
        lineOffset + match.index,
        match[0].length,
      ),
    ];
  });
}

export async function auditNotebook(cells: AuditCell[]): Promise<AuditResult> {
  const prepared: PreparedCell[] = await Promise.all(
    cells.map(async (cell) => ({
      ...cell,
      sourceHash: await hashSource(cell.source),
    })),
  );
  const code = prepared.filter((cell) => cell.type === "code");
  const executionCoverage = {
    executed: code.filter((cell) => cell.executionCount !== null).length,
    total: code.length,
  };
  if (code.length === 0)
    return { score: null, findings: [], notEvaluated: [], executionCoverage };

  const findings = [
    ...seedFindings(code),
    ...executionFindings(code),
    ...regexFindings(
      code,
      /(["'])(?:\/(?!\/)[^\n"']+|[A-Za-z]:\\[^\n"']+)\1/g,
      "absolute-path",
      "warning",
      "Literal absolute filesystem path reduces portability.",
    ),
    ...regexFindings(
      code,
      /^\s*(?:![^\n]+|%(?:pip|conda|sh|bash|system|sx)\b[^\n]*)|\b(?:requests|httpx)\.(?:get|post|put|patch|delete)\s*\(|\burllib\.request\.|\bsubprocess\.|\bos\.system\s*\(/gm,
      "external-effects",
      "error",
      "Recognized shell, subprocess or network operation may have external effects.",
    ),
    ...leakageFindings(code),
  ];

  if (!prepared.some((cell) => cell.type === "markdown" && cell.source.trim()))
    findings.push(
      finding(
        code[0],
        "documentation",
        "info",
        "Notebook has no nonempty markdown explanation.",
      ),
    );

  const training = code.find((cell) =>
    /\b(?:RandomForestClassifier|LogisticRegression)\s*\(|\b\w*model\w*\s*\.\s*fit\s*\(/i.test(
      cell.source,
    ),
  );
  const versionEvidence = code.some((cell) =>
    /\b(?:__version__|show_versions|pip\s+freeze|platform\.python_version|sys\.version)\b/.test(
      cell.source,
    ),
  );
  if (training && !versionEvidence)
    findings.push(
      finding(
        training,
        "versions",
        "warning",
        "Recognized training has no captured package or runtime version.",
      ),
    );

  const notEvaluated = code
    .filter((cell) =>
      /\b(?:getattr|eval|exec)\s*\(|\b(?:globals|locals)\s*\(\s*\)\s*\[/.test(
        cell.source,
      ),
    )
    .map((cell) => ({
      ruleId: "external-effects" as const,
      cellId: cell.cellId,
      reason: "Dynamic call target could not be evaluated.",
    }));
  const penalized = new Set(findings.map((item) => item.ruleId));
  const score = Math.max(
    0,
    100 -
      [...penalized].reduce(
        (total, ruleId) => total + AUDIT_PENALTIES[ruleId],
        0,
      ),
  );
  return { score, findings, notEvaluated, executionCoverage };
}

export async function refreshStaleness(
  findings: AuditFinding[],
  cells: AuditCell[],
): Promise<AuditFinding[]> {
  const hashes = new Map(
    await Promise.all(
      cells.map(
        async (cell) => [cell.cellId, await hashSource(cell.source)] as const,
      ),
    ),
  );
  return findings.map((item) => ({
    ...structuredClone(item),
    stale: hashes.get(item.cellId) !== item.sourceHash,
  }));
}
