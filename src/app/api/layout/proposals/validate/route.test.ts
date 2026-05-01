import { describe, expect, it } from "vitest";
import { ActionProposalValidationResultSchema } from "@/domain/schemas";
import { POST } from "./route";

const callRoute = (body: unknown) => {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
  return POST(new Request("http://test/api/layout/proposals/validate", init));
};

const validProposal = {
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
      target: {
        quadrantId: "inflation",
      },
    },
  ],
};

describe("POST /api/layout/proposals/validate", () => {
  it("returns a validated proposal diff", async () => {
    const response = await callRoute({ proposal: validProposal });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(typeof body.requestId).toBe("string");
    const validation = { ...body };
    delete validation.requestId;
    expect(ActionProposalValidationResultSchema.safeParse(validation).success).toBe(true);
    expect(validation.valid).toBe(true);
    expect(validation.diff[0]).toMatchObject({
      actionType: "add_widget",
      widgetId: "widget_us_core_cpi_metric",
    });
  });

  it("returns factual rejection reasons without treating validation failure as a route error", async () => {
    const response = await callRoute({
      proposal: {
        ...validProposal,
        actions: [
          {
            type: "remove_widget",
            widgetId: "widget_missing",
          },
        ],
      },
    });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.issues[0]).toMatchObject({
      code: "widget_not_found",
      widgetId: "widget_missing",
    });
    expect(body.reasons[0]).toContain("was not found");
  });

  it("returns 400 invalid_query when the request body is malformed", async () => {
    const response = await callRoute({ layout: {} });
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
