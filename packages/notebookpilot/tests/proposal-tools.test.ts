import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PolicyStore } from "../src/control/policy";
import { UpdateProposals } from "../src/control/proposals";
import { createUpdateTool } from "../src/webmcp/proposal-tools";
import { hashSource } from "../src/notebook/revisions";

test("proposal schema matches contract and cannot accept an approval field", async () => {
  const policies = new PolicyStore();
  policies.setNotebook("n", "write");
  const replace = jest.fn(() => true);
  const store = new UpdateProposals(policies, () => "before", replace);
  const tool = createUpdateTool(store);
  const contract = JSON.parse(
    readFileSync(resolve(__dirname, "../../../contracts/tools.json"), "utf8"),
  );
  expect(tool.inputSchema).toEqual(
    contract.tools.find((entry: { name: string }) => entry.name === tool.name)
      .inputSchema,
  );
  const args = {
    notebookId: "n",
    cellId: "c",
    expectedSourceHash: await hashSource("before"),
    source: "after",
  };
  const options = { signal: new AbortController().signal };
  expect(
    await tool.execute({ ...args, approved: true }, options),
  ).toMatchObject({
    isError: true,
    structuredContent: { error: { code: "INVALID_ARGUMENT" } },
  });
  expect(await tool.execute(args, options)).toMatchObject({
    structuredContent: { status: "pending" },
  });
  expect(store.list("n")).toHaveLength(1);
  expect(replace).not.toHaveBeenCalled();
});

test("cancelling during hashing does not leave a proposal", async () => {
  const policies = new PolicyStore();
  policies.setNotebook("n", "write");
  const store = new UpdateProposals(
    policies,
    () => "before",
    () => true,
  );
  const controller = new AbortController();
  const hash = await hashSource("before");
  const pending = createUpdateTool(store).execute(
    { notebookId: "n", cellId: "c", expectedSourceHash: hash, source: "after" },
    { signal: controller.signal },
  );
  controller.abort();
  expect(await pending).toMatchObject({
    isError: true,
    structuredContent: { error: { code: "CANCELLED" } },
  });
  expect(store.list("n")).toHaveLength(0);
});
