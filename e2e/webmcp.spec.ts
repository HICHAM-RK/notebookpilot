import { expect, test } from "@playwright/test";

test("registers only the closed bounded WebMCP surface", async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map<
      string,
      {
        name: string;
        inputSchema?: Record<string, unknown>;
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
          tool: typeof tools extends Map<string, infer T> ? T : never,
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
      inspectTestTools: () =>
        Array.from(tools.values()).map(({ name, inputSchema }) => ({
          name,
          inputSchema,
        })),
      callTestTool: (name: string, input: unknown) =>
        tools
          .get(name)!
          .execute(input, { signal: new AbortController().signal }),
    });
  });
  await page.goto("/lab/index.html");
  await page.getByRole("tab", { name: "NotebookPilot", exact: true }).click();

  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (
            window as unknown as {
              inspectTestTools: () => {
                name: string;
                inputSchema: Record<string, unknown>;
              }[];
            }
          ).inspectTestTools(),
        ),
      { timeout: 30_000 },
    )
    .toHaveLength(13);

  const names = await page.evaluate(() =>
    (
      window as unknown as {
        inspectTestTools: () => { name: string }[];
      }
    )
      .inspectTestTools()
      .map((tool) => tool.name),
  );
  expect(names).toEqual([
    "notebook_get_context",
    "notebook_get_cells",
    "notebook_propose_update",
    "notebook_propose_insert",
    "notebook_get_proposal",
    "notebook_run_cells",
    "notebook_get_execution",
    "dataset_list",
    "dataset_profile",
    "experiment_record",
    "experiment_compare",
    "notebook_audit",
    "report_generate",
  ]);
  expect(names.some((name) => /approv|accept|reject/i.test(name))).toBe(false);

  const call = (name: string, input: unknown) =>
    page.evaluate(
      async ({ toolName, toolInput }) =>
        (
          window as unknown as {
            callTestTool: (name: string, input: unknown) => Promise<unknown>;
          }
        ).callTestTool(toolName, toolInput),
      { toolName: name, toolInput: input },
    );
  await expect(
    call("notebook_get_context", { approved: true }),
  ).resolves.toMatchObject({
    isError: true,
    structuredContent: { error: { code: "INVALID_ARGUMENT" } },
  });
  await expect(
    call("notebook_propose_insert", {
      notebookId: "notebook",
      afterCellId: null,
      cellType: "code",
      source: "😀".repeat(70_000),
    }),
  ).resolves.toMatchObject({
    isError: true,
    structuredContent: { error: { code: "LIMIT_EXCEEDED" } },
  });
});
