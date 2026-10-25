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

test("previews unsaved cells and honors human visibility choices", async ({
  page,
}) => {
  await page.goto("/lab/index.html");
  await page.getByText("welcome.ipynb", { exact: true }).dblclick();
  await page.getByRole("textbox").fill("print('unsaved private analysis')");
  await page.getByRole("tab", { name: "NotebookPilot", exact: true }).click();
  const panel = page.getByRole("region", { name: "NotebookPilot workspace" });
  await panel.getByRole("button", { name: "Preview agent access" }).click();
  await expect(panel.locator(".np-preview")).toContainText(
    "unsaved private analysis",
  );
  await panel.getByText(/^Cell permissions/).click();
  await panel.getByLabel("Cell 2 access").selectOption("hidden");
  await expect(panel.locator(".np-preview")).toHaveCount(0);
  await panel.getByRole("button", { name: "Preview agent access" }).click();
  await expect(panel.locator(".np-preview")).not.toContainText(
    "unsaved private analysis",
  );
  await panel.getByLabel("Notebook access").focus();
  // Native type-ahead also works in headless macOS, where arrow selection does not.
  await panel.getByLabel("Notebook access").press("h");
  await panel.getByLabel("Notebook access").press("Enter");
  await expect(panel.getByLabel("Notebook access")).toHaveValue("hidden");
  await panel.getByRole("button", { name: "Preview agent access" }).click();
  await expect(panel.getByRole("alert")).toContainText(
    "Notebook is unavailable for agent access.",
  );
});
