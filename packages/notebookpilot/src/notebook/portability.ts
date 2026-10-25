export const MAX_NOTEBOOK_BYTES = 20 * 1024 * 1024;

export type NotebookJson = {
  cells: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  nbformat: 4;
  nbformat_minor: number;
  [key: string]: unknown;
};

export type PortabilityWarningCode =
  | "COLAB_API"
  | "DRIVE_MOUNT"
  | "SHELL_COMMAND"
  | "GPU_RUNTIME"
  | "ACTIVE_OUTPUT_REMOVED";

export interface PortabilityWarning {
  code: PortabilityWarningCode;
  message: string;
}

export class NotebookPortabilityError extends Error {
  constructor(public readonly code: "INVALID_NOTEBOOK" | "LIMIT_EXCEEDED") {
    super(code);
  }
}

const warningMessages: Record<PortabilityWarningCode, string> = {
  COLAB_API:
    "This notebook uses google.colab APIs, which are unavailable in NotebookPilot.",
  DRIVE_MOUNT:
    "This notebook mounts Google Drive. Upload required files separately.",
  SHELL_COMMAND:
    "This notebook contains Colab/IPython shell commands that may not work in Pyodide.",
  GPU_RUNTIME:
    "This notebook expects a GPU runtime. NotebookPilot runs Python in the browser without a Colab GPU.",
  ACTIVE_OUTPUT_REMOVED:
    "Active HTML, SVG, or JavaScript output was removed during import. Plain output remains available.",
};

const activeOutputTypes = new Set([
  "text/html",
  "image/svg+xml",
  "application/javascript",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validSource(value: unknown): boolean {
  return (
    typeof value === "string" ||
    (Array.isArray(value) && value.every((part) => typeof part === "string"))
  );
}

function validExecutionCount(value: unknown): boolean {
  return value === null || (Number.isInteger(value) && (value as number) >= 0);
}

function validOutput(value: unknown): boolean {
  if (!isRecord(value) || typeof value.output_type !== "string") return false;
  if (value.output_type === "stream") {
    return (
      (value.name === "stdout" || value.name === "stderr") &&
      validSource(value.text)
    );
  }
  if (value.output_type === "display_data") {
    return isRecord(value.data) && isRecord(value.metadata);
  }
  if (value.output_type === "execute_result") {
    return (
      isRecord(value.data) &&
      isRecord(value.metadata) &&
      validExecutionCount(value.execution_count)
    );
  }
  if (value.output_type === "error") {
    return (
      typeof value.ename === "string" &&
      typeof value.evalue === "string" &&
      Array.isArray(value.traceback) &&
      value.traceback.every((line) => typeof line === "string")
    );
  }
  return false;
}

function validateCell(value: unknown): value is Record<string, unknown> {
  if (
    !isRecord(value) ||
    !isRecord(value.metadata) ||
    !validSource(value.source)
  )
    return false;
  if (
    value.cell_type !== "code" &&
    value.cell_type !== "markdown" &&
    value.cell_type !== "raw"
  )
    return false;
  if (value.id !== undefined && typeof value.id !== "string") return false;
  if (value.cell_type === "code") {
    if (!Array.isArray(value.outputs) || !value.outputs.every(validOutput))
      return false;
    if (!validExecutionCount(value.execution_count)) return false;
  }
  if (value.attachments !== undefined && !isRecord(value.attachments))
    return false;
  return true;
}

function validateNotebook(value: unknown): asserts value is NotebookJson {
  if (
    !isRecord(value) ||
    value.nbformat !== 4 ||
    !Number.isInteger(value.nbformat_minor) ||
    (value.nbformat_minor as number) < 0 ||
    !isRecord(value.metadata) ||
    !Array.isArray(value.cells) ||
    !value.cells.every(validateCell)
  ) {
    throw new NotebookPortabilityError("INVALID_NOTEBOOK");
  }
}

function sourceText(cell: Record<string, unknown>): string {
  return Array.isArray(cell.source)
    ? (cell.source as string[]).join("")
    : (cell.source as string);
}

function removeActiveOutputs(notebook: NotebookJson): boolean {
  let removed = false;
  for (const cell of notebook.cells) {
    if (!Array.isArray(cell.outputs)) continue;
    for (const output of cell.outputs) {
      if (!isRecord(output) || !isRecord(output.data)) continue;
      for (const mime of activeOutputTypes) {
        if (Object.hasOwn(output.data, mime)) {
          delete output.data[mime];
          removed = true;
        }
      }
    }
  }
  return removed;
}

function compatibilityWarnings(
  notebook: NotebookJson,
  activeOutputRemoved: boolean,
): PortabilityWarning[] {
  const source = notebook.cells.map(sourceText).join("\n");
  const metadata = JSON.stringify(notebook.metadata).toLowerCase();
  const codes: PortabilityWarningCode[] = [];
  if (/\bgoogle\.colab\b/.test(source)) codes.push("COLAB_API");
  if (/\bdrive\.mount\s*\(/.test(source)) codes.push("DRIVE_MOUNT");
  if (/^\s*[!%]/m.test(source)) codes.push("SHELL_COMMAND");
  if (/\bgpu\b/i.test(source) || /gpu|accelerator/.test(metadata))
    codes.push("GPU_RUNTIME");
  if (activeOutputRemoved) codes.push("ACTIVE_OUTPUT_REMOVED");
  return codes.map((code) => ({ code, message: warningMessages[code] }));
}

export function importNotebook(bytes: Uint8Array): {
  notebook: NotebookJson;
  warnings: PortabilityWarning[];
} {
  if (bytes.byteLength > MAX_NOTEBOOK_BYTES)
    throw new NotebookPortabilityError("LIMIT_EXCEEDED");
  let value: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(text);
  } catch {
    throw new NotebookPortabilityError("INVALID_NOTEBOOK");
  }
  validateNotebook(value);
  const activeOutputRemoved = removeActiveOutputs(value);
  return {
    notebook: value,
    warnings: compatibilityWarnings(value, activeOutputRemoved),
  };
}

export function exportNotebook(notebook: unknown): Uint8Array {
  validateNotebook(notebook);
  let bytes: Uint8Array;
  try {
    bytes = new TextEncoder().encode(`${JSON.stringify(notebook, null, 2)}\n`);
  } catch {
    throw new NotebookPortabilityError("INVALID_NOTEBOOK");
  }
  if (bytes.byteLength > MAX_NOTEBOOK_BYTES)
    throw new NotebookPortabilityError("LIMIT_EXCEEDED");
  return bytes;
}
