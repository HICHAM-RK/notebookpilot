import { PolicyStore } from "../src/control/policy";
import { UpdateProposals } from "../src/control/proposals";
import { hashSource } from "../src/notebook/revisions";

function setup() {
  const policies = new PolicyStore();
  policies.setNotebook("n", "write");
  let source: string | null = "before";
  let now = 0;
  const commit = jest.fn(
    (
      _notebook: string,
      _cell: string,
      expected: string,
      replacement: string,
    ) => {
      if (source !== expected) return false;
      source = replacement;
      return true;
    },
  );
  const store = new UpdateProposals(
    policies,
    () => source,
    commit,
    () => now,
  );
  return {
    store,
    policies,
    commit,
    edit: (value: string | null) => {
      source = value;
    },
    time: (value: number) => {
      now = value;
    },
    source: () => source,
  };
}

async function propose(state: ReturnType<typeof setup>) {
  return state.store.propose("n", "c", await hashSource("before"), "after");
}

test("proposal changes nothing until human acceptance; acceptance applies once", async () => {
  const state = setup();
  const proposal = await propose(state);
  expect(state.source()).toBe("before");
  expect(state.store.accept(proposal.proposalId).status).toBe("accepted");
  expect(state.source()).toBe("after");
  expect(state.store.accept(proposal.proposalId).status).toBe("accepted");
  expect(state.commit).toHaveBeenCalledTimes(1);
});

test("rejection is terminal and does not write", async () => {
  const state = setup();
  const proposal = await propose(state);
  expect(state.store.reject(proposal.proposalId).status).toBe("denied");
  expect(state.store.accept(proposal.proposalId).status).toBe("denied");
  expect(state.commit).not.toHaveBeenCalled();
});

test.each(["new human edit", null])(
  "changed or deleted target cancels acceptance",
  async (source) => {
    const state = setup();
    const proposal = await propose(state);
    state.edit(source);
    expect(state.store.accept(proposal.proposalId).status).toBe("cancelled");
    expect(state.commit).not.toHaveBeenCalled();
  },
);

test("expiry and permission revocation prevent acceptance", async () => {
  const state = setup();
  const proposal = await propose(state);
  state.time(600000);
  expect(state.store.accept(proposal.proposalId).status).toBe("expired");
  const second = await propose(state);
  state.policies.setNotebook("n", "read");
  expect(state.store.accept(second.proposalId).status).toBe("cancelled");
  expect(state.commit).not.toHaveBeenCalled();
});

test("wrong source hash and oversized UTF-8 replacements fail", async () => {
  const state = setup();
  await expect(
    state.store.propose("n", "c", "0".repeat(64), "after"),
  ).rejects.toThrow("STALE_CELL");
  await expect(
    state.store.propose(
      "n",
      "c",
      await hashSource("before"),
      "😀".repeat(70000),
    ),
  ).rejects.toThrow("LIMIT_EXCEEDED");
});

test("closing notebook cancels pending proposals", async () => {
  const state = setup();
  const proposal = await propose(state);
  state.store.cancelNotebook("n");
  expect(state.store.accept(proposal.proposalId).status).toBe("cancelled");
});

test("returned proposal cannot alter the internal replacement", async () => {
  const state = setup();
  const proposal = await propose(state);
  proposal.source = "tampered";
  state.store.accept(proposal.proposalId);
  expect(state.source()).toBe("after");
});

test("edit while hashing prevents creating a stale proposal", async () => {
  const state = setup();
  const hash = await hashSource("before");
  const pending = state.store.propose("n", "c", hash, "after");
  state.edit("human edit during hash");
  await expect(pending).rejects.toThrow("STALE_CELL");
  expect(state.commit).not.toHaveBeenCalled();
});

test("permission changes while hashing prevent proposal creation", async () => {
  const state = setup();
  const hash = await hashSource("before");
  const pending = state.store.propose("n", "c", hash, "after");
  state.policies.setNotebook("n", "hidden");
  await expect(pending).rejects.toThrow("ACCESS_DENIED");
});

test("adapter compare-and-swap failure cancels acceptance", async () => {
  const state = setup();
  const proposal = await propose(state);
  state.commit.mockReturnValueOnce(false);
  expect(state.store.accept(proposal.proposalId).status).toBe("cancelled");
  expect(state.source()).toBe("before");
});

test("terminal proposals can be dismissed but pending review cannot", async () => {
  const state = setup();
  const proposal = await propose(state);
  expect(() => state.store.dismiss(proposal.proposalId)).toThrow(
    "INVALID_STATE",
  );
  state.store.reject(proposal.proposalId);
  state.store.dismiss(proposal.proposalId);
  expect(state.store.list("n")).toEqual([]);
  expect(() => state.store.dismiss(proposal.proposalId)).toThrow("NOT_FOUND");
});
