import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

type ToolResult = {
  isError?: boolean;
  structuredContent: Record<string, unknown>;
};

async function openPanel(page: import("@playwright/test").Page) {
  await page.goto("/lab/index.html");
  await page.getByText("welcome.ipynb", { exact: true }).dblclick();
  await page.getByRole("tab", { name: "NotebookPilot", exact: true }).click();
  return page.getByRole("region", { name: "NotebookPilot workspace" });
}

test("NotebookPilot panel has no axe violations and supports keyboard control", async ({
  page,
}) => {
  const panel = await openPanel(page);
  await expect(
    panel.getByRole("heading", { name: "NotebookPilot" }),
  ).toBeVisible();

  const initial = await new AxeBuilder({ page })
    .include(".np-workspace")
    .analyze();
  expect(initial.violations).toEqual([]);

  const access = panel.getByLabel("Notebook access");
  await access.focus();
  await expect(access).toBeFocused();
  await access.press("a");
  await access.press("Enter");
  await expect(access).toHaveValue("write");

  const permissions = panel.getByText(/^Cell permissions/);
  await permissions.focus();
  await expect(permissions).toBeFocused();
  await permissions.press("Enter");
  await expect(panel.getByLabel("Cell 1 access")).toBeVisible();

  const preview = panel.getByRole("button", { name: "Preview agent access" });
  await preview.focus();
  await expect(preview).toBeFocused();
  const outline = await preview.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).not.toBe("0px");
  await preview.press("Enter");
  await expect(panel.locator(".np-preview")).toContainText("cells visible");

  const expanded = await new AxeBuilder({ page })
    .include(".np-workspace")
    .analyze();
  expect(expanded.violations).toEqual([]);
});

test("fresh profile refuses unauthorized execution and conceals hidden cells", async ({
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
      callSecurityTool: (name: string, input: unknown) =>
        tools
          .get(name)!
          .execute(input, { signal: new AbortController().signal }),
    });
  });
  const panel = await openPanel(page);
  const call = (name: string, input: unknown) =>
    page.evaluate(
      async ({ name, input }) =>
        (
          window as unknown as {
            callSecurityTool: (
              toolName: string,
              args: unknown,
            ) => Promise<ToolResult>;
          }
        ).callSecurityTool(name, input),
      { name, input },
    );
  const context = await call("notebook_get_context", {});
  const notebookId = context.structuredContent.notebookId as string;
  const cells = await call("notebook_get_cells", { notebookId });
  const first = (
    cells.structuredContent.cells as {
      cellId: string;
      sourceHash: string;
    }[]
  )[0];

  const unauthorized = await call("notebook_run_cells", {
    notebookId,
    cells: [{ cellId: first.cellId, expectedSourceHash: first.sourceHash }],
  });
  expect(unauthorized).toMatchObject({
    isError: true,
    structuredContent: { error: { code: "ACCESS_DENIED" } },
  });
  await expect(panel).toContainText("No run requests.");

  await panel.getByText(/^Cell permissions/).click();
  await panel.getByLabel("Cell 1 access").selectOption("hidden");
  const scoped = await call("notebook_get_cells", { notebookId });
  expect(
    (scoped.structuredContent.cells as { cellId: string }[]).some(
      (cell) => cell.cellId === first.cellId,
    ),
  ).toBe(false);

  await panel.getByLabel("Notebook access").selectOption("hidden");
  const hidden = await call("notebook_get_cells", { notebookId });
  expect(hidden).toMatchObject({
    isError: true,
    structuredContent: { error: { code: "NOT_FOUND" } },
  });
});

test("hostile upload names and values remain inert text", async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { notebookPilotUploadExecuted: false });
  });
  const panel = await openPanel(page);
  const payload =
    "name,value\n<script>window.notebookPilotUploadExecuted=true</script>,=2+2\n";
  await panel.getByLabel("Upload CSV").setInputFiles({
    name: '<img src=x onerror="window.notebookPilotUploadExecuted=true">.csv',
    mimeType: "text/csv",
    buffer: Buffer.from(payload),
  });
  await expect(panel).toContainText("window.notebookPilotUploadExecuted=true");
  expect(await panel.locator("script, img").count()).toBe(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { notebookPilotUploadExecuted: boolean })
          .notebookPilotUploadExecuted,
    ),
  ).toBe(false);
});
