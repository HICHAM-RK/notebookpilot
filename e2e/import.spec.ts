import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("reviews, imports and downloads a Colab-compatible notebook without autorun", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, { notebookPilotImportedHtmlExecuted: false });
  });
  await page.goto("/lab/index.html");
  await page.getByText("welcome.ipynb", { exact: true }).dblclick();
  await page.getByRole("tab", { name: "NotebookPilot", exact: true }).click();
  const panel = page.getByRole("region", { name: "NotebookPilot workspace" });

  const imported = JSON.parse(
    readFileSync(resolve("content/fixtures/colab.ipynb"), "utf8"),
  );
  imported.cells[1].execution_count = 7;
  imported.cells[1].source.push("\nraise RuntimeError('AUTORUN_OCCURRED')");
  imported.cells[1].outputs = [
    {
      output_type: "display_data",
      data: {
        "text/plain": ["Imported output stays data"],
        "text/html": [
          '<img src=x onerror="window.notebookPilotImportedHtmlExecuted=true"><script>window.notebookPilotImportedHtmlExecuted=true</script>',
        ],
      },
      metadata: {},
    },
  ];

  await panel.getByLabel("Choose notebook").setInputFiles({
    name: "colab-example.ipynb",
    mimeType: "application/x-ipynb+json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  const review = panel.getByRole("group", { name: "Import review" });
  await expect(review).toContainText("colab-example.ipynb");
  await expect(review).toContainText("2 cells");
  await expect(review).toContainText("google.colab APIs");
  await expect(review).toContainText("Google Drive");
  await expect(review).toContainText("shell commands");
  await expect(review).toContainText("GPU runtime");
  await expect(review).toContainText("Active HTML, SVG, or JavaScript output");
  await expect(
    page.getByRole("heading", { name: "NotebookPilot", level: 1 }),
  ).toBeVisible();

  await review.getByRole("button", { name: "Apply import" }).click();
  await expect(
    panel.getByText(/Notebook imported without running code/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Colab portability fixture" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox").last()).toContainText(
    "AUTORUN_OCCURRED",
  );
  await expect(page.locator(".jp-OutputArea-output")).not.toContainText(
    "AUTORUN_OCCURRED",
  );
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            notebookPilotImportedHtmlExecuted: boolean;
          }
        ).notebookPilotImportedHtmlExecuted,
    ),
  ).toBe(false);

  const downloadPromise = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Download notebook" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("welcome-notebookpilot.ipynb");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(readFileSync(downloadPath!, "utf8"));
  expect(exported.nbformat).toBe(4);
  expect(exported.metadata.custom_notebook_key).toEqual({ nested: [1, 2, 3] });
  expect(exported.cells[0].metadata.custom_cell_key).toEqual({ kept: true });
  expect(
    Array.isArray(exported.cells[1].source)
      ? exported.cells[1].source.join("")
      : exported.cells[1].source,
  ).toContain("AUTORUN_OCCURRED");
  expect(exported.cells[1].outputs[0].data["text/plain"]).toEqual([
    "Imported output stays data",
  ]);
  expect(exported.cells[1].outputs[0].data).not.toHaveProperty("text/html");
});
