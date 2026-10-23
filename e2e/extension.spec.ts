import { expect, test } from "@playwright/test";

test("loads NotebookPilot without needing an agent connection", async ({
  page,
}) => {
  await page.goto("/lab/index.html");
  await page
    .getByRole("tab", { name: "NotebookPilot", exact: true })
    .click({ timeout: 30_000 });
  const panel = page.getByRole("region", { name: "NotebookPilot workspace" });
  await expect(
    panel.getByRole("heading", { name: "NotebookPilot" }),
  ).toBeVisible();
  await expect(panel).toContainText("Open a notebook to get started.");
  await expect(panel).toContainText("Agent tools are not connected.");
  await page.getByRole("tab", { name: /^File Browser/ }).click();
  await page.getByText("welcome.ipynb", { exact: true }).dblclick();
  await page.getByRole("tab", { name: "NotebookPilot", exact: true }).click();
  await expect(panel).toContainText("welcome.ipynb");
  await page.screenshot({ path: "test-results/notebookpilot-workspace.png" });
  await page.getByTitle("Close welcome.ipynb", { exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Discard/ })
    .click();
  await expect(panel).toContainText("Open a notebook to get started.");
});
