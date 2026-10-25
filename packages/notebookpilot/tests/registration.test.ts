import { ToolRegistration } from "../src/webmcp/register";

const tool = { name: "read", description: "Read", execute: async () => ({}) };

test("missing or malformed API stays unavailable", async () => {
  for (const api of [undefined, null, {}, { registerTool: true }]) {
    const registration = new ToolRegistration(api, [tool]);
    expect(await registration.start()).toBe("unavailable");
    registration.dispose();
  }
});

test("repeated starts register once and disposal aborts ownership", async () => {
  const registerTool = jest.fn(async () => undefined);
  const registration = new ToolRegistration({ registerTool }, [tool]);
  expect(
    await Promise.all([registration.start(), registration.start()]),
  ).toEqual(["available", "available"]);
  expect(registerTool).toHaveBeenCalledTimes(1);
  const options = (
    registerTool.mock.calls as unknown as [unknown, { signal: AbortSignal }][]
  )[0][1];
  expect(options.signal.aborted).toBe(false);
  registration.dispose();
  registration.dispose();
  expect(options.signal.aborted).toBe(true);
  expect(await registration.start()).toBe("disposed");
});

test("partial failure aborts all registrations and hides host errors", async () => {
  const signals: AbortSignal[] = [];
  const registration = new ToolRegistration(
    {
      registerTool: async (
        _tool: unknown,
        options: { signal: AbortSignal },
      ) => {
        signals.push(options.signal);
        if (signals.length === 2) throw new Error("private host details");
      },
    },
    [tool, { ...tool, name: "second" }],
  );
  expect(await registration.start()).toBe("failed");
  expect(signals.every((signal) => signal.aborted)).toBe(true);
});

test("disposal during registration never activates remaining tools", async () => {
  let finish!: () => void;
  const registerTool = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const registration = new ToolRegistration({ registerTool }, [
    tool,
    { ...tool, name: "second" },
  ]);
  const pending = registration.start();
  registration.dispose();
  finish();
  expect(await pending).toBe("disposed");
  expect(registerTool).toHaveBeenCalledTimes(1);
});

test("duplicate activation shares tools until the last owner disposes", async () => {
  const active = new Set<string>();
  const registerTool = jest.fn(
    async (registered: typeof tool, options: { signal: AbortSignal }) => {
      active.add(registered.name);
      options.signal.addEventListener("abort", () =>
        active.delete(registered.name),
      );
    },
  );
  const api = { registerTool };
  const first = new ToolRegistration(api, [tool]);
  const second = new ToolRegistration(api, [tool]);
  expect(await Promise.all([first.start(), second.start()])).toEqual([
    "available",
    "available",
  ]);
  expect(registerTool).toHaveBeenCalledTimes(1);
  expect(active).toEqual(new Set(["read"]));
  first.dispose();
  expect(active).toEqual(new Set(["read"]));
  second.dispose();
  expect(active).toEqual(new Set());
});

test("duplicate names with different contracts fail closed", async () => {
  const registerTool = jest.fn(async () => undefined);
  const api = { registerTool };
  const first = new ToolRegistration(api, [tool]);
  expect(await first.start()).toBe("available");
  const conflict = new ToolRegistration(api, [
    { ...tool, description: "Different contract" },
  ]);
  expect(await conflict.start()).toBe("failed");
  expect(registerTool).toHaveBeenCalledTimes(1);
  first.dispose();
});
