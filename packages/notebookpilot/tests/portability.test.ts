import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  exportNotebook,
  importNotebook,
  NotebookPortabilityError,
} from "../src/notebook/portability";

const fixture = readFileSync(
  resolve(__dirname, "../../../content/fixtures/colab.ipynb"),
);

test("imports nbformat 4 and round-trips cells and unknown metadata", () => {
  const imported = importNotebook(fixture);
  expect(imported.notebook.nbformat).toBe(4);
  expect(imported.notebook.cells).toHaveLength(2);
  expect(imported.notebook.metadata).toMatchObject({
    custom_notebook_key: { nested: [1, 2, 3] },
  });
  expect(imported.notebook.cells[0].metadata).toMatchObject({
    custom_cell_key: { kept: true },
  });

  const roundTrip = importNotebook(exportNotebook(imported.notebook));
  expect(roundTrip.notebook).toEqual(imported.notebook);
});

test("warns about Colab APIs, Drive, shell commands and GPU expectations", () => {
  expect(
    importNotebook(fixture).warnings.map((warning) => warning.code),
  ).toEqual(["COLAB_API", "DRIVE_MOUNT", "SHELL_COMMAND", "GPU_RUNTIME"]);
});

test("removes active imported output while retaining plain output", () => {
  (
    globalThis as { notebookPilotImportExecuted?: boolean }
  ).notebookPilotImportExecuted = false;
  const payload = Buffer.from(
    JSON.stringify({
      cells: [
        {
          cell_type: "code",
          execution_count: 1,
          metadata: {},
          outputs: [
            {
              output_type: "display_data",
              data: {
                "text/plain": "safe fallback",
                "text/html":
                  "<img src=x onerror='globalThis.notebookPilotImportExecuted=true'><script>globalThis.notebookPilotImportExecuted=true</script>",
              },
              metadata: {},
            },
          ],
          source: "print('stored only')",
        },
      ],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5,
    }),
  );
  const imported = importNotebook(payload);
  const output = (
    imported.notebook.cells[0].outputs as Array<{ data: object }>
  )[0];
  expect(output.data).toEqual({ "text/plain": "safe fallback" });
  expect(imported.warnings.map((warning) => warning.code)).toContain(
    "ACTIVE_OUTPUT_REMOVED",
  );
  expect(
    (globalThis as { notebookPilotImportExecuted?: boolean })
      .notebookPilotImportExecuted,
  ).toBe(false);
});

test.each([
  [
    "wrong major version",
    { cells: [], metadata: {}, nbformat: 3, nbformat_minor: 0 },
  ],
  ["missing cells", { metadata: {}, nbformat: 4, nbformat_minor: 5 }],
  [
    "unknown cell type",
    {
      cells: [{ cell_type: "html", metadata: {}, source: "x" }],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5,
    },
  ],
  [
    "malformed code output",
    {
      cells: [
        {
          cell_type: "code",
          execution_count: null,
          metadata: {},
          outputs: [{ output_type: "display_data", data: {} }],
          source: "x = 1",
        },
      ],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5,
    },
  ],
])("rejects %s", (_name, value) => {
  expect(() => importNotebook(Buffer.from(JSON.stringify(value)))).toThrow(
    new NotebookPortabilityError("INVALID_NOTEBOOK"),
  );
});

test("rejects malformed UTF-8, JSON and files over 20 MiB", () => {
  expect(() => importNotebook(Uint8Array.from([0xc3, 0x28]))).toThrow(
    new NotebookPortabilityError("INVALID_NOTEBOOK"),
  );
  expect(() => importNotebook(Buffer.from("{"))).toThrow(
    new NotebookPortabilityError("INVALID_NOTEBOOK"),
  );
  expect(() => importNotebook(new Uint8Array(20 * 1024 * 1024 + 1))).toThrow(
    new NotebookPortabilityError("LIMIT_EXCEEDED"),
  );
});
