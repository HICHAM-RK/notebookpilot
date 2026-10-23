import { webcrypto, createHash } from "node:crypto";
import { PolicyStore } from "../src/control/policy";
import { hashSource, truncateUtf8 } from "../src/notebook/revisions";

beforeAll(() =>
  Object.defineProperty(globalThis, "crypto", { value: webcrypto }),
);

test("defaults to read-only and never lets a cell override a hidden notebook", () => {
  const policies = new PolicyStore();
  expect(policies.canRead("n", "c")).toBe(true);
  expect(policies.canWrite("n", "c")).toBe(false);
  policies.setNotebook("n", "write");
  expect(policies.canWrite("n", "c")).toBe(true);
  policies.setCell("n", "c", "hidden");
  expect(policies.canRead("n", "c")).toBe(false);
  policies.setNotebook("n", "hidden");
  policies.setCell("n", "c", "write");
  expect(policies.canRead("n", "c")).toBe(false);
  expect(policies.canWrite("n", "c")).toBe(false);
});

test("unknown policy values fail closed and closing forgets grants", () => {
  const policies = new PolicyStore();
  policies.setNotebook("n", "write");
  policies.setCell("n", "c", { permission: "write" });
  expect(policies.canWrite("n", "c")).toBe(false);
  expect(policies.canRead("n", "c")).toBe(false);
  policies.forget("n");
  expect(policies.canRead("n", "c")).toBe(true);
  expect(policies.canWrite("n", "c")).toBe(false);
});

test("source revisions hash exact UTF-8 and change with unsaved edits", async () => {
  const source = "print('café 🐍')\n";
  expect(await hashSource(source)).toBe(
    createHash("sha256").update(source).digest("hex"),
  );
  expect(await hashSource(source)).not.toBe(
    await hashSource(source + "# edit"),
  );
});

test("UTF-8 truncation never splits a character", () => {
  expect(truncateUtf8("a🐍é", 5)).toEqual({ text: "a🐍", truncated: true });
  expect(truncateUtf8("a🐍é", 4)).toEqual({ text: "a", truncated: true });
  expect(truncateUtf8("a🐍é", 7)).toEqual({ text: "a🐍é", truncated: false });
});
