import { expect, test } from "@playwright/test";

test("executes the sample notebook in browser Python", async ({ page }) => {
  await page.goto("/lab/index.html");
  const notebook = page.getByText("welcome.ipynb", { exact: true });
  await expect(notebook).toBeVisible({ timeout: 60_000 });
  await notebook.dblclick();
  await expect(
    page
      .getByRole("paragraph")
      .filter({ hasText: "Run the next cell to verify browser Python." }),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("textbox").click();
  await page
    .getByRole("button", { name: "Run this cell and advance", exact: false })
    .click();
  await expect(page.locator(".jp-OutputArea-output")).toContainText(
    "Rows: 4; missing ages: 1",
    { timeout: 120_000 },
  );
});
