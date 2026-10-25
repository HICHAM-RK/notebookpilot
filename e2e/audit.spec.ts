import { expect, test } from "@playwright/test";

type ToolResult = { structuredContent: Record<string, unknown> };

test("audits visible cells, navigates to evidence, and detects stale findings", async ({
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

  const inserted = await page.evaluate(async () => {
    const call = (
      window as unknown as {
        callTestTool: (name: string, input: unknown) => Promise<ToolResult>;
      }
    ).callTestTool;
    const context = (await call("notebook_get_context", {})).structuredContent;
    return call("notebook_propose_insert", {
      notebookId: context.notebookId,
      afterCellId: null,
      cellType: "code",
      source: 'data = open("/tmp/private.csv").read()',
    });
  });
  await panel.getByRole("button", { name: "Accept edit" }).click();

  const audit = panel
    .getByRole("heading", { name: "Reproducibility audit" })
    .locator("..");
  await expect(audit).toContainText("visible cells");
  await expect(audit).toContainText("not a security or correctness verdict");
  await audit.getByRole("button", { name: "Run audit" }).click();
  await expect(audit.getByText("Absolute Path")).toBeVisible();
  await expect(audit.getByText(/Score: \d+\/100/)).toBeVisible();

  const toolAudit = await page.evaluate(async () => {
    const call = (
      window as unknown as {
        callTestTool: (name: string, input: unknown) => Promise<ToolResult>;
      }
    ).callTestTool;
    const context = (await call("notebook_get_context", {})).structuredContent;
    return call("notebook_audit", { notebookId: context.notebookId });
  });
  expect(toolAudit.structuredContent).toMatchObject({
    findings: expect.arrayContaining([
      expect.objectContaining({ ruleId: "absolute-path", stale: false }),
    ]),
  });
  expect(JSON.stringify(toolAudit)).not.toContain("private analysis");

  await audit.getByRole("button", { name: "Go to evidence" }).first().click();
  await expect(page.locator(".jp-Cell.jp-mod-active")).toContainText(
    "/tmp/private.csv",
  );

  await page.evaluate(async () => {
    const call = (
      window as unknown as {
        callTestTool: (name: string, input: unknown) => Promise<ToolResult>;
      }
    ).callTestTool;
    const context = (await call("notebook_get_context", {})).structuredContent;
    const cells = (
      await call("notebook_get_cells", { notebookId: context.notebookId })
    ).structuredContent.cells as Array<{
      cellId: string;
      sourceHash: string;
      source: string;
    }>;
    const cell = cells.find((item) => item.source.includes("/tmp/private.csv"));
    if (!cell) throw new Error("Inserted audit cell not found");
    await call("notebook_propose_update", {
      notebookId: context.notebookId,
      cellId: cell.cellId,
      expectedSourceHash: cell.sourceHash,
      source: 'data = open("data/private.csv").read()',
    });
  });
  await panel.getByRole("button", { name: "Accept edit" }).click();
  await expect(
    audit.getByText("Changed since audit. Run the audit again."),
  ).toBeVisible();
  await expect(
    audit.getByRole("button", { name: "Go to evidence" }),
  ).toHaveCount(0);

  await audit.getByRole("button", { name: "Run audit" }).click();
  await expect(audit.getByText("Absolute Path")).toHaveCount(0);
  expect(inserted.structuredContent).toHaveProperty("proposalId");
});
