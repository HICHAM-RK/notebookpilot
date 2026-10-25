import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

type ToolResult = { structuredContent: Record<string, unknown> };

test("prepares a scoped report and downloads a standalone offline document", async ({
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
  const reports = panel
    .getByRole("heading", { name: "Portable reports" })
    .locator("..");
  await expect(reports).toContainText("Raw dataset rows are excluded");

  const prepared = await page.evaluate(async () => {
    const call = (
      window as unknown as {
        callTestTool: (name: string, input: unknown) => Promise<ToolResult>;
      }
    ).callTestTool;
    const context = (await call("notebook_get_context", {})).structuredContent;
    return call("report_generate", {
      notebookId: context.notebookId,
      runIds: [],
      format: "html",
    });
  });
  expect(prepared.structuredContent).toMatchObject({
    fileName: expect.stringMatching(/^notebookpilot-report-.+\.html$/),
    bytes: expect.any(Number),
  });
  expect(prepared.structuredContent).not.toHaveProperty("content");

  const reportArticle = reports.getByRole("article").last();
  await expect(reportArticle).toContainText(".html");
  const downloadPromise = page.waitForEvent("download");
  await reportArticle.getByRole("button", { name: "Download report" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.html$/);
  const path = await download.path();
  if (!path) throw new Error("Report download path unavailable");
  const html = await readFile(path, "utf8");
  expect(html).toContain("<!doctype html>");
  expect(html).toContain("Raw dataset rows");
  expect(html).toContain("No runs selected");
  expect(html).not.toMatch(/<script[\s>]/i);
  expect(html).not.toMatch(/<(?:img|link|iframe|object|embed)[\s>]/i);

  await page.context().setOffline(true);
  const offline = await page.context().newPage();
  const externalRequests: string[] = [];
  offline.on("request", (request) => externalRequests.push(request.url()));
  await offline.setContent(html, { waitUntil: "load" });
  await expect(
    offline.getByRole("heading", {
      name: "NotebookPilot reproducibility report",
    }),
  ).toBeVisible();
  await expect(offline.getByText("No runs selected.")).toBeVisible();
  expect(externalRequests).toEqual([]);
  await offline.close();
  await page.context().setOffline(false);

  await reports.getByLabel("Report format").selectOption("markdown");
  await reports.getByRole("button", { name: "Prepare report" }).click();
  await expect(reports.getByRole("article").last()).toContainText(".md");
});
