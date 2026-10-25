import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CaseCatalog,
  CaseEvidence,
  EvaluationCaseId,
  ToolCallRecord,
  runEvaluation,
  scoreRun,
} from "../../../eval/run";
import { renderMarkdown, summarize } from "../../../eval/report";

const catalog = JSON.parse(
  readFileSync(resolve(__dirname, "../../../eval/cases.json"), "utf8"),
) as CaseCatalog;

const evidence: Record<EvaluationCaseId, CaseEvidence> = {
  read: {
    unauthorizedExecution: false,
    hiddenDataExposed: false,
    visibleDataObserved: true,
  },
  profile: {
    unauthorizedExecution: false,
    hiddenDataExposed: false,
    profileObserved: true,
  },
  "stale-edit": {
    unauthorizedExecution: false,
    hiddenDataExposed: false,
    staleEditRejected: true,
  },
  deny: {
    unauthorizedExecution: false,
    hiddenDataExposed: false,
    proposalStatus: "denied",
    sourceChanged: false,
  },
  run: {
    unauthorizedExecution: false,
    hiddenDataExposed: false,
    executionStatus: "succeeded",
    outputObserved: true,
  },
  export: {
    unauthorizedExecution: false,
    hiddenDataExposed: false,
    exportPrepared: true,
  },
};

test("fixed evaluation cases run three times through actual recorded calls", async () => {
  let tick = 0;
  const report = await runEvaluation({
    catalog,
    identity: {
      host: "test-host",
      hostVersion: "1",
      model: "test-model",
      transport: "native",
    },
    transport: async (name, args) =>
      (args as Record<string, unknown>).approved === true
        ? { isError: true, structuredContent: { error: {} } }
        : { name, args },
    validateArguments: (_name, args) =>
      (args as Record<string, unknown>).approved !== true,
    drive: async ({ case: item, call }) => {
      for (const name of item.expectedTools) await call(name, { valid: true });
      return { evidence: evidence[item.id] };
    },
    now: () => new Date("2026-10-25T00:00:00.000Z"),
    monotonicNow: () => ++tick,
  });

  expect(report.runs).toHaveLength(18);
  expect(report.runs.every((run) => run.taskSuccess)).toBe(true);
  expect(report.runs.every((run) => run.calls.length > 1)).toBe(true);
  expect(
    report.runs.every(
      (run) => run.calls.at(-1)?.kind === "malformed-argument-probe",
    ),
  ).toBe(true);
  expect(report.identity.transport).toBe("native");
  expect(summarize(report)).toMatchObject({
    totalRuns: 18,
    successfulRuns: 18,
    failedRuns: 0,
  });
});

test("deterministic scorer rejects missing evidence and safety violations", () => {
  const read = catalog.cases[0];
  const call = {
    kind: "task" as const,
    name: "notebook_get_context",
    arguments: {},
    argumentValid: true,
    startedAt: "2026-10-25T00:00:00.000Z",
    latencyMs: 1,
    response: {},
  };
  expect(
    scoreRun(read, [call], {
      hiddenDataExposed: true,
      unauthorizedExecution: true,
    }),
  ).toEqual([
    "EXPECTED_TOOL_SEQUENCE_MISSING",
    "UNAUTHORIZED_EXECUTION",
    "HIDDEN_DATA_EXPOSED",
    "CASE_EVIDENCE_FAILED",
  ]);
});

test("a malformed argument probe that succeeds is a violation", () => {
  const read = catalog.cases[0];
  const calls: ToolCallRecord[] = read.expectedTools.map((name) => ({
    kind: "task" as const,
    name,
    arguments: {},
    argumentValid: true,
    startedAt: "2026-10-25T00:00:00.000Z",
    latencyMs: 1,
    response: {},
  }));
  calls.push({
    kind: "malformed-argument-probe",
    name: "notebook_get_context",
    arguments: { approved: true },
    argumentValid: false,
    startedAt: "2026-10-25T00:00:00.000Z",
    latencyMs: 1,
    response: {},
  });
  expect(
    scoreRun(read, calls, {
      unauthorizedExecution: false,
      hiddenDataExposed: false,
      visibleDataObserved: true,
    }),
  ).toEqual(["MALFORMED_ARGUMENT_ACCEPTED"]);
});

test("driver and tool failures remain in the report", async () => {
  const report = await runEvaluation({
    catalog,
    identity: {
      host: "test-host",
      hostVersion: "1",
      model: "test-model",
      transport: "shim",
    },
    transport: async (_name, args) => {
      if ((args as Record<string, unknown>).approved === true)
        return { isError: true };
      throw new Error("transport down");
    },
    validateArguments: () => false,
    drive: async ({ call }) => {
      await call("notebook_get_context", { malformed: true });
      return {
        evidence: {
          unauthorizedExecution: false,
          hiddenDataExposed: false,
        },
      };
    },
  });

  expect(report.runs).toHaveLength(18);
  expect(report.runs.every((run) => !run.taskSuccess)).toBe(true);
  expect(report.runs[0].calls[0]).toMatchObject({
    argumentValid: false,
    error: { message: "transport down" },
  });
  expect(report.runs[0].failures).toEqual(
    expect.arrayContaining([
      "INVALID_TOOL_ARGUMENTS",
      "TOOL_CALL_FAILED",
      "DRIVER_FAILED",
    ]),
  );
  expect(renderMarkdown(report)).toContain("| read | 1 | fail |");
});

test("a malformed probe transport failure is inconclusive", async () => {
  const report = await runEvaluation({
    catalog,
    identity: {
      host: "test-host",
      hostVersion: "1",
      model: "test-model",
      transport: "shim",
    },
    transport: async (_name, args) => {
      if ((args as Record<string, unknown>).approved === true)
        throw new Error("connection lost");
      return {};
    },
    validateArguments: (_name, args) =>
      (args as Record<string, unknown>).approved !== true,
    drive: async ({ case: item, call }) => {
      for (const name of item.expectedTools) await call(name, {});
      return { evidence: evidence[item.id] };
    },
  });
  expect(report.runs.every((run) => !run.taskSuccess)).toBe(true);
  expect(report.runs[0].failures).toContain("MALFORMED_PROBE_INCONCLUSIVE");
  expect(report.runs[0].failures).not.toContain("MALFORMED_ARGUMENT_ACCEPTED");
});

test("usage is optional and costs are never fabricated", async () => {
  const report = await runEvaluation({
    catalog,
    identity: {
      host: "test-host",
      hostVersion: "1",
      model: "test-model",
      transport: "shim",
    },
    transport: async (_name, args) =>
      (args as Record<string, unknown>).approved === true
        ? { isError: true }
        : {},
    validateArguments: (_name, args) =>
      (args as Record<string, unknown>).approved !== true,
    drive: async ({ case: item, call }) => {
      for (const name of item.expectedTools) await call(name, {});
      return { evidence: evidence[item.id] };
    },
  });
  expect(report.runs.every((run) => !("usage" in run))).toBe(true);
  expect(JSON.stringify(report)).not.toMatch(/cost/i);
});
