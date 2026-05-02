import { beforeEach, describe, expect, it } from "vitest";
import type { DashboardLayout } from "@/domain/schemas";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";
import { createLayoutStore, layoutStore } from "./layoutStore";

const layoutWithVersion = (version: number): DashboardLayout => ({
  ...structuredClone(DEFAULT_DASHBOARD_LAYOUT),
  version,
});

describe("layoutStore", () => {
  beforeEach(() => {
    layoutStore.reset();
  });

  it("initial getCurrent equals the seed layout", () => {
    expect(layoutStore.getCurrent()).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(layoutStore.getHistory()).toHaveLength(0);
  });

  it("getCurrent returns a clone — mutating the result does not affect the store", () => {
    const snapshot = layoutStore.getCurrent();
    snapshot.quadrants.growth.widgets.pop();
    expect(layoutStore.getCurrent().quadrants.growth.widgets).toHaveLength(
      DEFAULT_DASHBOARD_LAYOUT.quadrants.growth.widgets.length,
    );
  });

  it("commit updates current and pushes prior layout onto history", () => {
    const next = layoutWithVersion(2);
    const result = layoutStore.commit(next, { proposalId: "proposal_a" });

    expect(result).toEqual(next);
    expect(layoutStore.getCurrent()).toEqual(next);

    const history = layoutStore.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].layout).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(history[0].proposalId).toBe("proposal_a");
    expect(history[0].appliedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("commit without proposalId leaves the history entry's proposalId undefined", () => {
    layoutStore.commit(layoutWithVersion(2));
    expect(layoutStore.getHistory()[0].proposalId).toBeUndefined();
  });

  it("history is capped — oldest entries drop first", () => {
    const store = createLayoutStore({ historyCapacity: 2 });
    store.commit(layoutWithVersion(2));
    store.commit(layoutWithVersion(3));
    store.commit(layoutWithVersion(4));

    const history = store.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].layout.version).toBe(2);
    expect(history[1].layout.version).toBe(3);
  });

  it("rollback returns restored and replaced snapshots and pops history", () => {
    layoutStore.commit(layoutWithVersion(2), { proposalId: "proposal_a" });
    layoutStore.commit(layoutWithVersion(3), { proposalId: "proposal_b" });

    const result = layoutStore.rollback();

    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.restored.version).toBe(2);
    expect(result.replaced.version).toBe(3);
    expect(result.replacedEntry.proposalId).toBe("proposal_b");
    expect(layoutStore.getCurrent().version).toBe(2);
    expect(layoutStore.getHistory()).toHaveLength(1);
  });

  it("rollback on an empty history returns null and does not change current", () => {
    expect(layoutStore.rollback()).toBeNull();
    expect(layoutStore.getCurrent()).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("reset returns the store to its seed state", () => {
    layoutStore.commit(layoutWithVersion(2));
    layoutStore.reset();
    expect(layoutStore.getCurrent()).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(layoutStore.getHistory()).toHaveLength(0);
  });

  it("createLayoutStore accepts a custom initial layout and clock", () => {
    const fixedNow = new Date("2026-05-02T00:00:00.000Z");
    const store = createLayoutStore({
      initialLayout: layoutWithVersion(7),
      now: () => fixedNow,
    });

    store.commit(layoutWithVersion(8), { proposalId: "proposal_x" });
    const [entry] = store.getHistory();
    expect(entry.layout.version).toBe(7);
    expect(entry.appliedAt).toBe("2026-05-02T00:00:00.000Z");
  });
});
