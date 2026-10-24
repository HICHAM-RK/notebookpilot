import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  MAX_CSV_BYTES,
  MAX_CSV_COLUMNS,
  MAX_CSV_ROWS,
  parseCsv,
} from "../src/data/import";
import { profileCsv } from "../src/data/profile";

beforeAll(() =>
  Object.defineProperty(globalThis, "crypto", { value: webcrypto }),
);

const encode = (value: string) => new TextEncoder().encode(value);

test("profiles the edge fixture without evaluating formula-like text", async () => {
  const bytes = await readFile(
    resolve(process.cwd(), "content/fixtures/profile.csv"),
  );
  const parsed = parseCsv(bytes);
  expect(parsed.rows[1][4]).toBe("=SUM(A1:A2)");
  expect(parsed.rows[0][4]).toBe("line one\nline two");

  await expect(profileCsv(bytes)).resolves.toEqual({
    sha256: "80afa26967941be1a4bda078b041bd1b71ed5831ac22f00fa520ede85321419c",
    rowCount: 3,
    columns: [
      { name: "name", type: "string", missingCount: 0 },
      { name: "age", type: "integer", missingCount: 1 },
      { name: "score", type: "number", missingCount: 0 },
      { name: "active", type: "boolean", missingCount: 0 },
      { name: "note", type: "string", missingCount: 0 },
      { name: "code", type: "string", missingCount: 0 },
      { name: "blank", type: "empty", missingCount: 3 },
    ],
    duplicateRowCount: 1,
    warnings: [],
  });
});

test("accepts a BOM, CRLF, escaped quotes, blank lines, and literal null labels", () => {
  const parsed = parseCsv(
    encode('\ufeffname,value\r\n\r\n"Ada ""A""",NA\r\nBob,null\r\n'),
  );
  expect(parsed).toEqual({
    headers: ["name", "value"],
    rows: [
      ['Ada "A"', "NA"],
      ["Bob", "null"],
    ],
  });
});

test.each([
  ["duplicate headers", "a,a\n1,2\n", 1],
  ["empty header", "a,\n1,2\n", 1],
  ["ragged row", "a,b\n1\n", 2],
  ["extra field", "a,b\n1,2,3\n", 2],
  ["unterminated quote", 'a,b\n1,"two\n', 2],
  ["text after quote", 'a,b\n1,"two"x\n', 2],
])("rejects %s with its physical line", (_label, csv, line) => {
  expect(() => parseCsv(encode(csv))).toThrow(
    expect.objectContaining({ code: "INVALID_ARGUMENT", line }),
  );
});

test("rejects malformed UTF-8 and oversize input before parsing", () => {
  expect(() => parseCsv(Uint8Array.of(0xff))).toThrow(
    expect.objectContaining({ code: "INVALID_ARGUMENT" }),
  );
  expect(() => parseCsv(new Uint8Array(MAX_CSV_BYTES + 1))).toThrow(
    expect.objectContaining({ code: "LIMIT_EXCEEDED" }),
  );
  const exactlyAtLimit = encode(`value\n${"x".repeat(MAX_CSV_BYTES - 6)}`);
  expect(exactlyAtLimit).toHaveLength(MAX_CSV_BYTES);
  expect(parseCsv(exactlyAtLimit).rows).toHaveLength(1);
});

test("accepts exactly 100,000 rows and rejects the next row", () => {
  const atLimit = encode(`value\n${"1\n".repeat(MAX_CSV_ROWS)}`);
  expect(parseCsv(atLimit).rows).toHaveLength(MAX_CSV_ROWS);
  const overLimit = encode(`value\n${"1\n".repeat(MAX_CSV_ROWS + 1)}`);
  expect(() => parseCsv(overLimit)).toThrow(
    expect.objectContaining({ code: "LIMIT_EXCEEDED", line: 100_002 }),
  );
});

test("stops delimiter-heavy input at the bounded column count", () => {
  const delimiterBomb = encode(",".repeat(MAX_CSV_COLUMNS));
  expect(() => parseCsv(delimiterBomb)).toThrow(
    expect.objectContaining({ code: "LIMIT_EXCEEDED", line: 1 }),
  );
});

test("infers deterministic types and warns about numeric outliers", async () => {
  const profile = await profileCsv(
    encode(
      "integer,number,boolean,empty,mixed,outlier\n-2,1e2,TRUE, ,1,1\n0,-.5,false,,2,2\n3,2.0,true,\t,x,3\n4,3E-2,FALSE,,,100\n",
    ),
  );
  expect(profile.columns).toEqual([
    { name: "integer", type: "integer", missingCount: 0 },
    { name: "number", type: "number", missingCount: 0 },
    { name: "boolean", type: "boolean", missingCount: 0 },
    { name: "empty", type: "empty", missingCount: 4 },
    { name: "mixed", type: "string", missingCount: 1 },
    { name: "outlier", type: "integer", missingCount: 0 },
  ]);
  expect(profile.warnings).toEqual([
    'Column "number" has 1 value outside the 1.5×IQR range.',
    'Column "outlier" has 1 value outside the 1.5×IQR range.',
  ]);
});

test("profiles header-only data and preserves whitespace in duplicate identity", async () => {
  await expect(profileCsv(encode("name,count\n"))).resolves.toMatchObject({
    rowCount: 0,
    columns: [
      { name: "name", type: "empty", missingCount: 0 },
      { name: "count", type: "empty", missingCount: 0 },
    ],
    duplicateRowCount: 0,
  });
  await expect(
    profileCsv(encode("value\ntext\n text\ntext\n")),
  ).resolves.toMatchObject({ duplicateRowCount: 1 });
});

test("hashes original bytes including an optional BOM", async () => {
  const plain = await profileCsv(encode("value\n1\n"));
  const withBom = await profileCsv(encode("\ufeffvalue\n1\n"));
  expect(withBom.sha256).not.toBe(plain.sha256);
});

test("rejects a profile whose serialized tool result exceeds 50 KiB", async () => {
  const headers = Array.from(
    { length: 700 },
    (_, index) => `column_${index}_${"x".repeat(50)}`,
  );
  await expect(
    profileCsv(encode(`${headers.join(",")}\n`)),
  ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
});
