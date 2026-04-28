import { describe, expect, it } from "vitest";
import {
  ActionLogEntrySchema,
  ApiErrorSchema,
  ComparisonResponseSchema,
  DashboardLayoutSchema,
  IndicatorSearchResponseSchema,
  IndicatorSummarySchema,
  SingleSeriesResponseSchema,
  UIActionProposalSchema,
  WidgetDataResponseSchema,
} from "./schemas";

const source = {
  provider: "fred",
  name: "Federal Reserve Economic Data",
  seriesId: "CPIAUCSL",
  url: "https://fred.stlouisfed.org/series/CPIAUCSL",
};

const indicator = {
  id: "us_cpi",
  name: "CPI",
  description: "Consumer price index for all urban consumers.",
  quadrantId: "inflation",
  countryCode: "US",
  frequency: "monthly",
  unit: "index points",
  source,
  tags: ["prices", "consumer"],
};

const metricWidget = {
  id: "widget_cpi",
  type: "metric_card",
  title: "CPI",
  description: "Headline consumer prices.",
  indicatorId: "us_cpi",
};

const lineWidget = {
  id: "widget_payrolls",
  type: "line_chart",
  title: "Nonfarm payrolls",
  description: "Monthly labor-market growth.",
  indicatorId: "us_payrolls",
  range: {
    start: "2024-01",
  },
  transform: "level",
};

const comparisonWidget = {
  id: "widget_yield_curve",
  type: "comparison_chart",
  title: "Yield curve",
  description: "10Y and 2Y Treasury yield comparison.",
  indicatorIds: ["us_10y_yield", "us_2y_yield"],
  range: {
    start: "2025-01-01",
    end: "2026-04-01",
  },
  transform: "level",
};

const layout = {
  id: "main",
  version: 1,
  quadrants: {
    growth: {
      id: "growth",
      label: "Growth",
      widgets: [lineWidget],
    },
    inflation: {
      id: "inflation",
      label: "Inflation",
      widgets: [metricWidget],
    },
    policy: {
      id: "policy",
      label: "Policy / Liquidity",
      widgets: [],
    },
    market: {
      id: "market",
      label: "Market",
      widgets: [comparisonWidget],
    },
  },
};

const widgetDataResponse = {
  widgetId: "widget_cpi",
  indicator,
  unit: "index points",
  currentValue: 315.6,
  previousValue: 314.9,
  change: {
    value: 0.7,
    unit: "index points",
    percent: 0.22,
    period: "month over month",
  },
  observationDate: "2026-03",
  releaseDate: "2026-04-10",
  source,
  trend: {
    direction: "up",
    label: "Rising",
    period: "last month",
  },
  status: {
    tone: "neutral",
    label: "Watch",
    rationale: "Monthly price pressure is still visible.",
  },
};

const actionProposal = {
  id: "proposal_recession_watch",
  summary: "Add CPI to the inflation section.",
  proposedBy: "agent",
  proposedAt: "2026-04-28T08:00:00.000Z",
  dashboardId: "main",
  chatTurnId: "turn_003",
  actions: [
    {
      type: "add_widget",
      widget: metricWidget,
      target: {
        quadrantId: "inflation",
        index: 0,
      },
    },
  ],
};

const clone = <T>(value: T): T => structuredClone(value);

describe("domain schemas", () => {
  it("accepts widget data only when required numeric context is present", () => {
    const result = WidgetDataResponseSchema.safeParse(widgetDataResponse);

    expect(result.success).toBe(true);
  });

  it("rejects widget data without a unit", () => {
    const response = clone(widgetDataResponse) as Record<string, unknown>;
    delete response.unit;

    expect(WidgetDataResponseSchema.safeParse(response).success).toBe(false);
  });

  it("rejects widget data without an observation date", () => {
    const response = clone(widgetDataResponse) as Record<string, unknown>;
    delete response.observationDate;

    expect(WidgetDataResponseSchema.safeParse(response).success).toBe(false);
  });

  it("rejects widget data with non-canonical date formats", () => {
    const response = {
      ...widgetDataResponse,
      observationDate: "3/14/26",
      releaseDate: "2026-99-99",
    };

    expect(WidgetDataResponseSchema.safeParse(response).success).toBe(false);
  });

  it.each(["currentValue", "previousValue", "change", "releaseDate", "source", "trend", "status"])(
    "rejects widget data without %s",
    (field) => {
      const response = clone(widgetDataResponse) as Record<string, unknown>;
      delete response[field];

      expect(WidgetDataResponseSchema.safeParse(response).success).toBe(false);
    },
  );

  it("accepts the single-dashboard MVP layout shape with the three widget types", () => {
    const result = DashboardLayoutSchema.safeParse(layout);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("main");
      expect(result.data.quadrants.growth.widgets[0].type).toBe("line_chart");
      expect(result.data.quadrants.inflation.widgets[0].type).toBe("metric_card");
      expect(result.data.quadrants.market.widgets[0].type).toBe("comparison_chart");
    }
  });

  it("rejects layouts with unknown widget types", () => {
    const invalidLayout = clone(layout);
    invalidLayout.quadrants.growth.widgets[0] = {
      ...invalidLayout.quadrants.growth.widgets[0],
      type: "heatmap",
    };

    expect(DashboardLayoutSchema.safeParse(invalidLayout).success).toBe(false);
  });

  it("rejects layouts with duplicate widget ids", () => {
    const invalidLayout = clone(layout);
    invalidLayout.quadrants.market.widgets[0] = {
      ...invalidLayout.quadrants.market.widgets[0],
      id: "widget_cpi",
    };

    expect(DashboardLayoutSchema.safeParse(invalidLayout).success).toBe(false);
  });

  it("accepts controlled UI action proposals", () => {
    expect(UIActionProposalSchema.safeParse(actionProposal).success).toBe(true);
  });

  it("rejects unknown or unsafe action payloads", () => {
    const unknownAction = {
      ...actionProposal,
      actions: [
        {
          type: "run_script",
          script: "document.body.innerHTML = ''",
        },
      ],
    };

    const extraPayload = {
      ...actionProposal,
      actions: [
        {
          type: "remove_widget",
          widgetId: "widget_cpi",
          selector: "#root",
        },
      ],
    };

    expect(UIActionProposalSchema.safeParse(unknownAction).success).toBe(false);
    expect(UIActionProposalSchema.safeParse(extraPayload).success).toBe(false);
  });

  it("accepts an indicator summary projection", () => {
    const summary = {
      metadata: indicator,
      category: "Consumer prices",
      country: { code: "US", name: "United States" },
      definition: "Headline US CPI for all urban consumers.",
    };

    expect(IndicatorSummarySchema.safeParse(summary).success).toBe(true);
  });

  it("rejects indicator summaries with extra catalog-only fields", () => {
    const summary = {
      metadata: indicator,
      category: "Consumer prices",
      country: { code: "US", name: "United States" },
      definition: "Headline US CPI for all urban consumers.",
      display: {
        defaultWidgetType: "metric_card",
        observationDatePlaceholder: "2026-03",
        guidance: "leak",
      },
    };

    expect(IndicatorSummarySchema.safeParse(summary).success).toBe(false);
  });

  it("accepts a search response and a fetchedAt with offset", () => {
    const response = {
      indicators: [
        {
          metadata: indicator,
          category: "Consumer prices",
          country: { code: "US", name: "United States" },
          definition: "Headline US CPI for all urban consumers.",
        },
      ],
      fetchedAt: "2026-04-28T12:00:00.000Z",
    };

    expect(IndicatorSearchResponseSchema.safeParse(response).success).toBe(true);
  });

  it("rejects fetchedAt without offset", () => {
    const response = {
      indicators: [],
      fetchedAt: "2026-04-28T12:00:00",
    };

    expect(IndicatorSearchResponseSchema.safeParse(response).success).toBe(false);
  });

  const sourceFred = {
    provider: "fred",
    name: "Federal Reserve Economic Data",
    seriesId: "CPIAUCSL",
    url: "https://fred.stlouisfed.org/series/CPIAUCSL",
  };

  const singleSeriesResponse = {
    indicator,
    unit: "index points",
    frequency: "monthly",
    transform: "level",
    range: { start: "2024-01" },
    source: sourceFred,
    observationDate: "2026-03",
    releaseDate: "2026-04-15",
    fetchedAt: "2026-04-28T12:00:00.000Z",
    points: [
      { date: "2024-01", value: 309.7 },
      { date: "2024-02", value: 310.4 },
    ],
  };

  it("accepts a single series response with at least one point", () => {
    expect(SingleSeriesResponseSchema.safeParse(singleSeriesResponse).success).toBe(true);
  });

  it("rejects a single series response with no points", () => {
    expect(
      SingleSeriesResponseSchema.safeParse({ ...singleSeriesResponse, points: [] }).success,
    ).toBe(false);
  });

  it("accepts a comparison response with two to four series", () => {
    const comparison = {
      series: [singleSeriesResponse, singleSeriesResponse],
      range: { start: "2024-01" },
      transform: "level",
      fetchedAt: "2026-04-28T12:00:00.000Z",
    };

    expect(ComparisonResponseSchema.safeParse(comparison).success).toBe(true);
  });

  it("rejects a comparison response with fewer than two series", () => {
    const comparison = {
      series: [singleSeriesResponse],
      range: { start: "2024-01" },
      transform: "level",
      fetchedAt: "2026-04-28T12:00:00.000Z",
    };

    expect(ComparisonResponseSchema.safeParse(comparison).success).toBe(false);
  });

  it("rejects a comparison response with more than four series", () => {
    const comparison = {
      series: Array.from({ length: 5 }, () => singleSeriesResponse),
      range: { start: "2024-01" },
      transform: "level",
      fetchedAt: "2026-04-28T12:00:00.000Z",
    };

    expect(ComparisonResponseSchema.safeParse(comparison).success).toBe(false);
  });

  it("accepts an API error envelope with a known code", () => {
    const error = {
      error: {
        code: "indicator_not_found",
        message: "Indicator us_unknown was not found.",
      },
      requestId: "11111111-2222-3333-4444-555555555555",
    };

    expect(ApiErrorSchema.safeParse(error).success).toBe(true);
  });

  it("rejects an API error envelope with an unknown code", () => {
    const error = {
      error: {
        code: "internal_error",
        message: "Bad",
      },
      requestId: "11111111-2222-3333-4444-555555555555",
    };

    expect(ApiErrorSchema.safeParse(error).success).toBe(false);
  });

  it("accepts action log entries for proposal outcomes", () => {
    const logEntry = {
      id: "action_log_001",
      proposalId: "proposal_recession_watch",
      actionType: "add_widget",
      result: "applied",
      actor: "user",
      dashboardId: "main",
      timestamp: "2026-04-28T08:01:00.000Z",
      affectedWidgetIds: ["widget_cpi"],
      summary: "Added CPI to the inflation section.",
      reasons: [],
      chatTurnId: "turn_003",
    };

    expect(ActionLogEntrySchema.safeParse(logEntry).success).toBe(true);
  });
});
