export interface SiteTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
    consequentialHint?: boolean;
  };
  execute(input: unknown, options: { signal: AbortSignal }): Promise<unknown>;
}

interface RegistrationAPI {
  registerTool(tool: SiteTool, options: { signal: AbortSignal }): Promise<void>;
}

export type RegistrationStatus =
  "available" | "unavailable" | "failed" | "disposed";

// Matches the October 2026 draft: aborting the registration signal removes tools.
export class ToolRegistration {
  private readonly controller = new AbortController();
  private pending?: Promise<RegistrationStatus>;
  private disposed = false;

  constructor(
    private readonly api: unknown,
    private readonly tools: readonly SiteTool[],
  ) {}

  start(): Promise<RegistrationStatus> {
    if (this.disposed) return Promise.resolve("disposed");
    return (this.pending ??= this.register());
  }

  dispose(): void {
    this.disposed = true;
    this.controller.abort();
  }

  private async register(): Promise<RegistrationStatus> {
    try {
      if (
        !this.api ||
        typeof this.api !== "object" ||
        !("registerTool" in this.api) ||
        typeof this.api.registerTool !== "function"
      ) {
        return "unavailable";
      }
      const api = this.api as RegistrationAPI;
      for (const tool of this.tools) {
        if (this.disposed) return "disposed";
        await api.registerTool(tool, { signal: this.controller.signal });
      }
      return this.disposed ? "disposed" : "available";
    } catch {
      this.controller.abort();
      return this.disposed ? "disposed" : "failed";
    }
  }
}
