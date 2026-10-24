import { expect, test } from "@playwright/test";

test("mock transport proposal requires human review and never executes", async ({
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
  async function propose(source: string) {
    return page.evaluate(async (replacement) => {
      const call = (
        window as unknown as {
          callTestTool: (
            name: string,
            input: unknown,
          ) => Promise<{ structuredContent: Record<string, unknown> }>;
        }
      ).callTestTool;
      const context = (await call("notebook_get_context", {}))
        .structuredContent;
      const cells = (
        await call("notebook_get_cells", { notebookId: context.notebookId })
      ).structuredContent.cells as {
        cellId: string;
        sourceHash: string;
        type: string;
      }[];
      const cell = cells.find((cell) => cell.type === "code")!;
      return call("notebook_propose_update", {
        notebookId: context.notebookId,
        cellId: cell.cellId,
        expectedSourceHash: cell.sourceHash,
        source: replacement,
      });
    }, source);
  }
  const before = await page.getByRole("textbox").innerText();
  const rejected = await propose("print('reviewed but not executed')");
  await expect(
    panel.getByRole("button", { name: "Reject edit" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Reject edit" }).click();
  async function status(proposalId: unknown) {
    return page.evaluate(async (id) => {
      const call = (
        window as unknown as {
          callTestTool: (name: string, input: unknown) => Promise<unknown>;
        }
      ).callTestTool;
      return call("notebook_get_proposal", { proposalId: id });
    }, proposalId);
  }
  expect(await status(rejected.structuredContent.proposalId)).toMatchObject({
    structuredContent: { status: "denied" },
  });
  await expect(page.getByRole("textbox")).toHaveText(before, {
    useInnerText: true,
  });
  const accepted = await propose("print('reviewed but not executed')");
  await panel.getByRole("button", { name: "Accept edit" }).focus();
  await panel.getByRole("button", { name: "Accept edit" }).press("Enter");
  expect(await status(accepted.structuredContent.proposalId)).toMatchObject({
    structuredContent: { status: "accepted" },
  });
  await expect(page.getByRole("textbox")).toHaveText(
    "print('reviewed but not executed')",
  );
  await expect(page.locator(".jp-OutputArea-output")).toHaveCount(0);
  await propose("print('stale replacement')");
  await page.getByRole("textbox").fill("print('human changed it')");
  await expect(panel.getByRole("button", { name: "Accept edit" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("textbox")).toHaveText(
    "print('human changed it')",
  );
  const inserted = await page.evaluate(async () => {
    const call = (
      window as unknown as {
        callTestTool: (
          name: string,
          input: unknown,
        ) => Promise<{ structuredContent: Record<string, unknown> }>;
      }
    ).callTestTool;
    const context = (await call("notebook_get_context", {})).structuredContent;
    return call("notebook_propose_insert", {
      notebookId: context.notebookId,
      afterCellId: null,
      cellType: "code",
      source: "print('inserted without running')",
    });
  });
  await expect(page.getByRole("textbox")).toHaveCount(1);
  await panel.getByRole("button", { name: "Accept edit" }).click();
  await expect(page.getByRole("textbox")).toHaveCount(2);
  await expect(page.getByRole("textbox").first()).toHaveText(
    "print('inserted without running')",
  );
  expect(await status(inserted.structuredContent.proposalId)).toMatchObject({
    structuredContent: { status: "accepted" },
  });
  await expect(page.locator(".jp-OutputArea-output")).toHaveCount(0);
});
