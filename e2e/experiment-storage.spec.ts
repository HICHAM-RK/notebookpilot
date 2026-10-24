import { expect, test } from "@playwright/test";

test("keeps the notebook usable and shows corrupt experiment storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("notebookpilot.experiments.v1", "not-json");
  });
  await page.goto("/lab/index.html");
  await page.getByText("welcome.ipynb", { exact: true }).dblclick();
  await page.getByRole("tab", { name: "NotebookPilot", exact: true }).click();
  const panel = page.getByRole("region", { name: "NotebookPilot workspace" });
  await expect(panel.getByRole("alert")).toContainText(
    "Experiment storage is unavailable",
  );
  await expect(panel.getByText("No saved experiments.")).toBeVisible();
});
