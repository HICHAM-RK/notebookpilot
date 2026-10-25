import { webcrypto } from "node:crypto";
import { PolicyStore } from "../src/control/policy";
import { NotebookReader, type LiveNotebook } from "../src/notebook/reader";

beforeAll(() =>
  Object.defineProperty(globalThis, "crypto", { value: webcrypto }),
);

function setup() {
  let notebook: LiveNotebook | null = {
    id: "n",
    cells: [
      { id: "c1", type: "code", source: "print('unsaved')", outputs: "" },
      { id: "c2", type: "markdown", source: "private note", outputs: "" },
      { id: "c3", type: "code", source: "2 + 2", outputs: "4" },
    ],
  };
  const policies = new PolicyStore();
  const reader = new NotebookReader(
    (id) => (notebook?.id === id ? notebook : null),
    policies,
  );
  return {
    reader,
    policies,
    notebook,
    close: () => {
      notebook = null;
    },
  };
}

test("reads current unsaved source and paginates only visible cells", async () => {
  const { reader, policies, notebook } = setup();
  policies.setCell("n", "c2", "hidden");
  notebook.cells[0].source = "human edit";
  const first = await reader.getCells("n", 0, 1);
  expect(first.cells[0].source).toBe("human edit");
  expect(first.nextOffset).toBe(1);
  const second = await reader.getCells("n", first.nextOffset!, 1);
  expect(second.cells.map((cell) => cell.cellId)).toEqual(["c3"]);
  expect(second.nextOffset).toBeNull();
  expect(JSON.stringify(first) + JSON.stringify(second)).not.toContain(
    "private note",
  );
});

test("unknown and hidden notebooks have the same error", async () => {
  const { reader, policies } = setup();
  await expect(reader.getCells("unknown")).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  policies.setNotebook("n", "hidden");
  await expect(reader.getCells("n")).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});

test("deleting a cell while hashing invalidates the snapshot", async () => {
  const { reader, notebook } = setup();
  const pending = reader.getCells("n");
  notebook.cells.splice(0, 1);
  await expect(pending).rejects.toMatchObject({ code: "STALE_CELL" });
});

test("permission revocation during hashing returns no contents", async () => {
  const { reader, policies } = setup();
  const pending = reader.getCells("n");
  policies.setCell("n", "c1", "hidden");
  await expect(pending).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("closing or editing during a read invalidates it", async () => {
  const first = setup();
  const pending = first.reader.getCells("n");
  first.close();
  await expect(pending).rejects.toMatchObject({ code: "NOT_FOUND" });
  const second = setup();
  const edited = second.reader.getCells("n");
  second.notebook.cells[0].source = "changed during hash";
  await expect(edited).rejects.toMatchObject({ code: "STALE_CELL" });
});

test("bounded results account for JSON escaping and preserve full source hashes", async () => {
  const { reader, notebook } = setup();
  notebook.cells[0].source = '\\"🐍'.repeat(20_000);
  const result = await reader.getCells("n");
  const envelope = {
    content: [{ type: "text", text: JSON.stringify(result) }],
    structuredContent: result,
  };
  expect(
    new TextEncoder().encode(JSON.stringify(envelope)).length,
  ).toBeLessThanOrEqual(50 * 1024);
  expect(result.cells[0].truncated).toBe(true);
  expect(result.cells[0].sourceHash).toMatch(/^[a-f0-9]{64}$/);
  expect(result.cells[0].source).not.toContain("�");
});

test.each([
  [-1, 20],
  [0, 0],
  [0, 101],
  [0.5, 1],
  [0, NaN],
])("rejects invalid pagination offset=%s limit=%s", async (offset, limit) => {
  await expect(
    setup().reader.getCells("n", offset, limit),
  ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
});

test("rejects ambiguous or invalid imported cell identifiers", async () => {
  const first = setup();
  first.notebook.cells[1].id = "c1";
  await expect(first.reader.getCells("n")).rejects.toMatchObject({
    code: "INVALID_ARGUMENT",
  });
  const second = setup();
  second.notebook.cells[0].id = "x".repeat(129);
  await expect(second.reader.getCells("n")).rejects.toMatchObject({
    code: "INVALID_ARGUMENT",
  });
});
