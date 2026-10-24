import { UpdateProposals } from "../src/control/proposals";
import { PolicyStore } from "../src/control/policy";

function setup() {
  const policies = new PolicyStore();
  policies.setNotebook("n", "write");
  let order = ["a", "b"];
  const insert = jest.fn(() => true);
  const store = new UpdateProposals(
    policies,
    () => "",
    () => true,
    Date.now,
    { order: () => [...order], insert },
  );
  return {
    store,
    policies,
    insert,
    reorder: () => {
      order = ["b", "a"];
    },
  };
}

test("insert waits for acceptance and applies once", () => {
  const s = setup();
  const p = s.store.proposeInsert("n", "a", "code", "print(1)");
  expect(s.insert).not.toHaveBeenCalled();
  expect(s.store.accept(p.proposalId).status).toBe("accepted");
  expect(s.store.accept(p.proposalId).status).toBe("accepted");
  expect(s.insert).toHaveBeenCalledTimes(1);
  expect(s.insert).toHaveBeenCalledWith(
    "n",
    ["a", "b"],
    "a",
    p.cellId,
    "code",
    "print(1)",
  );
});

test("changed order cancels insertion", () => {
  const s = setup();
  const p = s.store.proposeInsert("n", null, "markdown", "# Title");
  s.reorder();
  expect(s.store.accept(p.proposalId).status).toBe("cancelled");
  expect(s.insert).not.toHaveBeenCalled();
});

test("hidden anchors and revoked permission deny insertion", () => {
  const s = setup();
  s.policies.setCell("n", "a", "hidden");
  expect(() => s.store.proposeInsert("n", "a", "code", "")).toThrow(
    "ACCESS_DENIED",
  );
  const p = s.store.proposeInsert("n", null, "code", "");
  s.policies.setNotebook("n", "read");
  expect(s.store.accept(p.proposalId).status).toBe("cancelled");
});

test("missing anchors fail and returned order cannot change stored precondition", () => {
  const s = setup();
  expect(() => s.store.proposeInsert("n", "missing", "code", "")).toThrow(
    "NOT_FOUND",
  );
  const p = s.store.proposeInsert("n", "a", "code", "");
  p.insertion!.order.reverse();
  expect(s.store.accept(p.proposalId).status).toBe("accepted");
});
