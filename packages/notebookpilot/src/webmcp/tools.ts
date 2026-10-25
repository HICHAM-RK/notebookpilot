import type { SiteTool } from "./register";
import {
  ToolValidationError,
  boundedEnvelope,
  boundedResult,
} from "./validation";

export const TOOL_NAMES = [
  "notebook_get_context",
  "notebook_get_cells",
  "notebook_propose_update",
  "notebook_propose_insert",
  "notebook_get_proposal",
  "notebook_run_cells",
  "notebook_get_execution",
  "dataset_list",
  "dataset_profile",
  "experiment_record",
  "experiment_compare",
  "notebook_audit",
  "report_generate",
] as const;

const allowed = new Set<string>(TOOL_NAMES);

/** Fail closed if composition accidentally adds, removes or duplicates a tool. */
export function createToolSurface(
  groups: readonly (readonly SiteTool[])[],
): SiteTool[] {
  const tools = groups.flat();
  const names = tools.map((tool) => tool.name);
  if (
    names.length !== TOOL_NAMES.length ||
    new Set(names).size !== names.length ||
    names.some((name) => !allowed.has(name)) ||
    TOOL_NAMES.some((name) => !names.includes(name))
  ) {
    throw new Error("INVALID_TOOL_SURFACE");
  }
  return tools.map((tool) => ({
    ...tool,
    execute: async (input, options) => {
      try {
        return boundedResult(await tool.execute(input, options));
      } catch (error) {
        const code =
          error instanceof ToolValidationError ? error.code : "INTERNAL_ERROR";
        return boundedEnvelope(
          {
            error: {
              code,
              message: code,
              retryable: false,
            },
          },
          true,
        );
      }
    },
  }));
}
