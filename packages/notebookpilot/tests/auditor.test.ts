import { NotebookAuditor } from "../src/audit/auditor";
import { PolicyStore } from "../src/control/policy";
import type { LiveNotebook } from "../src/notebook/reader";

function setup() {
  const policies = new PolicyStore();
  policies.setNotebook("n", "read");
  const notebook: LiveNotebook = {
    id: "n",
    cells: [
      {
        id: "visible",
        type: "code",
        source: "x = 1",
        outputs: "",
        executionCount: 1,
      },
      {
        id: "secret",
        type: "code",
        source: 'requests.get("https://secret.test")\nopen("/private/path")',
        outputs: "",
        executionCount: 2,
      },
    ],
  };
  policies.setCell("n", "secret", "hidden");
  return {
    notebook,
    policies,
    auditor: new NotebookAuditor(() => notebook, policies),
  };
}

test("filters hidden cells before analysis and hashing", async () => {
  const { auditor } = setup();
  const result = await auditor.audit("n");
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(result.findings.map((item) => item.ruleId)).toEqual(["documentation"]);
  expect(result.executionCoverage).toEqual({ executed: 1, total: 1 });
});

test("rejects permission changes and live source changes during analysis", async () => {
  const hidden = setup();
  let calls = 0;
  const revoked = new NotebookAuditor(() => {
    calls++;
    if (calls === 2) hidden.policies.setNotebook("n", "hidden");
    return hidden.notebook;
  }, hidden.policies);
  await expect(revoked.audit("n")).rejects.toMatchObject({ code: "NOT_FOUND" });

  const changed = setup();
  calls = 0;
  const stale = new NotebookAuditor(() => {
    calls++;
    if (calls === 2) changed.notebook.cells[0].source = "x = 2";
    return changed.notebook;
  }, changed.policies);
  await expect(stale.audit("n")).rejects.toMatchObject({ code: "STALE_CELL" });
});
