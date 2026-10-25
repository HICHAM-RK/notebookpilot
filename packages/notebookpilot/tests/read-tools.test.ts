import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PolicyStore } from "../src/control/policy";
import { NotebookReader } from "../src/notebook/reader";
import { createReadTools } from "../src/webmcp/read-tools";

const policies = new PolicyStore();
const reader = new NotebookReader(
  (id) =>
    id === "n"
      ? {
          id,
          cells: [{ id: "c", type: "code", source: "print(42)", outputs: "" }],
        }
      : null,
  policies,
);
const tools = () =>
  createReadTools(reader, policies, () => ({
    notebookId: "n",
    activeCellId: "c",
    kernelStatus: "idle",
  }));
const options = () => ({ signal: new AbortController().signal });

afterEach(() => policies.forget("n"));

test("permission revocation before a context result resolves suppresses it", async () => {
  const pending = tools()[0].execute({}, options());
  policies.setNotebook("n", "hidden");
  expect((await pending).structuredContent).toMatchObject({
    error: { code: "NOT_FOUND" },
  });
});

test("schemas match the checked-in read contracts", () => {
  const contract = JSON.parse(
    readFileSync(resolve(__dirname, "../../../contracts/tools.json"), "utf8"),
  );
  for (const tool of tools()) {
    expect(tool.inputSchema).toEqual(
      contract.tools.find((entry: { name: string }) => entry.name === tool.name)
        .inputSchema,
    );
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
  }
});

test("read tools return live data and suppress hidden context", async () => {
  const [context, cells] = tools();
  expect(
    JSON.stringify(await cells.execute({ notebookId: "n" }, options())),
  ).toContain("print(42)");
  policies.setCell("n", "c", "hidden");
  expect(
    (await context.execute({}, options())).structuredContent,
  ).toMatchObject({ activeCellId: null });
  policies.setNotebook("n", "hidden");
  expect((await context.execute({}, options())).structuredContent).toEqual({
    notebookId: null,
    activeCellId: null,
    kernelStatus: "unavailable",
    webmcpStatus: "available",
  });
  expect(await cells.execute({ notebookId: "n" }, options())).toEqual(
    await cells.execute({ notebookId: "unknown" }, options()),
  );
});

test.each([
  null,
  [],
  "text",
  {},
  { notebookId: "" },
  { notebookId: "x".repeat(129) },
  { notebookId: "n", approve: true },
  { notebookId: "n", limit: 0 },
  { notebookId: "n", offset: -1 },
  { notebookId: "n", offset: 0.5 },
  { notebookId: "n", limit: Infinity },
])("rejects invalid read input %j", async (input) => {
  const result = await tools()[1].execute(input, options());
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toMatchObject({
    error: { code: "INVALID_ARGUMENT" },
  });
});

test("cancellation returns no notebook content", async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await tools()[1].execute(
    { notebookId: "n" },
    { signal: controller.signal },
  );
  expect(result.structuredContent).toMatchObject({
    error: { code: "CANCELLED" },
  });
  expect(JSON.stringify(result)).not.toContain("print(42)");
});

test("unexpected context failures do not leak exception text", async () => {
  const [context] = createReadTools(reader, policies, () => {
    throw new Error("secret");
  });
  const result = await context.execute({}, options());
  expect(result.structuredContent).toMatchObject({
    error: { code: "INTERNAL_ERROR" },
  });
  expect(JSON.stringify(result)).not.toContain("secret");
});
