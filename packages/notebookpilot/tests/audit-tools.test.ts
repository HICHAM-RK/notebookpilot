import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NotebookAuditor } from "../src/audit/auditor";
import { PolicyStore } from "../src/control/policy";
import { createAuditTool } from "../src/webmcp/audit-tools";

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
                source: 'open("/tmp/data.csv")',
                outputs: "",
                executionCount: null,
              },
            ],
          }
        : null,
    policies,
  );
  return { policies, tool: createAuditTool(auditor) };
}

const options = (signal = new AbortController().signal) => ({ signal });

test("matches the contract and returns bounded evidence", async () => {
  const { tool } = setup();
  const contract = JSON.parse(
    readFileSync(resolve(__dirname, "../../../contracts/tools.json"), "utf8"),
  );
  expect(tool.inputSchema).toEqual(
    contract.tools.find((entry: { name: string }) => entry.name === tool.name)
      .inputSchema,
  );
  const result = (await tool.execute({ notebookId: "n" }, options())) as {
    structuredContent: { score: number; findings: { ruleId: string }[] };
  };
  expect(result.structuredContent.score).toBe(80);
  expect(result.structuredContent.findings.map((item) => item.ruleId)).toEqual([
    "absolute-path",
    "documentation",
  ]);
});

test("rejects unknown fields, cancellation and hidden notebooks without content", async () => {
  const { policies, tool } = setup();
  const extra = await tool.execute(
    { notebookId: "n", approve: true },
    options(),
  );
  expect(
    (extra as { structuredContent: unknown }).structuredContent,
  ).toMatchObject({
    error: { code: "INVALID_ARGUMENT" },
  });
  const controller = new AbortController();
  controller.abort();
  const cancelled = await tool.execute(
    { notebookId: "n" },
    options(controller.signal),
  );
  expect(
    (cancelled as { structuredContent: unknown }).structuredContent,
  ).toMatchObject({ error: { code: "CANCELLED" } });
  policies.setNotebook("n", "hidden");
  const hidden = await tool.execute({ notebookId: "n" }, options());
  expect(JSON.stringify(hidden)).not.toContain("tmp/data");
  expect(
    (hidden as { structuredContent: unknown }).structuredContent,
  ).toMatchObject({
    error: { code: "NOT_FOUND" },
  });
});
