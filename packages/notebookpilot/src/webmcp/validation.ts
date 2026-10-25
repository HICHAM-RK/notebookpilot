const utf8 = new TextEncoder();

export class ToolValidationError extends Error {
  constructor(public readonly code: "INVALID_ARGUMENT" | "LIMIT_EXCEEDED") {
    super(code);
  }
}

type Schema = Record<string, unknown>;

function invalid(): never {
  throw new ToolValidationError("INVALID_ARGUMENT");
}

function validate(value: unknown, schema: Schema): void {
  const alternatives = schema.anyOf;
  if (Array.isArray(alternatives)) {
    const valid = alternatives.some((alternative) => {
      try {
        if (!alternative || typeof alternative !== "object") return false;
        validate(value, alternative as Schema);
        return true;
      } catch (error) {
        if (error instanceof ToolValidationError) return false;
        throw error;
      }
    });
    if (!valid) invalid();
    return;
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) invalid();

  switch (schema.type) {
    case "null":
      if (value !== null) invalid();
      return;
    case "string": {
      if (typeof value !== "string") invalid();
      const length = Array.from(value).length;
      if (typeof schema.minLength === "number" && length < schema.minLength)
        invalid();
      if (typeof schema.maxLength === "number" && length > schema.maxLength)
        invalid();
      if (
        typeof schema.pattern === "string" &&
        !new RegExp(schema.pattern, "u").test(value)
      )
        invalid();
      if (
        typeof schema["x-maxUtf8Bytes"] === "number" &&
        utf8.encode(value).length > schema["x-maxUtf8Bytes"]
      )
        throw new ToolValidationError("LIMIT_EXCEEDED");
      return;
    }
    case "integer":
      if (typeof value !== "number" || !Number.isSafeInteger(value)) invalid();
      if (typeof schema.minimum === "number" && value < schema.minimum)
        invalid();
      if (typeof schema.maximum === "number" && value > schema.maximum)
        invalid();
      return;
    case "array": {
      if (!Array.isArray(value)) invalid();
      if (typeof schema.minItems === "number" && value.length < schema.minItems)
        invalid();
      if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
        invalid();
      if (
        schema.uniqueItems === true &&
        new Set(value.map((item) => JSON.stringify(item))).size !== value.length
      )
        invalid();
      if (schema.items && typeof schema.items === "object")
        for (const item of value) validate(item, schema.items as Schema);
      return;
    }
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value))
        invalid();
      const object = value as Record<string, unknown>;
      const properties =
        schema.properties && typeof schema.properties === "object"
          ? (schema.properties as Record<string, Schema>)
          : {};
      const required = Array.isArray(schema.required)
        ? (schema.required as unknown[])
        : [];
      if (
        required.some(
          (key) => typeof key !== "string" || !Object.hasOwn(object, key),
        )
      )
        invalid();
      if (
        schema.additionalProperties === false &&
        Object.keys(object).some((key) => !Object.hasOwn(properties, key))
      )
        invalid();
      for (const [key, child] of Object.entries(properties))
        if (Object.hasOwn(object, key)) validate(object[key], child);
      return;
    }
    default:
      if (schema.enum === undefined) invalid();
  }
}

export function validateInput<T>(input: unknown, schema: Schema): T {
  validate(input, schema);
  return input as T;
}

export function boundedEnvelope(
  payload: unknown,
  isError = false,
  maxBytes = 50 * 1024,
) {
  const result = {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
    ...(isError ? { isError: true } : {}),
  };
  if (utf8.encode(JSON.stringify(result)).length > maxBytes)
    throw new ToolValidationError("LIMIT_EXCEEDED");
  return result;
}

export function boundedResult<T>(result: T, maxBytes = 50 * 1024): T {
  let bytes: number;
  try {
    bytes = utf8.encode(JSON.stringify(result)).length;
  } catch {
    throw new ToolValidationError("LIMIT_EXCEEDED");
  }
  if (bytes > maxBytes) throw new ToolValidationError("LIMIT_EXCEEDED");
  return result;
}
