import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api/errors";
import { ApiErrorSchema } from "@/domain/schemas";

const runResearchAgentMock = vi.fn();

vi.mock("@/server/agent/runAgent", () => ({
  runResearchAgent: (...args: unknown[]) => runResearchAgentMock(...args),
}));

import { POST } from "./route";

const callRoute = (body: unknown) => {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
  return POST(new Request("http://test/api/chat", init));
};

describe("POST /api/chat", () => {
  beforeEach(() => {
    runResearchAgentMock.mockReset();
  });

  it("returns the assistant text and tool invocations on success", async () => {
    runResearchAgentMock.mockResolvedValueOnce({
      text: "CPI is 3.2 % as of Mar 2026, source FRED CPIAUCSL.",
      toolInvocations: [
        {
          name: "get_indicator_series",
          arguments: { indicatorId: "us_headline_cpi" },
          output: { ok: true },
        },
      ],
    });

    const response = await callRoute({ message: "What is CPI?", history: [] });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.text).toContain("CPI");
    expect(body.text).toContain("Mar 2026");
    expect(body.toolInvocations).toHaveLength(1);
    expect(body.toolInvocations[0].name).toBe("get_indicator_series");
    expect(typeof body.requestId).toBe("string");

    expect(runResearchAgentMock).toHaveBeenCalledTimes(1);
    expect(runResearchAgentMock.mock.calls[0][0]).toMatchObject({
      message: "What is CPI?",
      history: [],
    });
  });

  it("returns 502 provider_error when the agent reports OPENAI_API_KEY missing", async () => {
    runResearchAgentMock.mockRejectedValueOnce(
      new ApiError(
        "provider_error",
        "The research agent is unavailable because OPENAI_API_KEY is not set.",
      ),
    );

    const response = await callRoute({ message: "Hi", history: [] });
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(ApiErrorSchema.safeParse(body).success).toBe(true);
    expect(body.error.code).toBe("provider_error");
    expect(body.error.message).toMatch(/OPENAI_API_KEY/);
  });

  it("returns 400 invalid_query when the body has no message", async () => {
    const response = await callRoute({ history: [] });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
    expect(Array.isArray(body.error.fields)).toBe(true);
    expect(runResearchAgentMock).not.toHaveBeenCalled();
  });

  it("returns 400 invalid_query when the body is not JSON", async () => {
    const response = await callRoute("not-json{{");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
    expect(runResearchAgentMock).not.toHaveBeenCalled();
  });

  it("returns 500 unexpected_error when the agent throws a non-ApiError", async () => {
    runResearchAgentMock.mockRejectedValueOnce(new Error("boom"));

    const response = await callRoute({ message: "hi" });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("unexpected_error");
    expect(body.error.message).not.toContain("boom");
  });

  it("rejects history entries with empty text", async () => {
    const response = await callRoute({
      message: "hi",
      history: [{ role: "user", text: "" }],
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
    expect(runResearchAgentMock).not.toHaveBeenCalled();
  });

  it("forwards conversation history to the agent", async () => {
    runResearchAgentMock.mockResolvedValueOnce({ text: "noted", toolInvocations: [] });

    const response = await callRoute({
      message: "follow up",
      history: [
        { role: "user", text: "first" },
        { role: "assistant", text: "second" },
      ],
    });
    expect(response.status).toBe(200);
    expect(runResearchAgentMock).toHaveBeenCalledWith({
      message: "follow up",
      history: [
        { role: "user", text: "first" },
        { role: "assistant", text: "second" },
      ],
    });
  });

  it("surfaces a proposal envelope from the agent in the response body", async () => {
    const proposalEnvelope = {
      proposal: {
        id: "proposal-test-1",
        summary: "Add 5Y breakeven extra to Inflation",
        proposedBy: "agent",
        proposedAt: "2026-05-02T10:00:00.000Z",
        dashboardId: "main",
        actions: [
          {
            type: "add_widget",
            target: { quadrantId: "inflation" },
            widget: {
              id: "widget.line.us_5y_breakeven_extra",
              type: "line_chart",
              title: "Breakeven extra",
              description: "Additional view.",
              indicatorId: "us_5y_breakeven_inflation",
              transform: "level",
            },
          },
        ],
      },
      validation: {
        valid: true,
        proposalId: "proposal-test-1",
        dashboardId: "main",
        summary: "Add Breakeven extra to Inflation.",
        affectedWidgetIds: ["widget.line.us_5y_breakeven_extra"],
        diff: [
          {
            actionIndex: 0,
            actionType: "add_widget",
            widgetId: "widget.line.us_5y_breakeven_extra",
            title: "Breakeven extra",
            before: null,
            after: {
              quadrantId: "inflation",
              index: 3,
              widget: {
                id: "widget.line.us_5y_breakeven_extra",
                type: "line_chart",
                title: "Breakeven extra",
                description: "Additional view.",
                indicatorId: "us_5y_breakeven_inflation",
                transform: "level",
              },
            },
            summary: "Add Breakeven extra to Inflation.",
          },
        ],
        previewLayout: { id: "main" },
        reasons: [],
        issues: [],
      },
      basedOnVersion: 1,
    };
    runResearchAgentMock.mockResolvedValueOnce({
      text: "I propose adding a second breakeven view.",
      toolInvocations: [],
      proposal: proposalEnvelope,
    });

    const response = await callRoute({ message: "Add another breakeven chart." });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.proposal).toBeDefined();
    expect(body.proposal.proposal.id).toBe("proposal-test-1");
    expect(body.proposal.validation.valid).toBe(true);
    expect(body.proposal.basedOnVersion).toBe(1);
  });
});
