import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SiteTool } from "../src/webmcp/register";
import { TOOL_NAMES, createToolSurface } from "../src/webmcp/tools";
import { ToolValidationError, validateInput } from "../src/webmcp/validation";

type Schema = Record<string, unknown>;

const contract = JSON.parse(
  readFileSync(resolve(__dirname, "../../../contracts/tools.json"), "utf8"),
) as {
  status: string;
  tools: { name: string; inputSchema: Schema }[];
};

function sample(schema: Schema, seed = 0): unknown {
  if (Array.isArray(schema.enum)) return schema.enum[0];
  if (Array.isArray(schema.anyOf))
    return sample(schema.anyOf[0] as Schema, seed);
  switch (schema.type) {
    case "null":
      return null;
    case "string":
      return schema.pattern === "^[a-f0-9]{64}$"
        ? "a".repeat(64)
        : `id-${seed}`;
    case "integer":
      return typeof schema.minimum === "number" ? schema.minimum : 0;
    case "array": {
      const length = Math.max(Number(schema.minItems ?? 0), 1);
      return Array.from({ length }, (_, index) =>
        sample(schema.items as Schema, seed + index),
      );
    }
    case "object": {
      const properties = schema.properties as Record<string, Schema>;
      return Object.fromEntries(
        ((schema.required as string[]) ?? []).map((key, index) => [
          key,
          sample(properties[key], seed + index),
        ]),
      );
    }
    default:
      throw new Error("UNSUPPORTED_TEST_SCHEMA");
  }
}

function stub(name: string): SiteTool {
  const entry = contract.tools.find((tool) => tool.name === name)!;
  return {
    name,
    description: name,
    inputSchema: entry.inputSchema,
    execute: async () => ({}),
  };
}

test("the checked-in contract is the exact closed tool surface", () => {
  expect(contract.tools.map((tool) => tool.name)).toEqual(TOOL_NAMES);
  const surface = createToolSurface(TOOL_NAMES.map((name) => [stub(name)]));
  expect(surface.map((tool) => tool.name)).toEqual(TOOL_NAMES);
  expect(surface.some((tool) => /approv|accept|reject/i.test(tool.name))).toBe(
    false,
  );
});

test.each(contract.tools)("$name schema rejects approval injection", (tool) => {
  const input = sample(tool.inputSchema) as Record<string, unknown>;
  expect(validateInput(input, tool.inputSchema)).toEqual(input);
  expect(() =>
    validateInput({ ...input, approved: true }, tool.inputSchema),
  ).toThrow(new ToolValidationError("INVALID_ARGUMENT"));
});

test("surface composition rejects missing, duplicate and unknown tools", () => {
  const tools = TOOL_NAMES.map(stub);
  expect(() => createToolSurface([tools.slice(1)])).toThrow(
    "INVALID_TOOL_SURFACE",
  );
  expect(() => createToolSurface([[...tools, tools[0]]])).toThrow(
    "INVALID_TOOL_SURFACE",
  );
  expect(() =>
    createToolSurface([[...tools.slice(0, -1), stub(TOOL_NAMES[0])]]),
  ).toThrow("INVALID_TOOL_SURFACE");
  expect(() =>
    createToolSurface([
      [...tools.slice(0, -1), { ...tools.at(-1)!, name: "notebook_approve" }],
    ]),
  ).toThrow("INVALID_TOOL_SURFACE");
});

test("surface routing caps every result and conceals thrown details", async () => {
  const tools = TOOL_NAMES.map(stub);
  tools[0] = {
    ...tools[0],
    execute: async () => ({ private: "x".repeat(60 * 1024) }),
  };
  tools[1] = {
    ...tools[1],
    execute: async () => {
      throw new Error("private adapter details");
    },
  };
  const surface = createToolSurface([tools]);
  const options = { signal: new AbortController().signal };
  const oversized = await surface[0].execute(
    sample(surface[0].inputSchema!),
    options,
  );
  expect(oversized).toMatchObject({
    isError: true,
    structuredContent: { error: { code: "LIMIT_EXCEEDED" } },
  });
  expect(JSON.stringify(oversized)).not.toContain("x".repeat(100));

  const failed = await surface[1].execute(
    sample(surface[1].inputSchema!),
    options,
  );
  expect(failed).toMatchObject({
    isError: true,
    structuredContent: { error: { code: "INTERNAL_ERROR" } },
  });
  expect(JSON.stringify(failed)).not.toContain("private adapter details");
});
