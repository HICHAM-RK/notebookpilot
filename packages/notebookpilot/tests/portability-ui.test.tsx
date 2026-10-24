import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortabilityPanel } from "../src/ui/portability";

const handlers = {
  onChoose: (_file: File) => {},
  onApply: () => {},
  onCancel: () => {},
  onExport: () => {},
};

test("explains import safety and exposes import and export controls", () => {
  const markup = renderToStaticMarkup(
    <PortabilityPanel
      pending={false}
      importedName={null}
      cellCount={null}
      warnings={[]}
      error={null}
      status={null}
      {...handlers}
    />,
  );
  expect(markup).toContain("Imported code never runs automatically.");
  expect(markup).toContain("Choose notebook");
  expect(markup).toContain(
    'accept=".ipynb,application/x-ipynb+json,application/json"',
  );
  expect(markup).toContain("Download notebook");
});

test("requires a second human action and renders warnings as inert text", () => {
  const markup = renderToStaticMarkup(
    <PortabilityPanel
      pending={false}
      importedName={"hostile<script>alert(1)</script>.ipynb"}
      cellCount={2}
      warnings={[
        {
          code: "COLAB_API",
          message: "<script>warning</script>",
        },
      ]}
      error={null}
      status={null}
      {...handlers}
    />,
  );
  expect(markup).toContain("Apply import");
  expect(markup).toContain("Cancel import");
  expect(markup).toContain("2 cells");
  expect(markup).toContain("&lt;script&gt;warning&lt;/script&gt;");
  expect(markup).not.toContain("<script>");
});

test("shows checking, error and completion states", () => {
  const pending = renderToStaticMarkup(
    <PortabilityPanel
      pending
      importedName={null}
      cellCount={null}
      warnings={[]}
      error={null}
      status={null}
      {...handlers}
    />,
  );
  expect(pending).toContain("Checking notebook…");
  expect(pending).toContain("disabled");

  const result = renderToStaticMarkup(
    <PortabilityPanel
      pending={false}
      importedName={null}
      cellCount={null}
      warnings={[]}
      error="Notebook file is invalid."
      status="Imported safely."
      {...handlers}
    />,
  );
  expect(result).toContain('role="alert"');
  expect(result).toContain("Imported safely.");
});
