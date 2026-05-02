import { beforeEach, describe, expect, it } from "vitest";
import { actionLogRepository, layoutMutationService, layoutStore } from "@/server/layout";
import { POST } from "./route";

const callRoute = (body: unknown) => {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
  return POST(new Request("http://test/api/layout/rollback", init));
};

const seedAddProposal = {
  id: "proposal_add_core_cpi_metric",
  summary: "Add a compact Core CPI card.",
  proposedBy: "agent" as const,
  proposedAt: "2026-04-30T08:00:00.000Z",
  dashboardId: "main" as const,
  chatTurnId: "turn_019",
  actions: [
    {
      type: "add_widget" as const,
      widget: {
        id: "widget_us_core_cpi_metric",
        type: "metric_card" as const,
        title: "Core CPI quick read",
        description: "Underlying consumer price pressure as a compact card.",
        indicatorId: "us_core_cpi",
      },
      target: { quadrantId: "inflation" as const },
    },
  ],
};

describe("POST /api/layout/rollback", () => {
  beforeEach(() => {
    layoutStore.reset();
    actionLogRepository.reset();
  });

  it("restores the prior layout and returns the rollback log entry", async () => {
    const apply = layoutMutationService.applyProposal({
      proposal: seedAddProposal,
      basedOnVersion: 1,
    });
    expect(apply.kind).toBe("applied");

    const response = await callRoute({ basedOnVersion: 2 });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.version).toBe(1);
    expect(body.restoredFromVersion).toBe(2);
    expect(body.layout.version).toBe(1);
    expect(body.summary).toContain("version 1");
    expect(body.logEntry.result).toBe("applied");
    expect(layoutStore.getCurrent().version).toBe(1);
  });

  it("returns 409 history_empty when nothing has been applied", async () => {
    const response = await callRoute({ basedOnVersion: 1 });
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error.code).toBe("history_empty");
  });

  it("returns 409 proposal_stale when basedOnVersion does not match current", async () => {
    layoutMutationService.applyProposal({
      proposal: seedAddProposal,
      basedOnVersion: 1,
    });

    const response = await callRoute({ basedOnVersion: 99 });
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error.code).toBe("proposal_stale");
    expect(layoutStore.getCurrent().version).toBe(2);
    expect(layoutStore.getHistory()).toHaveLength(1);
  });

  it("returns 400 invalid_query when basedOnVersion is missing", async () => {
    const response = await callRoute({});
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
  });

  it("returns 400 invalid_query when the body is not JSON", async () => {
    const response = await callRoute("not-json{{");
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
  });
});
