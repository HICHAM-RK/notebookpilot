import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createExecutionTools } from "../src/webmcp/execution-tools";
import { ExecutionQueue } from "../src/notebook/execution";
import { PolicyStore } from "../src/control/policy";
import { hashSource } from "../src/notebook/revisions";

test("execution tools match schemas and cannot approve themselves", async () => {
  const policies = new PolicyStore();
  policies.setNotebook("n", "write");
  const run = jest.fn(async () => "1");
  const queue = new ExecutionQueue(policies, {
    read: () => ({ source: "print(1)", type: "code", kernelId: "k" }),
    run,
  });
  const tools = createExecutionTools(queue);
  const contract = JSON.parse(
    readFileSync(resolve(__dirname, "../../../contracts/tools.json"), "utf8"),
  );
  for (const tool of tools)
    expect(tool.inputSchema).toEqual(
      contract.tools.find((entry: { name: string }) => entry.name === tool.name)
        .inputSchema,
    );
  const args = {
    notebookId: "n",
    cells: [{ cellId: "c", expectedSourceHash: await hashSource("print(1)") }],
  };
  const options = { signal: new AbortController().signal };
  expect(
    await tools[0].execute({ ...args, approved: true }, options),
  ).toMatchObject({
    isError: true,
    structuredContent: { error: { code: "INVALID_ARGUMENT" } },
  });
  expect(
    await tools[0].execute(
      { ...args, cells: [{ ...args.cells[0], approved: true }] },
      options,
    ),
  ).toMatchObject({ isError: true });
  expect(await tools[0].execute(args, options)).toMatchObject({
    structuredContent: { status: "pending" },
  });
  expect(run).not.toHaveBeenCalled();
  expect(
    await tools[0].execute(
      { ...args, cells: Array(21).fill(args.cells[0]) },
      options,
    ),
  ).toMatchObject({
    isError: true,
    structuredContent: { error: { code: "INVALID_ARGUMENT" } },
  });
});
