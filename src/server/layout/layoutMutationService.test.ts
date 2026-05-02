import { beforeEach, describe, expect, it } from "vitest";
import {
  ActionLogEntrySchema,
  type LayoutAction,
  type UIActionProposal,
} from "@/domain/schemas";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";
import { createActionLogRepository } from "./actionLogRepository";
import { createLayoutMutationService } from "./layoutMutationService";
import { createLayoutStore } from "./layoutStore";

const makeProposal = (
  actions: LayoutAction[],
  overrides: Partial<UIActionProposal> = {},
): UIActionProposal => ({
  id: "proposal_test",
  summary: "Test proposal.",
  proposedBy: "agent",
  proposedAt: "2026-04-30T08:00:00.000Z",
  dashboardId: "main",
  chatTurnId: "turn_test",
  actions,
  ...overrides,
});

const addInflationCpiMetricAction: LayoutAction = {
  type: "add_widget",
  widget: {
    id: "widget_us_core_cpi_metric",
    type: "metric_card",
    title: "Core CPI quick read",
    description: "Underlying consumer price pressure as a compact card.",
    indicatorId: "us_core_cpi",
  },
  target: { quadrantId: "inflation" },
};

const buildService = () => {
  const store = createLayoutStore();
  const log = createActionLogRepository();
  const service = createLayoutMutationService({ store, log });
  return { service, store, log };
};

describe("layoutMutationService.applyProposal", () => {
  it("applies a valid single-action proposal, bumps version, and logs one entry", () => {
    const { service, store, log } = buildService();
    const proposal = makeProposal([addInflationCpiMetricAction]);

    const outcome = service.applyProposal({
      proposal,
      basedOnVersion: 1,
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind !== "applied") return;

    expect(outcome.version).toBe(2);
    expect(outcome.layout.version).toBe(2);
    expect(outcome.affectedWidgetIds).toEqual(["widget_us_core_cpi_metric"]);
    expect(outcome.diff).toHaveLength(1);
    expect(store.getCurrent().version).toBe(2);
    expect(store.getCurrent().quadrants.inflation.widgets).toHaveLength(
      DEFAULT_DASHBOARD_LAYOUT.quadrants.inflation.widgets.length + 1,
    );

    expect(outcome.logEntries).toHaveLength(1);
    const [entry] = outcome.logEntries;
    expect(entry.actionType).toBe("add_widget");
    expect(entry.result).toBe("applied");
    expect(entry.actor).toBe("agent");
    expect(entry.proposalId).toBe("proposal_test");
    expect(entry.affectedWidgetIds).toEqual(["widget_us_core_cpi_metric"]);
    expect(entry.chatTurnId).toBe("turn_test");
    expect(ActionLogEntrySchema.safeParse(entry).success).toBe(true);

    expect(log.list({ proposalId: "proposal_test" })).toHaveLength(1);
  });

  it("returns stale and does not mutate when basedOnVersion does not match current", () => {
    const { service, store, log } = buildService();
    const proposal = makeProposal([addInflationCpiMetricAction]);

    const outcome = service.applyProposal({
      proposal,
      basedOnVersion: 99,
    });

    expect(outcome.kind).toBe("stale");
    if (outcome.kind !== "stale") return;
    expect(outcome.currentVersion).toBe(1);
    expect(outcome.attemptedVersion).toBe(99);
    expect(store.getCurrent().version).toBe(1);
    expect(log.list()).toHaveLength(0);
  });

  it("returns rejected with reasons and a single rejection log entry on validation failure", () => {
    const { service, store, log } = buildService();
    const proposal = makeProposal([
      {
        type: "remove_widget",
        widgetId: "widget_does_not_exist",
      },
    ]);

    const outcome = service.applyProposal({
      proposal,
      basedOnVersion: 1,
    });

    expect(outcome.kind).toBe("rejected");
    if (outcome.kind !== "rejected") return;

    expect(outcome.reasons.length).toBeGreaterThan(0);
    expect(outcome.issues[0].code).toBe("widget_not_found");
    expect(outcome.proposalId).toBe("proposal_test");
    expect(outcome.logEntry).toBeDefined();
    expect(outcome.logEntry?.result).toBe("rejected");
    expect(outcome.logEntry?.actionType).toBe("remove_widget");
    expect(outcome.logEntry?.affectedWidgetIds).toEqual(["widget_does_not_exist"]);
    expect(outcome.logEntry?.reasons.length).toBeGreaterThan(0);
    expect(store.getCurrent().version).toBe(1);

    const logged = log.list();
    expect(logged).toHaveLength(1);
    expect(logged[0].result).toBe("rejected");
  });

  it("returns rejected without a log entry when the proposal cannot be parsed", () => {
    const { service, store, log } = buildService();

    const outcome = service.applyProposal({
      proposal: { not: "a proposal" },
      basedOnVersion: 1,
    });

    expect(outcome.kind).toBe("rejected");
    if (outcome.kind !== "rejected") return;
    expect(outcome.logEntry).toBeUndefined();
    expect(log.list()).toHaveLength(0);
    expect(store.getCurrent().version).toBe(1);
  });

  it("logs one entry per action for a multi-action proposal, sharing proposalId", () => {
    const { service, log } = buildService();
    const proposal = makeProposal([
      addInflationCpiMetricAction,
      {
        type: "configure_widget",
        widgetId: "widget_us_headline_cpi",
        patch: { title: "CPI (headline)" },
      },
    ]);

    const outcome = service.applyProposal({
      proposal,
      basedOnVersion: 1,
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind !== "applied") return;
    expect(outcome.logEntries).toHaveLength(2);
    expect(outcome.logEntries.map((entry) => entry.proposalId)).toEqual([
      "proposal_test",
      "proposal_test",
    ]);
    expect(outcome.logEntries.map((entry) => entry.actionType)).toEqual([
      "add_widget",
      "configure_widget",
    ]);
    expect(log.list({ proposalId: "proposal_test" })).toHaveLength(2);
  });

  it("uses input.chatTurnId in preference to the proposal's chatTurnId", () => {
    const { service } = buildService();
    const proposal = makeProposal([addInflationCpiMetricAction], {
      chatTurnId: "turn_proposal",
    });

    const outcome = service.applyProposal({
      proposal,
      basedOnVersion: 1,
      chatTurnId: "turn_override",
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind !== "applied") return;
    expect(outcome.logEntries[0].chatTurnId).toBe("turn_override");
  });

  it("falls back to the proposal's chatTurnId when input.chatTurnId is missing", () => {
    const { service } = buildService();
    const proposal = makeProposal([addInflationCpiMetricAction]);

    const outcome = service.applyProposal({
      proposal,
      basedOnVersion: 1,
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind !== "applied") return;
    expect(outcome.logEntries[0].chatTurnId).toBe("turn_test");
  });

  it("respects the actor override on the log entry", () => {
    const { service } = buildService();
    const proposal = makeProposal([addInflationCpiMetricAction]);

    const outcome = service.applyProposal({
      proposal,
      basedOnVersion: 1,
      actor: "user",
    });

    expect(outcome.kind).toBe("applied");
    if (outcome.kind !== "applied") return;
    expect(outcome.logEntries[0].actor).toBe("user");
  });
});

describe("layoutMutationService.rollback", () => {
  let service: ReturnType<typeof createLayoutMutationService>;
  let store: ReturnType<typeof createLayoutStore>;
  let log: ReturnType<typeof createActionLogRepository>;

  beforeEach(() => {
    ({ service, store, log } = buildService());
  });

  it("restores the prior layout, including its version number", () => {
    const apply = service.applyProposal({
      proposal: makeProposal([addInflationCpiMetricAction]),
      basedOnVersion: 1,
    });
    expect(apply.kind).toBe("applied");

    const outcome = service.rollback({ basedOnVersion: 2 });

    expect(outcome.kind).toBe("rolled_back");
    if (outcome.kind !== "rolled_back") return;

    expect(outcome.version).toBe(1);
    expect(outcome.restoredFromVersion).toBe(2);
    expect(outcome.layout.quadrants.inflation.widgets).toHaveLength(
      DEFAULT_DASHBOARD_LAYOUT.quadrants.inflation.widgets.length,
    );
    expect(store.getCurrent().version).toBe(1);
    expect(outcome.logEntry.result).toBe("applied");
    expect(outcome.logEntry.actionType).toBe("move_widget");
    expect(outcome.logEntry.affectedWidgetIds).toContain("widget_us_core_cpi_metric");
    expect(outcome.logEntry.summary).toContain("version 1");
    expect(ActionLogEntrySchema.safeParse(outcome.logEntry).success).toBe(true);
  });

  it("returns history_empty when there is nothing to roll back", () => {
    const outcome = service.rollback({ basedOnVersion: 1 });
    expect(outcome.kind).toBe("history_empty");
    expect(log.list()).toHaveLength(0);
  });

  it("returns stale and does not pop history when basedOnVersion does not match", () => {
    service.applyProposal({
      proposal: makeProposal([addInflationCpiMetricAction]),
      basedOnVersion: 1,
    });

    const outcome = service.rollback({ basedOnVersion: 99 });

    expect(outcome.kind).toBe("stale");
    if (outcome.kind !== "stale") return;
    expect(outcome.currentVersion).toBe(2);
    expect(outcome.attemptedVersion).toBe(99);
    expect(store.getCurrent().version).toBe(2);
    expect(store.getHistory()).toHaveLength(1);
  });

  it("includes the supplied reason in the rollback log entry", () => {
    service.applyProposal({
      proposal: makeProposal([addInflationCpiMetricAction]),
      basedOnVersion: 1,
    });

    const outcome = service.rollback({
      basedOnVersion: 2,
      reason: "Reverted at user request",
    });

    expect(outcome.kind).toBe("rolled_back");
    if (outcome.kind !== "rolled_back") return;
    expect(outcome.logEntry.reasons).toEqual(["Reverted at user request"]);
  });
});
