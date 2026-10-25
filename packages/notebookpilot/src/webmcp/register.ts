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

interface SharedRegistration {
  controller: AbortController;
  pending: Promise<void>;
  references: number;
  signature: string;
}

const shared = new WeakMap<object, Map<string, SharedRegistration>>();

export type RegistrationStatus =
  "available" | "unavailable" | "failed" | "disposed";

function signature(tool: SiteTool): string {
  return JSON.stringify({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
  });
}

// Matches the October 2026 draft: aborting a tool's registration signal removes it.
export class ToolRegistration {
  private pending?: Promise<RegistrationStatus>;
  private disposed = false;
  private released = false;
  private leases: Array<{
    api: object;
    name: string;
    registration: SharedRegistration;
  }> = [];

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
    this.release();
  }

  private release(): void {
    if (this.released) return;
    this.released = true;
    for (const lease of this.leases) {
      lease.registration.references--;
      if (lease.registration.references === 0) {
        lease.registration.controller.abort();
        const registrations = shared.get(lease.api);
        if (registrations?.get(lease.name) === lease.registration)
          registrations.delete(lease.name);
        if (registrations?.size === 0) shared.delete(lease.api);
      }
    }
    this.leases = [];
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
      const key = this.api as object;
      let registrations = shared.get(key);
      if (!registrations) {
        registrations = new Map();
        shared.set(key, registrations);
      }
      for (const tool of this.tools) {
        if (this.disposed) return "disposed";
        const toolSignature = signature(tool);
        let registration = registrations.get(tool.name);
        if (registration) {
          if (registration.signature !== toolSignature)
            throw new Error("TOOL_CONFLICT");
          registration.references++;
        } else {
          const controller = new AbortController();
          registration = {
            controller,
            references: 1,
            signature: toolSignature,
            pending: Promise.resolve(),
          };
          registration.pending = api.registerTool(tool, {
            signal: controller.signal,
          });
          registrations.set(tool.name, registration);
        }
        this.leases.push({ api: key, name: tool.name, registration });
        await registration.pending;
      }
      if (this.disposed) {
        this.release();
        return "disposed";
      }
      return "available";
    } catch {
      this.release();
      return this.disposed ? "disposed" : "failed";
    }
  }
}
