export const MAX_CSV_BYTES = 10 * 1024 * 1024;
export const MAX_CSV_ROWS = 100_000;
export const MAX_CSV_COLUMNS = 1_024;

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export class DataError extends Error {
  constructor(
    public readonly code: "INVALID_ARGUMENT" | "LIMIT_EXCEEDED",
    public readonly line?: number,
  ) {
    super(line === undefined ? code : `${code} at line ${line}`);
  }
}

/** Parse the deliberately small CSV dialect documented by NotebookPilot. */
export function parseCsv(bytes: Uint8Array): ParsedCsv {
  if (bytes.byteLength > MAX_CSV_BYTES) {
    throw new DataError("LIMIT_EXCEEDED");
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new DataError("INVALID_ARGUMENT", 1);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const records: Array<{ fields: string[]; line: number }> = [];
  let fields: string[] = [];
  let field = "";
  let line = 1;
  let recordLine = 1;
  let inQuotes = false;
  let afterQuote = false;
  let touched = false;

  const finishRecord = () => {
    if (!touched && fields.length === 0 && field === "") return;
    const completed = [...fields, field];
    if (completed.length > MAX_CSV_COLUMNS) {
      throw new DataError("LIMIT_EXCEEDED", recordLine);
    }
    records.push({ fields: completed, line: recordLine });
    if (records.length > MAX_CSV_ROWS + 1) {
      throw new DataError("LIMIT_EXCEEDED", recordLine);
    }
  };
  const resetRecord = () => {
    fields = [];
    field = "";
    touched = false;
    afterQuote = false;
  };
  const finishField = () => {
    fields.push(field);
    if (fields.length > MAX_CSV_COLUMNS) {
      throw new DataError("LIMIT_EXCEEDED", recordLine);
    }
    field = "";
  };

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else if (char === "\r" && text[index + 1] === "\n") {
        field += "\n";
        index++;
        line++;
      } else {
        field += char;
        if (char === "\n" || char === "\r") line++;
      }
      continue;
    }

    if (afterQuote) {
      if (char === ",") {
        finishField();
        afterQuote = false;
        touched = true;
        continue;
      }
      if (char !== "\n" && char !== "\r") {
        throw new DataError("INVALID_ARGUMENT", line);
      }
    }

    if (char === '"') {
      if (field !== "") throw new DataError("INVALID_ARGUMENT", line);
      inQuotes = true;
      touched = true;
    } else if (char === ",") {
      finishField();
      touched = true;
      afterQuote = false;
    } else if (char === "\n" || char === "\r") {
      finishRecord();
      resetRecord();
      if (char === "\r" && text[index + 1] === "\n") index++;
      line++;
      recordLine = line;
    } else {
      field += char;
      touched = true;
    }
  }

  if (inQuotes) throw new DataError("INVALID_ARGUMENT", recordLine);
  finishRecord();
  if (records.length === 0) throw new DataError("INVALID_ARGUMENT", 1);

  const [{ fields: headers, line: headerLine }, ...data] = records;
  if (
    headers.some((header) => header.trim() === "") ||
    new Set(headers).size !== headers.length
  ) {
    throw new DataError("INVALID_ARGUMENT", headerLine);
  }
  for (const record of data) {
    if (record.fields.length !== headers.length) {
      throw new DataError("INVALID_ARGUMENT", record.line);
    }
  }
  return { headers, rows: data.map((record) => record.fields) };
}
