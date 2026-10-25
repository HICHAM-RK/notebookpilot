import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NotebookAuditor } from "../src/audit/auditor";
import { PolicyStore } from "../src/control/policy";
import { ExperimentStore } from "../src/experiments/store";
import { ReportManager } from "../src/reports/manager";
import { createReportTool } from "../src/webmcp/report-tools";

function setup() {
  const policies = new PolicyStore();
  policies.setNotebook("n", "read");
  const auditor = new NotebookAuditor(
    (id) =>
      id === "n"
        ? {
            id,
            cells: [
              {
                id: "c",
                type: "code",
                source: "x = 1",
                outputs: "",
                executionCount: null,
              },
            ],
          }
        : null,
    policies,
  );
  const store = new ExperimentStore({
    read: () => null,
    write: () => undefined,
  });
  const reports = new ReportManager(
    store,
    auditor,
    (id) => (id === "n" ? "notebook.ipynb" : null),
    () => "export-one",
    () => "2026-10-25T00:00:00.000Z",
  );
  return { policies, reports, tool: createReportTool(reports) };
}

const options = (signal = new AbortController().signal) => ({ signal });

test("matches the contract and prepares metadata without returning report contents", async () => {
  const { reports, tool } = setup();
  const contract = JSON.parse(
    readFileSync(resolve(__dirname, "../../../contracts/tools.json"), "utf8"),
  );
  expect(tool.inputSchema).toEqual(
    contract.tools.find((entry: { name: string }) => entry.name === tool.name)
      .inputSchema,
  );
  const result = (await tool.execute(
    { notebookId: "n", runIds: [], format: "html" },
    options(),
  )) as { structuredContent: Record<string, unknown> };
  expect(result.structuredContent).toMatchObject({
    exportId: "export-one",
    fileName: "notebookpilot-report-export-one.html",
  });
  expect(result.structuredContent).not.toHaveProperty("content");
  expect(reports.list("n")[0].content).toContain("<!doctype html>");
});

test("rejects extra fields and removes a preparation cancelled after rendering", async () => {
  const { reports, tool } = setup();
  expect(
    (await tool.execute(
      { notebookId: "n", format: "html", download: true },
      options(),
    )) as object,
  ).toMatchObject({
    structuredContent: { error: { code: "INVALID_ARGUMENT" } },
  });
  const controller = new AbortController();
  controller.abort();
  expect(
    (await tool.execute(
      { notebookId: "n", format: "html" },
      options(controller.signal),
    )) as object,
  ).toMatchObject({ structuredContent: { error: { code: "CANCELLED" } } });
  expect(reports.list("n")).toEqual([]);
});

test("hidden notebooks do not prepare or leak reports", async () => {
  const { policies, reports, tool } = setup();
  policies.setNotebook("n", "hidden");
  const result = await tool.execute(
    { notebookId: "n", format: "markdown" },
    options(),
  );
  expect(result as object).toMatchObject({
    structuredContent: { error: { code: "NOT_FOUND" } },
  });
  expect(reports.list("n")).toEqual([]);
});
