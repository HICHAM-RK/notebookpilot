import { expect, test } from "@playwright/test";

test("mock transport requires separate edit and execution approvals", async ({
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
  await panel.getByRole("button", { name: "Dismiss proposal" }).click();
  await expect(
    panel.getByRole("button", { name: "Dismiss proposal" }),
  ).toHaveCount(0);
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
  async function requestRun() {
    return page.evaluate(async () => {
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
      const result = (
        await call("notebook_get_cells", { notebookId: context.notebookId })
      ).structuredContent;
      const cell = (
        result.cells as { cellId: string; sourceHash: string; type: string }[]
      ).find((cell) => cell.type === "code")!;
      return call("notebook_run_cells", {
        notebookId: context.notebookId,
        cells: [{ cellId: cell.cellId, expectedSourceHash: cell.sourceHash }],
      });
    });
  }
  await requestRun();
  await expect(
    panel.getByRole("button", { name: "Approve run" }),
  ).toBeVisible();
  await expect(page.locator(".jp-OutputArea-output")).toHaveCount(0);
  await panel.getByRole("button", { name: "Cancel run" }).click();
  await expect(page.locator(".jp-OutputArea-output")).toHaveCount(0);
  await panel.getByRole("button", { name: "Dismiss run" }).click();
  await expect(panel.getByRole("button", { name: "Dismiss run" })).toHaveCount(
    0,
  );
  const execution = await requestRun();
  await panel.getByRole("button", { name: "Approve run" }).click();
  await expect(page.locator(".jp-OutputArea-output")).toContainText(
    "inserted without running",
  );
  const outcome = await page.evaluate(async (requestId) => {
    const call = (
      window as unknown as {
        callTestTool: (name: string, input: unknown) => Promise<unknown>;
      }
    ).callTestTool;
    return call("notebook_get_execution", { requestId });
  }, execution.structuredContent.requestId);
  expect(outcome).toMatchObject({ structuredContent: { status: "succeeded" } });

  // A finite busy loop makes a failed interrupt observable without hanging CI.
  await page
    .getByRole("textbox")
    .first()
    .fill(
      "import time\npreserved_value = 42\nfinish = time.monotonic() + 15\nwhile time.monotonic() < finish:\n    pass\nprint('CANCELLATION_FAILED_FINISHED')",
    );
  const cancelled = await requestRun();
  const runReview = panel.getByRole("article", {
    name: `Run ${cancelled.structuredContent.requestId}`,
    exact: true,
  });
  await runReview.getByRole("button", { name: "Approve run" }).click();
  await expect(runReview.getByRole("status")).toHaveText("running");
  await runReview.getByRole("button", { name: "Cancel run" }).click();
  await expect(runReview.getByRole("status")).toHaveText("cancelled");
  await expect(page.locator(".jp-OutputArea-output")).toContainText(
    "KeyboardInterrupt",
    { timeout: 20_000 },
  );
  const stdout = page.locator(
    '.jp-OutputArea-output[data-mime-type="application/vnd.jupyter.stdout"]',
  );
  expect((await stdout.allTextContents()).join("\n")).not.toContain(
    "CANCELLATION_FAILED_FINISHED",
  );
  await page
    .getByRole("textbox")
    .first()
    .fill("print('PRESERVED', preserved_value)");
  await requestRun();
  await panel.getByRole("button", { name: "Approve run" }).click();
  await expect(page.locator(".jp-OutputArea-output")).toContainText(
    "PRESERVED 42",
  );

  await page
    .getByRole("textbox")
    .first()
    .fill(
      "import time\nfinish = time.monotonic() + 15\nwhile time.monotonic() < finish:\n    pass\nprint('RESTART_FAILED_FINISHED')",
    );
  const restarting = await requestRun();
  const restartReview = panel.getByRole("article", {
    name: `Run ${restarting.structuredContent.requestId}`,
    exact: true,
  });
  await restartReview.getByRole("button", { name: "Approve run" }).click();
  await expect(restartReview.getByRole("status")).toHaveText("running");
  await page.getByRole("menuitem", { name: "Kernel" }).click();
  await page.locator('[data-command="kernelmenu:restart"]').click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm Kernel Restart", exact: true })
    .click();
  await expect(restartReview.getByRole("status")).toHaveText("cancelled");
  await expect(
    panel.getByText("Waiting for an idle Python kernel before approval."),
  ).toHaveCount(0, { timeout: 60_000 });
  await page.getByRole("textbox").first().fill("print('RESTARTED', 6 * 7)");
  await requestRun();
  await panel.getByRole("button", { name: "Approve run" }).click();
  await expect(page.locator(".jp-OutputArea-output")).toContainText(
    "RESTARTED 42",
  );
  await page.screenshot({ path: "test-results/runtime-cancellation.png" });
});
