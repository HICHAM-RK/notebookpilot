export const MAX_NOTEBOOK_BYTES = 20 * 1024 * 1024;

export type NotebookJson = {
  cells: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  nbformat: 4;
  nbformat_minor: number;
  [key: string]: unknown;
};

export type PortabilityWarningCode =
  "COLAB_API" | "DRIVE_MOUNT" | "SHELL_COMMAND" | "GPU_RUNTIME";

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
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validSource(value: unknown): boolean {
  return (
    typeof value === "string" ||
    (Array.isArray(value) && value.every((part) => typeof part === "string"))
  );
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
    if (!Array.isArray(value.outputs)) return false;
    if (
      value.execution_count !== null &&
      (!Number.isInteger(value.execution_count) ||
        (value.execution_count as number) < 0)
    )
      return false;
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

function compatibilityWarnings(notebook: NotebookJson): PortabilityWarning[] {
  const source = notebook.cells.map(sourceText).join("\n");
  const metadata = JSON.stringify(notebook.metadata).toLowerCase();
  const codes: PortabilityWarningCode[] = [];
  if (/\bgoogle\.colab\b/.test(source)) codes.push("COLAB_API");
  if (/\bdrive\.mount\s*\(/.test(source)) codes.push("DRIVE_MOUNT");
  if (/^\s*[!%]/m.test(source)) codes.push("SHELL_COMMAND");
  if (/\bgpu\b/i.test(source) || /gpu|accelerator/.test(metadata))
    codes.push("GPU_RUNTIME");
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
  return { notebook: value, warnings: compatibilityWarnings(value) };
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
