import { ExecutionQueue } from "../src/notebook/execution";
import { PolicyStore } from "../src/control/policy";
import { hashSource } from "../src/notebook/revisions";

async function setup() {
  const policies = new PolicyStore();
  policies.setNotebook("n", "write");
  let source = "print(1)";
  const run = jest.fn(async () => "1");
  const queue = new ExecutionQueue(policies, {
    read: () => ({ source, kernelId: "k", type: "code" }),
    run,
  });
  const cells = [{ cellId: "c", expectedSourceHash: await hashSource(source) }];
  return {
    queue,
    run,
    cells,
    policies,
    edit: () => {
      source = "print(2)";
    },
  };
}

test("request never runs before separate approval and duplicate approval runs once", async () => {
  const s = await setup();
  const request = await s.queue.request("n", s.cells);
  expect(s.run).not.toHaveBeenCalled();
  await Promise.all([
    s.queue.approve(request.requestId),
    s.queue.approve(request.requestId),
  ]);
  expect(s.run).toHaveBeenCalledTimes(1);
  expect(s.queue.get(request.requestId)).toMatchObject({
    status: "succeeded",
    cells: [{ status: "succeeded", outputSummary: "1" }],
  });
});

test("rejection and edits before approval never dispatch", async () => {
  const s = await setup();
  const rejected = await s.queue.request("n", s.cells);
  s.queue.cancel(rejected.requestId);
  await s.queue.approve(rejected.requestId);
  const stale = await s.queue.request("n", s.cells);
  s.edit();
  await s.queue.approve(stale.requestId);
  expect(s.run).not.toHaveBeenCalled();
  expect(s.queue.get(stale.requestId).status).toBe("failed");
});

test("revoking permission before dispatch blocks execution and status access", async () => {
  const s = await setup();
  const request = await s.queue.request("n", s.cells);
  s.policies.setNotebook("n", "hidden");
  await s.queue.approve(request.requestId);
  expect(s.run).not.toHaveBeenCalled();
  expect(() => s.queue.get(request.requestId)).toThrow("NOT_FOUND");
});

test("requests on one kernel are serialized and checked again after waiting", async () => {
  const s = await setup();
  let finish!: (value: string) => void;
  s.run.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const one = await s.queue.request("n", s.cells);
  const two = await s.queue.request("n", s.cells);
  const first = s.queue.approve(one.requestId);
  await Promise.resolve();
  await Promise.resolve();
  const second = s.queue.approve(two.requestId);
  expect(s.run).toHaveBeenCalledTimes(1);
  s.edit();
  finish("1");
  await Promise.all([first, second]);
  expect(s.run).toHaveBeenCalledTimes(1);
  expect(s.queue.get(two.requestId).status).toBe("failed");
});

test("invalid request counts, duplicate cells and stale hashes fail", async () => {
  const s = await setup();
  await expect(s.queue.request("n", [])).rejects.toThrow("INVALID_ARGUMENT");
  await expect(s.queue.request("n", [...s.cells, ...s.cells])).rejects.toThrow(
    "INVALID_ARGUMENT",
  );
  await expect(
    s.queue.request("n", [{ cellId: "c", expectedSourceHash: "0".repeat(64) }]),
  ).rejects.toThrow("STALE_CELL");
});

test("timeout aborts owned work and keeps its kernel lane until runner settles", async () => {
  const s = await setup();
  let finish!: (value: string) => void;
  s.run.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const one = await s.queue.request("n", s.cells);
  const two = await s.queue.request("n", s.cells);
  jest.useFakeTimers();
  try {
    const first = s.queue.approve(one.requestId);
    await Promise.resolve();
    await Promise.resolve();
    const second = s.queue.approve(two.requestId);
    await jest.advanceTimersByTimeAsync(120000);
    expect(s.queue.get(one.requestId)).toMatchObject({
      status: "failed",
      errorCode: "TIMEOUT",
    });
    expect(s.run).toHaveBeenCalledTimes(1);
    finish("late output");
    await Promise.all([first, second]);
    expect(s.queue.get(one.requestId).cells[0].outputSummary).toBe("");
    expect(s.queue.get(two.requestId).status).toBe("succeeded");
  } finally {
    jest.useRealTimers();
  }
});

test("cancellation stays cancelled while an uncooperative runner is settling", async () => {
  const s = await setup();
  let finish!: (value: string) => void;
  s.run.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const request = await s.queue.request("n", s.cells);
  jest.useFakeTimers();
  try {
    const done = s.queue.approve(request.requestId);
    await Promise.resolve();
    await Promise.resolve();
    s.queue.cancelNotebook("n");
    await jest.advanceTimersByTimeAsync(120000);
    expect(s.queue.get(request.requestId).status).toBe("cancelled");
    finish("late output");
    await done;
    expect(s.queue.get(request.requestId).cells[0].outputSummary).toBe("");
  } finally {
    jest.useRealTimers();
  }
});

test("terminal run records can be dismissed but active requests cannot", async () => {
  const s = await setup();
  const request = await s.queue.request("n", s.cells);
  expect(() => s.queue.dismiss(request.requestId)).toThrow("INVALID_STATE");
  s.queue.cancel(request.requestId);
  s.queue.dismiss(request.requestId);
  expect(() => s.queue.get(request.requestId)).toThrow("NOT_FOUND");
  expect(() => s.queue.dismiss(request.requestId)).toThrow("NOT_FOUND");
});
