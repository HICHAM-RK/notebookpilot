import { DataError, parseCsv } from "./import";

const MAX_PROFILE_BYTES = 50 * 1024;
const encoder = new TextEncoder();

export type ColumnType = "string" | "integer" | "number" | "boolean" | "empty";

export interface DatasetProfile {
  sha256: string;
  rowCount: number;
  columns: Array<{ name: string; type: ColumnType; missingCount: number }>;
  duplicateRowCount: number;
  warnings: string[];
}

function isMissing(value: string): boolean {
  return value.trim() === "";
}

function isInteger(value: string): boolean {
  return /^[+-]?(?:0|[1-9]\d*)$/.test(value);
}

function isNumber(value: string): boolean {
  if (!/^[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?$/.test(value)) {
    return false;
  }
  return Number.isFinite(Number(value));
}

function inferType(values: string[]): ColumnType {
  const present = values.filter((value) => !isMissing(value));
  if (present.length === 0) return "empty";
  if (present.every((value) => /^(?:true|false)$/i.test(value)))
    return "boolean";
  if (present.some((value) => /^[+-]?0\d+$/.test(value))) return "string";
  if (present.every(isInteger)) return "integer";
  if (present.every(isNumber)) return "number";
  return "string";
}

function quartile(sorted: number[], proportion: number): number {
  const position = (sorted.length - 1) * proportion;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return (
    sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * fraction
  );
}

function outlierWarning(name: string, values: string[]): string | null {
  const numeric = values
    .filter((value) => !isMissing(value))
    .map(Number)
    .sort((left, right) => left - right);
  if (numeric.length < 4) return null;
  const q1 = quartile(numeric, 0.25);
  const q3 = quartile(numeric, 0.75);
  const iqr = q3 - q1;
  const count = numeric.filter(
    (value) => value < q1 - 1.5 * iqr || value > q3 + 1.5 * iqr,
  ).length;
  if (count === 0) return null;
  return `Column ${JSON.stringify(name)} has ${count} ${count === 1 ? "value" : "values"} outside the 1.5×IQR range.`;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function profileCsv(bytes: Uint8Array): Promise<DatasetProfile> {
  const parsed = parseCsv(bytes);
  const warnings: string[] = [];
  const columns = parsed.headers.map((name, index) => {
    const values = parsed.rows.map((row) => row[index]);
    const type = inferType(values);
    if (type === "integer" || type === "number") {
      const warning = outlierWarning(name, values);
      if (warning) warnings.push(warning);
    }
    return {
      name,
      type,
      missingCount: values.filter(isMissing).length,
    };
  });
  const profile: DatasetProfile = {
    sha256: await sha256(bytes),
    rowCount: parsed.rows.length,
    columns,
    duplicateRowCount:
      parsed.rows.length -
      new Set(parsed.rows.map((row) => JSON.stringify(row))).size,
    warnings,
  };
  const serialized = JSON.stringify(profile);
  const envelope = {
    content: [{ type: "text", text: serialized }],
    structuredContent: profile,
  };
  if (encoder.encode(JSON.stringify(envelope)).length > MAX_PROFILE_BYTES) {
    throw new DataError("LIMIT_EXCEEDED");
  }
  return profile;
}
