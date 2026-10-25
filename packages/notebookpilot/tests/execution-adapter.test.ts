import type { INotebookTracker } from "@jupyterlab/notebook";
import { PolicyStore } from "../src/control/policy";
import { createExecutionAdapter } from "../src/notebook/execution-adapter";

function setup() {
  const policies = new PolicyStore();
  policies.setNotebook("n", "write");
  const listeners = new Set<(sender: unknown, args: unknown) => void>();
  const statusListeners = new Set<() => void>();
  const kernel = {
    id: "k",
    status: "idle",
    interrupt: jest.fn(async () => undefined),
    statusChanged: {
      connect: (fn: () => void) => statusListeners.add(fn),
      disconnect: (fn: () => void) => statusListeners.delete(fn),
    },
    anyMessage: {
      connect: (fn: (sender: unknown, args: unknown) => void) =>
        listeners.add(fn),
      disconnect: (fn: (sender: unknown, args: unknown) => void) =>
        listeners.delete(fn),
    },
  };
  const cell = {
    isDisposed: false,
    model: {
      id: "c",
      type: "code",
      sharedModel: { getSource: () => "print(1)" },
      outputs: { toJSON: () => [{ output_type: "stream", text: "1" }] },
    },
  };
  const panel = {
    id: "n",
    isDisposed: false,
    content: { widgets: [cell] },
    sessionContext: { session: { kernel } },
  };
  const tracker = {
    find: (fn: (p: typeof panel) => boolean) => (fn(panel) ? panel : undefined),
  } as unknown as INotebookTracker;
  const execute = jest.fn(
    async (
      _cell: unknown,
      _session: unknown,
      _metadata: { notebookpilotExecutionId: string },
    ) => ({ content: { status: "ok" } }),
  );
  const adapter = createExecutionAdapter(tracker, policies, execute);
  return { adapter, kernel, cell, execute, listeners, statusListeners };
}

test("dispatches visible cell only after live source/kernel checks", async () => {
  const s = setup();
  const expected = s.adapter.read("n", "c")!;
  await expect(
    s.adapter.run(
      "n",
      "c",
      { ...expected, source: "old" },
      new AbortController().signal,
    ),
  ).rejects.toThrow("STALE_CELL");
  expect(s.execute).not.toHaveBeenCalled();
  expect(
    await s.adapter.run("n", "c", expected, new AbortController().signal),
  ).toContain("1");
  expect(s.execute.mock.calls[0][0]).toBe(s.cell);
  expect(s.listeners.size).toBe(0);
});

test("busy kernels and already aborted requests never dispatch", async () => {
  const s = setup();
  const expected = s.adapter.read("n", "c")!;
  s.kernel.status = "busy";
  await expect(
    s.adapter.run("n", "c", expected, new AbortController().signal),
  ).rejects.toThrow("KERNEL_UNAVAILABLE");
  s.kernel.status = "idle";
  const controller = new AbortController();
  controller.abort();
  await expect(
    s.adapter.run("n", "c", expected, controller.signal),
  ).rejects.toThrow("CANCELLED");
  expect(s.execute).not.toHaveBeenCalled();
  expect(s.kernel.interrupt).not.toHaveBeenCalled();
});

test.each([false, true])(
  "cancellation interrupts only owned work (foreign=%s)",
  async (foreign) => {
    const s = setup();
    let finish!: () => void;
    s.execute.mockImplementationOnce(async (_cell, _session, metadata) => {
      const emit = (id: string, token: string) => {
        for (const listener of s.listeners)
          listener(s.kernel, {
            direction: "send",
            msg: {
              header: { msg_type: "execute_request", msg_id: id },
              metadata: { notebookpilotExecutionId: token },
            },
          });
      };
      emit("owned", metadata.notebookpilotExecutionId);
      if (foreign) emit("human", "different-token");
      s.kernel.status = "busy";
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return { content: { status: "ok" } };
    });
    const controller = new AbortController();
    const run = s.adapter.run(
      "n",
      "c",
      s.adapter.read("n", "c")!,
      controller.signal,
    );
    controller.abort();
    expect(s.kernel.interrupt).toHaveBeenCalledTimes(foreign ? 0 : 1);
    finish();
    await expect(run).rejects.toThrow("CANCELLED");
    expect(s.listeners.size).toBe(0);
  },
);

test.each([false, true])(
  "cancellation before busy waits for ownership-safe interruption (foreign=%s)",
  async (foreign) => {
    const s = setup();
    let finish!: () => void;
    s.execute.mockImplementationOnce(async (_cell, _session, metadata) => {
      for (const listener of s.listeners)
        listener(s.kernel, {
          direction: "send",
          msg: {
            header: { msg_type: "execute_request", msg_id: "owned" },
            metadata,
          },
        });
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return { content: { status: "ok" } };
    });
    const controller = new AbortController();
    const run = s.adapter.run(
      "n",
      "c",
      s.adapter.read("n", "c")!,
      controller.signal,
    );
    controller.abort();
    expect(s.kernel.interrupt).not.toHaveBeenCalled();
    if (foreign)
      for (const listener of s.listeners)
        listener(s.kernel, {
          direction: "send",
          msg: {
            header: { msg_type: "execute_request", msg_id: "human" },
            metadata: {},
          },
        });
    s.kernel.status = "busy";
    for (const listener of s.statusListeners) listener();
    for (const listener of s.statusListeners) listener();
    expect(s.kernel.interrupt).toHaveBeenCalledTimes(foreign ? 0 : 1);
    finish();
    await expect(run).rejects.toThrow("CANCELLED");
    expect(s.statusListeners.size).toBe(0);
    expect(s.listeners.size).toBe(0);
  },
);
