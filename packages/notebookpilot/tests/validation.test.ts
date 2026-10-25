import {
  ToolValidationError,
  boundedEnvelope,
  validateInput,
} from "../src/webmcp/validation";

const schema = {
  type: "object",
  properties: {
    id: { type: "string", minLength: 1, maxLength: 4 },
    source: { type: "string", "x-maxUtf8Bytes": 4 },
    count: { type: "integer", minimum: 0, maximum: 2 },
    choice: { enum: ["a", "b"] },
    anchor: {
      anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
    },
    ids: {
      type: "array",
      items: { type: "string", pattern: "^[a-z]+$" },
      minItems: 1,
      maxItems: 2,
      uniqueItems: true,
    },
  },
  required: ["id", "source", "count", "choice", "anchor", "ids"],
  additionalProperties: false,
};

test("validates the closed schema subset used by WebMCP contracts", () => {
  expect(
    validateInput(
      {
        id: "item",
        source: "éé",
        count: 2,
        choice: "a",
        anchor: null,
        ids: ["one", "two"],
      },
      schema,
    ),
  ).toEqual({
    id: "item",
    source: "éé",
    count: 2,
    choice: "a",
    anchor: null,
    ids: ["one", "two"],
  });
});

test.each([
  null,
  [],
  {},
  {
    id: "item",
    source: "éé",
    count: 2,
    choice: "a",
    anchor: null,
    ids: ["one"],
    approved: true,
  },
  { id: "", source: "x", count: 1, choice: "a", anchor: null, ids: ["one"] },
  {
    id: "items",
    source: "x",
    count: 1,
    choice: "a",
    anchor: null,
    ids: ["one"],
  },
  {
    id: "item",
    source: "x",
    count: 0.5,
    choice: "a",
    anchor: null,
    ids: ["one"],
  },
  {
    id: "item",
    source: "x",
    count: 3,
    choice: "a",
    anchor: null,
    ids: ["one"],
  },
  {
    id: "item",
    source: "x",
    count: 1,
    choice: "c",
    anchor: null,
    ids: ["one"],
  },
  { id: "item", source: "x", count: 1, choice: "a", anchor: "", ids: ["one"] },
  { id: "item", source: "x", count: 1, choice: "a", anchor: null, ids: [] },
  {
    id: "item",
    source: "x",
    count: 1,
    choice: "a",
    anchor: null,
    ids: ["one", "one"],
  },
  {
    id: "item",
    source: "x",
    count: 1,
    choice: "a",
    anchor: null,
    ids: ["ONE"],
  },
])("rejects invalid schema input without coercion", (input) => {
  expect(() => validateInput(input, schema)).toThrow(
    new ToolValidationError("INVALID_ARGUMENT"),
  );
});

test("classifies UTF-8 resource bounds separately from malformed input", () => {
  expect(() =>
    validateInput(
      {
        id: "item",
        source: "😀x",
        count: 1,
        choice: "a",
        anchor: null,
        ids: ["one"],
      },
      schema,
    ),
  ).toThrow(new ToolValidationError("LIMIT_EXCEEDED"));
});

test("measures the complete duplicated host envelope in UTF-8 bytes", () => {
  expect(boundedEnvelope({ value: "ok" }, false, 1024)).toMatchObject({
    structuredContent: { value: "ok" },
  });
  expect(() => boundedEnvelope({ value: "😀".repeat(20) }, false, 40)).toThrow(
    new ToolValidationError("LIMIT_EXCEEDED"),
  );
});
