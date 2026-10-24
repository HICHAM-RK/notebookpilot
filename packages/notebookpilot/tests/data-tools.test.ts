import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PolicyStore } from "../src/control/policy";
import { DatasetStore, type DatasetStorage } from "../src/data/store";
import { createDatasetProfileTool } from "../src/webmcp/data-tools";

const encode = (value: string) => new TextEncoder().encode(value);
const options = (signal = new AbortController().signal) => ({ signal });

class MemoryStorage implements DatasetStorage {
  saved = new Map<string, Uint8Array>();
  removed: string[] = [];
  wait: Promise<void> | null = null;
  onSave: (() => void) | null = null;

  async save(fileName: string, bytes: Uint8Array): Promise<void> {
    this.onSave?.();
    if (this.wait) await this.wait;
    this.saved.set(fileName, Uint8Array.from(bytes));
  }

  async remove(fileName: string): Promise<void> {
    this.saved.delete(fileName);
    this.removed.push(fileName);
  }
}

function setup() {
  const storage = new MemoryStorage();
  const policies = new PolicyStore();
  const store = new DatasetStore(storage, () => "fixed-id");
  const tool = createDatasetProfileTool(store, policies);
  return { storage, policies, store, tool };
}

test("stores uploads under an app-owned name and returns no raw rows by default", async () => {
  const { storage, store, tool } = setup();
  const uploaded = await store.upload(
    "notebook-1",
    "../../private.csv",
    encode("name,value\nAda,1\nBob,2\n"),
  );
  expect(uploaded).toMatchObject({
    datasetId: "dataset_fixed-id",
    displayName: "private.csv",
    fileName: "notebookpilot-fixed-id.csv",
    rowCount: 2,
    shareSamples: false,
  });
  expect([...storage.saved.keys()]).toEqual(["notebookpilot-fixed-id.csv"]);

  const result = await tool.execute(
    { notebookId: "notebook-1", datasetId: uploaded.datasetId },
    options(),
  );
  expect(result.structuredContent).toMatchObject({
    datasetId: uploaded.datasetId,
    fileName: uploaded.fileName,
    rowCount: 2,
    columns: [
      { name: "name", type: "string", missingCount: 0 },
      { name: "value", type: "integer", missingCount: 0 },
    ],
    duplicateRowCount: 0,
  });
  expect(JSON.stringify(result)).not.toContain("Ada");
  expect(JSON.stringify(result)).not.toContain("sampleRows");
});

test("includes at most five raw rows only after explicit human sharing", async () => {
  const { store, tool } = setup();
  const uploaded = await store.upload(
    "notebook-1",
    "people.csv",
    encode("name,note\nAda,=1+1\nBob,<script>x</script>\nC,3\nD,4\nE,5\nF,6\n"),
  );
  store.setSampleSharing("notebook-1", uploaded.datasetId, true);
  const result = await tool.execute(
    { notebookId: "notebook-1", datasetId: uploaded.datasetId },
    options(),
  );
  expect(result.structuredContent).toMatchObject({
    sampleRows: {
      headers: ["name", "note"],
      rows: [
        ["Ada", "=1+1"],
        ["Bob", "<script>x</script>"],
        ["C", "3"],
        ["D", "4"],
        ["E", "5"],
      ],
    },
  });
});

test("matches the checked-in schema and rejects unknown or malformed inputs", async () => {
  const { tool } = setup();
  const contract = JSON.parse(
    readFileSync(resolve(__dirname, "../../../contracts/tools.json"), "utf8"),
  );
  expect(tool.inputSchema).toEqual(
    contract.tools.find(
      (entry: { name: string }) => entry.name === "dataset_profile",
    ).inputSchema,
  );
  expect(tool.annotations).toEqual({
    readOnlyHint: true,
    untrustedContentHint: true,
  });
  for (const input of [
    {},
    { notebookId: "n", datasetId: "d", approved: true },
    { notebookId: "n", datasetId: 1 },
    { notebookId: "", datasetId: "d" },
  ]) {
    expect((await tool.execute(input, options())).structuredContent).toEqual({
      error: {
        code: "INVALID_ARGUMENT",
        message: "INVALID_ARGUMENT",
        retryable: false,
      },
    });
  }
});

test("unknown, cross-notebook and hidden datasets are indistinguishable", async () => {
  const { policies, store, tool } = setup();
  const uploaded = await store.upload("notebook-1", "a.csv", encode("a\n1\n"));
  const invoke = (notebookId: string, datasetId: string) =>
    tool.execute({ notebookId, datasetId }, options());
  expect(
    (await invoke("notebook-1", "unknown")).structuredContent,
  ).toMatchObject({ error: { code: "NOT_FOUND" } });
  expect(
    (await invoke("notebook-2", uploaded.datasetId)).structuredContent,
  ).toMatchObject({ error: { code: "NOT_FOUND" } });
  policies.setNotebook("notebook-1", "hidden");
  expect(
    (await invoke("notebook-1", uploaded.datasetId)).structuredContent,
  ).toMatchObject({ error: { code: "NOT_FOUND" } });
});

test("cancellation during storage removes the app-owned partial file", async () => {
  const { storage, store } = setup();
  let release!: () => void;
  let started!: () => void;
  const saveStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  storage.onSave = started;
  storage.wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const controller = new AbortController();
  const pending = store.upload(
    "notebook-1",
    "a.csv",
    encode("a\n1\n"),
    controller.signal,
  );
  await saveStarted;
  controller.abort();
  release();
  await expect(pending).rejects.toMatchObject({ code: "CANCELLED" });
  expect(storage.removed).toEqual(["notebookpilot-fixed-id.csv"]);
  expect(store.list("notebook-1")).toEqual([]);
});

test("rejects invalid CSV before writing and enforces the session record limit", async () => {
  const storage = new MemoryStorage();
  let next = 0;
  const store = new DatasetStore(storage, () => `id-${next++}`, {
    maxDatasets: 1,
  });
  await expect(
    store.upload("notebook-1", "broken.csv", encode("a,a\n1,2\n")),
  ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  expect(storage.saved.size).toBe(0);
  await store.upload("notebook-1", "first.csv", encode("a\n1\n"));
  await expect(
    store.upload("notebook-1", "second.csv", encode("a\n2\n")),
  ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
});

test("aborted and permission-revoked profile calls return no dataset content", async () => {
  const { policies, store, tool } = setup();
  const uploaded = await store.upload("notebook-1", "a.csv", encode("a\n1\n"));
  const controller = new AbortController();
  controller.abort();
  expect(
    (
      await tool.execute(
        { notebookId: "notebook-1", datasetId: uploaded.datasetId },
        options(controller.signal),
      )
    ).structuredContent,
  ).toMatchObject({ error: { code: "CANCELLED" } });

  const pending = tool.execute(
    { notebookId: "notebook-1", datasetId: uploaded.datasetId },
    options(),
  );
  policies.setNotebook("notebook-1", "hidden");
  expect((await pending).structuredContent).toMatchObject({
    error: { code: "NOT_FOUND" },
  });
});
