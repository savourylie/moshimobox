import { beforeEach, describe, expect, it } from "vitest";
import { actionLogRepository, layoutStore } from "@/server/layout";
import { POST } from "./route";

const callRoute = (body: unknown) => {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
  return POST(new Request("http://test/api/layout/proposals/apply", init));
};

const baseProposal = {
  id: "proposal_add_core_cpi_metric",
  summary: "Add a compact Core CPI card.",
  proposedBy: "agent",
  proposedAt: "2026-04-30T08:00:00.000Z",
  dashboardId: "main",
  chatTurnId: "turn_019",
  actions: [
    {
      type: "add_widget",
      widget: {
        id: "widget_us_core_cpi_metric",
        type: "metric_card",
        title: "Core CPI quick read",
        description: "Underlying consumer price pressure as a compact card.",
        indicatorId: "us_core_cpi",
      },
      target: { quadrantId: "inflation" },
    },
  ],
};

describe("POST /api/layout/proposals/apply", () => {
  beforeEach(() => {
    layoutStore.reset();
    actionLogRepository.reset();
  });

  it("applies a valid proposal, returns the new layout, and bumps version", async () => {
    const response = await callRoute({ proposal: baseProposal, basedOnVersion: 1 });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.valid).toBe(true);
    expect(body.version).toBe(2);
    expect(body.layout.version).toBe(2);
    expect(body.diff).toHaveLength(1);
    expect(body.affectedWidgetIds).toEqual(["widget_us_core_cpi_metric"]);
    expect(typeof body.requestId).toBe("string");
    expect(layoutStore.getCurrent().version).toBe(2);
  });

  it("returns valid:false with reasons on validation failure (200)", async () => {
    const response = await callRoute({
      proposal: {
        ...baseProposal,
        actions: [
          {
            type: "remove_widget",
            widgetId: "widget_does_not_exist",
          },
        ],
      },
      basedOnVersion: 1,
    });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.issues[0].code).toBe("widget_not_found");
    expect(body.reasons.length).toBeGreaterThan(0);
    expect(layoutStore.getCurrent().version).toBe(1);
    expect(actionLogRepository.list()).toHaveLength(1);
  });

  it("returns 409 proposal_stale when basedOnVersion does not match", async () => {
    const response = await callRoute({ proposal: baseProposal, basedOnVersion: 99 });
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error.code).toBe("proposal_stale");
    expect(body.error.fields?.[0].path).toBe("basedOnVersion");
    expect(layoutStore.getCurrent().version).toBe(1);
  });

  it("returns 400 invalid_query when basedOnVersion is missing", async () => {
    const response = await callRoute({ proposal: baseProposal });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
    expect(Array.isArray(body.error.fields)).toBe(true);
  });

  it("returns 400 invalid_query when the body is not JSON", async () => {
    const response = await callRoute("not-json{{");
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
  });
});
