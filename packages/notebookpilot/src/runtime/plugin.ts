import type { JupyterFrontEndPlugin } from "@jupyterlab/application";
import { PageConfig, URLExt } from "@jupyterlab/coreutils";
import { IKernelSpecs } from "@jupyterlite/services";
import { IServiceWorkerManager } from "@jupyterlite/apputils";
import { InterruptibleKernel } from "./kernel";

export const pythonPlugin: JupyterFrontEndPlugin<void> = {
  id: "@notebookpilot/extension:python",
  autoStart: true,
  requires: [IKernelSpecs],
  optional: [IServiceWorkerManager],
  activate: (
    app,
    specs: IKernelSpecs,
    serviceWorker: IServiceWorkerManager | null,
  ) => {
    const settings =
      JSON.parse(PageConfig.getOption("litePluginSettings") || "{}")[
        "@jupyterlite/pyodide-kernel-extension:kernel"
      ] || {};
    const baseUrl = PageConfig.getBaseUrl();
    const loadPyodideOptions = { ...(settings.loadPyodideOptions || {}) };
    for (const [key, value] of Object.entries(loadPyodideOptions))
      if (key.endsWith("URL") && typeof value === "string")
        loadPyodideOptions[key] = new URL(value, baseUrl).href;
    specs.register({
      spec: {
        name: "python",
        display_name: "Python (NotebookPilot)",
        language: "python",
        argv: [],
        resources: {},
      },
      create: async (options) =>
        new InterruptibleKernel({
          ...options,
          pyodideUrl: URLExt.parse(
            settings.pyodideUrl ||
              "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs",
          ).href,
          pipliteWheelUrl: settings.pipliteWheelUrl
            ? URLExt.parse(settings.pipliteWheelUrl).href
            : undefined,
          pipliteUrls: (settings.pipliteUrls || []).map(
            (url: string) => URLExt.parse(url).href,
          ),
          disablePyPIFallback: !!settings.disablePyPIFallback,
          loadPyodideOptions,
          contentsManager: app.serviceManager.contents,
          mountDrive: crossOriginIsolated || !!serviceWorker?.enabled,
          browsingContextId: serviceWorker?.browsingContextId,
        }),
    });
  },
};
