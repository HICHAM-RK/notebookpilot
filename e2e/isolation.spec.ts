import { expect, test } from "@playwright/test";

test("page and Python worker run with shared-memory isolation", async ({
  page,
}) => {
  await page.goto("/lab/index.html");
  expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
  await page.getByText("welcome.ipynb", { exact: true }).dblclick();
  const codeCell = page.getByRole("textbox").last();
  await codeCell.fill(
    "from js import crossOriginIsolated, SharedArrayBuffer\nprint('WORKER_ISOLATED', bool(crossOriginIsolated), SharedArrayBuffer.new(1).byteLength)",
  );
  await codeCell.press("Shift+Enter");
  await expect(
    page
      .locator(".jp-OutputArea-output")
      .filter({ hasText: "WORKER_ISOLATED" }),
  ).toContainText("WORKER_ISOLATED True 1", { timeout: 60_000 });
});
