import type { INotebookTracker } from "@jupyterlab/notebook";
import { PolicyStore } from "../src/control/policy";
import { createNotebookMutations } from "../src/notebook/mutations";

function setup() {
  const policies = new PolicyStore();
  policies.setNotebook("n", "write");
  let source = "before";
  const setSource = jest.fn((value: string) => {
    source = value;
  });
  const cell = { id: "c", sharedModel: { getSource: () => source, setSource } };
  const panel = {
    id: "n",
    isDisposed: false,
    content: { model: { cells: [cell] } },
  };
  const tracker = {
    find: (predicate: (value: typeof panel) => boolean) =>
      predicate(panel) ? panel : undefined,
  } as unknown as INotebookTracker;
  return {
    mutations: createNotebookMutations(tracker, policies),
    policies,
    panel,
    cell,
    setSource,
  };
}

test("compares live source before replacing it", () => {
  const state = setup();
  expect(state.mutations.read("n", "c")).toBe("before");
  expect(state.mutations.replace("n", "c", "stale", "bad")).toBe(false);
  expect(state.setSource).not.toHaveBeenCalled();
  expect(state.mutations.replace("n", "c", "before", "after")).toBe(true);
  expect(state.mutations.read("n", "c")).toBe("after");
});

test("permission revocation, closed notebooks and ambiguous cells cannot be written", () => {
  const state = setup();
  state.policies.setNotebook("n", "read");
  expect(state.mutations.replace("n", "c", "before", "after")).toBe(false);
  state.policies.setNotebook("n", "write");
  state.panel.isDisposed = true;
  expect(state.mutations.read("n", "c")).toBeNull();
  expect(state.mutations.replace("n", "c", "before", "after")).toBe(false);
  state.panel.isDisposed = false;
  state.panel.content.model.cells.push(state.cell);
  expect(state.mutations.replace("n", "c", "before", "after")).toBe(false);
  expect(state.setSource).not.toHaveBeenCalled();
});
