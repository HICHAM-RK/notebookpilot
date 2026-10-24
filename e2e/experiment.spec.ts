import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

type ToolResult = { structuredContent: Record<string, unknown> };

async function requestRun(page: Page, sourceNeedle: string) {
  return page.evaluate(async (needle) => {
    const call = (
      window as unknown as {
        callTestTool: (name: string, input: unknown) => Promise<ToolResult>;
      }
    ).callTestTool;
    const context = (await call("notebook_get_context", {})).structuredContent;
    const cells = (
      await call("notebook_get_cells", {
        notebookId: context.notebookId,
      })
    ).structuredContent.cells as Array<{
      cellId: string;
      sourceHash: string;
      source: string;
    }>;
    const cell = cells.find((candidate) => candidate.source.includes(needle));
    if (!cell) throw new Error(`Missing generated cell: ${needle}`);
    const request = await call("notebook_run_cells", {
      notebookId: context.notebookId,
      cells: [{ cellId: cell.cellId, expectedSourceHash: cell.sourceHash }],
    });
    return {
      notebookId: context.notebookId as string,
      requestId: request.structuredContent.requestId as string,
    };
  }, sourceNeedle);
}

async function approveAndWait(
  page: Page,
  panel: ReturnType<Page["getByRole"]>,
  request: { requestId: string },
  expectedStatus: "succeeded" | "failed" = "succeeded",
) {
  await panel.getByRole("button", { name: "Approve run" }).last().click();
  await expect
    .poll(
      () =>
        page.evaluate(async ({ requestId }) => {
          const call = (
            window as unknown as {
              callTestTool: (
                name: string,
                input: unknown,
              ) => Promise<ToolResult>;
            }
          ).callTestTool;
          return (await call("notebook_get_execution", { requestId }))
            .structuredContent.status;
        }, request),
      { timeout: 120_000 },
    )
    .toBe(expectedStatus);
}

function resultFrom(text: string): Record<string, unknown> {
  const marker = "NOTEBOOKPILOT_RESULT ";
  const start = text.indexOf(marker);
  if (start < 0) throw new Error("Missing NotebookPilot result marker");
  return JSON.parse(text.slice(start + marker.length).trim());
}

test("runs repeatable logistic and random-forest experiments after human approvals", async ({
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
    name: "classification.csv",
    mimeType: "text/csv",
    buffer: readFileSync(resolve("content/fixtures/classification.csv")),
  });
  await expect(
    panel.getByRole("article", { name: "Dataset classification.csv" }),
  ).toContainText("24 rows · 4 columns");

  await panel.getByLabel("Experiment dataset").selectOption({
    label: "classification.csv",
  });
  await panel.getByLabel("Experiment target").selectOption("target");
  await panel.getByLabel("age", { exact: true }).click();
  await panel.getByLabel("income", { exact: true }).click();
  await panel.getByLabel("segment", { exact: true }).click();
  await panel.getByRole("button", { name: "Create training proposal" }).click();
  await expect(panel.getByText(/Training cell proposed/)).toBeVisible();
  await expect(page.locator(".jp-OutputArea-output")).toHaveCount(0);
  await panel.getByRole("button", { name: "Accept edit" }).last().click();
  await expect(page.locator(".jp-OutputArea-output")).toHaveCount(0);

  const firstRequest = await requestRun(
    page,
    "LogisticRegression(max_iter=1000",
  );
  await approveAndWait(page, panel, firstRequest);
  const logisticOutput = page
    .locator(".jp-OutputArea-output")
    .filter({ hasText: "NOTEBOOKPILOT_RESULT" })
    .first();
  const first = resultFrom((await logisticOutput.textContent()) ?? "");
  expect(first).toMatchObject({
    status: "succeeded",
    model: "logistic_regression",
    seed: 42,
    testFraction: 0.2,
    classOrder: ["no", "yes"],
  });
  expect(first).toHaveProperty("versions.pythonPackages.scikitLearn");
  expect(first).toHaveProperty("metrics.confusionMatrix");
  expect(first).toHaveProperty("preprocessing.numericMedians.age");
  expect(first).toHaveProperty("preprocessing.categoricalModes.segment", "A");
  expect(
    (first.preprocessing as { numericMedians: { age: number } }).numericMedians
      .age,
  ).not.toBe(45);

  const repeatRequest = await requestRun(
    page,
    "LogisticRegression(max_iter=1000",
  );
  await approveAndWait(page, panel, repeatRequest);
  const repeated = resultFrom((await logisticOutput.textContent()) ?? "");
  expect(repeated.splitFingerprint).toBe(first.splitFingerprint);
  expect(repeated.metrics).toEqual(first.metrics);

  await panel.getByLabel("Experiment model").selectOption("random_forest");
  await panel.getByRole("button", { name: "Create training proposal" }).click();
  await panel.getByRole("button", { name: "Accept edit" }).last().click();
  const forestRequest = await requestRun(
    page,
    "RandomForestClassifier(n_estimators=100",
  );
  await approveAndWait(page, panel, forestRequest);
  const forestText =
    (await page
      .locator(".jp-OutputArea-output")
      .filter({ hasText: "NOTEBOOKPILOT_RESULT" })
      .first()
      .textContent()) ?? "";
  const forest = resultFrom(forestText);
  expect(forest).toMatchObject({
    status: "succeeded",
    model: "random_forest",
    seed: 42,
    testFraction: 0.2,
  });
  expect(forest.splitFingerprint).toBe(first.splitFingerprint);

  await panel.getByLabel("Upload CSV").setInputFiles({
    name: "impossible.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("feature,target\n1,rare\n2,common\n3,common\n"),
  });
  await panel.getByLabel("Experiment dataset").selectOption({
    label: "impossible.csv",
  });
  await panel.getByLabel("Experiment target").selectOption("target");
  await panel.getByLabel("feature", { exact: true }).click();
  await panel.getByRole("button", { name: "Create training proposal" }).click();
  await panel.getByRole("button", { name: "Accept edit" }).last().click();
  const impossibleFileName = await page.evaluate(async () => {
    const call = (
      window as unknown as {
        callTestTool: (name: string, input: unknown) => Promise<ToolResult>;
      }
    ).callTestTool;
    const context = (await call("notebook_get_context", {})).structuredContent;
    const datasets = (
      await call("dataset_list", { notebookId: context.notebookId })
    ).structuredContent.datasets as Array<{
      displayName: string;
      fileName: string;
    }>;
    return datasets.find((dataset) => dataset.displayName === "impossible.csv")!
      .fileName;
  });
  const impossibleRequest = await requestRun(
    page,
    `FILE_NAME = ${JSON.stringify(impossibleFileName)}`,
  );
  await approveAndWait(page, panel, impossibleRequest, "failed");
  await expect(
    page
      .locator(".jp-OutputArea-output")
      .filter({ hasText: "Each target class needs at least two rows" })
      .first(),
  ).toBeVisible();
});
