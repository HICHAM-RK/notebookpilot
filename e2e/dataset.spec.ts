import { expect, test } from "@playwright/test";

test("uploads, profiles and visibly executes analysis of a shared CSV", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const tools = new Map<
      string,
      {
        execute: (
          input: unknown,
          options: { signal: AbortSignal },
        ) => Promise<unknown>;
      }
    >();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: async (
          tool: {
            name: string;
            execute: (
              input: unknown,
              options: { signal: AbortSignal },
            ) => Promise<unknown>;
          },
          options: { signal: AbortSignal },
        ) => {
          tools.set(tool.name, tool);
          options.signal.addEventListener("abort", () =>
            tools.delete(tool.name),
          );
        },
      },
    });
    Object.assign(window, {
      callTestTool: (name: string, input: unknown) =>
        tools
          .get(name)!
          .execute(input, { signal: new AbortController().signal }),
    });
  });
  await page.goto("/lab/index.html");
  await page.getByText("welcome.ipynb", { exact: true }).dblclick();
  await page.getByRole("tab", { name: "NotebookPilot", exact: true }).click();
  const panel = page.getByRole("region", { name: "NotebookPilot workspace" });
  await panel.getByLabel("Notebook access").selectOption("write");

  await panel.getByLabel("Upload CSV").setInputFiles({
    name: "broken.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name,value\nAda\n"),
  });
  await expect(panel.getByRole("alert")).toContainText(
    "CSV could not be read near line 2.",
  );

  await panel.getByLabel("Upload CSV").setInputFiles({
    name: "people.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name,value\nAda,1\nBob,2\n"),
  });
  const dataset = panel.getByRole("article", { name: "Dataset people.csv" });
  await expect(dataset).toContainText("2 rows · 2 columns");
  await expect(panel.getByRole("alert")).toHaveCount(0);

  const discovered = await page.evaluate(async () => {
    const call = (
      window as unknown as {
        callTestTool: (
          name: string,
          input: unknown,
        ) => Promise<{ structuredContent: Record<string, unknown> }>;
      }
    ).callTestTool;
    const context = (await call("notebook_get_context", {})).structuredContent;
    const list = (
      await call("dataset_list", {
        notebookId: context.notebookId,
      })
    ).structuredContent;
    const entry = (
      list.datasets as Array<{ datasetId: string; fileName: string }>
    )[0];
    const profile = (
      await call("dataset_profile", {
        notebookId: context.notebookId,
        datasetId: entry.datasetId,
      })
    ).structuredContent;
    return { context, entry, profile };
  });
  expect(discovered.profile).toMatchObject({
    datasetId: discovered.entry.datasetId,
    fileName: discovered.entry.fileName,
    rowCount: 2,
    duplicateRowCount: 0,
  });
  expect(discovered.profile).not.toHaveProperty("sampleRows");

  await dataset.getByLabel("Share up to 5 raw rows with the agent").check();
  const shared = await page.evaluate(
    async ({ notebookId, datasetId }) => {
      const call = (
        window as unknown as {
          callTestTool: (
            name: string,
            input: unknown,
          ) => Promise<{ structuredContent: Record<string, unknown> }>;
        }
      ).callTestTool;
      return (await call("dataset_profile", { notebookId, datasetId }))
        .structuredContent;
    },
    {
      notebookId: discovered.context.notebookId as string,
      datasetId: discovered.entry.datasetId,
    },
  );
  expect(shared).toMatchObject({
    sampleRows: {
      headers: ["name", "value"],
      rows: [
        ["Ada", "1"],
        ["Bob", "2"],
      ],
    },
  });

  const inserted = await page.evaluate(
    async ({ notebookId, fileName }) => {
      const call = (
        window as unknown as {
          callTestTool: (
            name: string,
            input: unknown,
          ) => Promise<{ structuredContent: Record<string, unknown> }>;
        }
      ).callTestTool;
      const source = [
        "import csv",
        `with open(${JSON.stringify(fileName)}, newline='', encoding='utf-8-sig') as handle:`,
        "    uploaded_rows = list(csv.DictReader(handle))",
        "print('DATASET_ROWS', len(uploaded_rows))",
        "print('FIRST_NAME', uploaded_rows[0]['name'])",
      ].join("\n");
      return call("notebook_propose_insert", {
        notebookId,
        afterCellId: null,
        cellType: "code",
        source,
      });
    },
    {
      notebookId: discovered.context.notebookId as string,
      fileName: discovered.entry.fileName,
    },
  );
  expect(inserted.structuredContent).toMatchObject({ status: "pending" });
  await expect(page.locator(".jp-OutputArea-output")).toHaveCount(0);
  await panel.getByRole("button", { name: "Accept edit" }).click();
  await expect(page.getByRole("textbox").first()).toContainText("DATASET_ROWS");
  await expect(page.locator(".jp-OutputArea-output")).toHaveCount(0);

  await page.evaluate(async (notebookId) => {
    const call = (
      window as unknown as {
        callTestTool: (
          name: string,
          input: unknown,
        ) => Promise<{ structuredContent: Record<string, unknown> }>;
      }
    ).callTestTool;
    const cells = (await call("notebook_get_cells", { notebookId }))
      .structuredContent.cells as Array<{
      cellId: string;
      sourceHash: string;
      source: string;
    }>;
    const uploaded = cells.find((cell) =>
      cell.source.includes("DATASET_ROWS"),
    )!;
    await call("notebook_run_cells", {
      notebookId,
      cells: [
        {
          cellId: uploaded.cellId,
          expectedSourceHash: uploaded.sourceHash,
        },
      ],
    });
  }, discovered.context.notebookId as string);
  await expect(
    panel.getByRole("button", { name: "Approve run" }),
  ).toBeVisible();
  await expect(page.locator(".jp-OutputArea-output")).toHaveCount(0);
  await panel.getByRole("button", { name: "Approve run" }).click();
  await expect(page.locator(".jp-OutputArea-output")).toContainText(
    "DATASET_ROWS 2",
  );
  await expect(page.locator(".jp-OutputArea-output")).toContainText(
    "FIRST_NAME Ada",
  );

  await dataset.scrollIntoViewIfNeeded();
  await dataset.screenshot({ path: "test-results/dataset-panel.png" });
  await page.screenshot({ path: "test-results/dataset-flow.png" });

  await dataset.getByRole("button", { name: "Remove dataset" }).click();
  await expect(dataset).toHaveCount(0);
  const afterRemoval = await page.evaluate(async (notebookId) => {
    const call = (
      window as unknown as {
        callTestTool: (
          name: string,
          input: unknown,
        ) => Promise<{ structuredContent: Record<string, unknown> }>;
      }
    ).callTestTool;
    return (await call("dataset_list", { notebookId })).structuredContent;
  }, discovered.context.notebookId as string);
  expect(afterRemoval).toEqual({ datasets: [] });
});
