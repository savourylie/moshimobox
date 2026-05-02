import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ComparisonResponse,
  DashboardLayout,
  IndicatorMetadata,
  MetricWidgetConfig,
  SingleSeriesResponse,
  Source,
  WidgetDataResponse,
} from "@/domain/schemas";
import { LayoutProvider } from "@/components/layout/LayoutProvider";
import { DashboardDataView } from "./DashboardDataView";

const renderWithLayout = (layout: DashboardLayout) =>
  render(
    <LayoutProvider initialLayout={layout}>
      <DashboardDataView />
    </LayoutProvider>,
  );

const fredSource: Source = {
  provider: "fred",
  name: "Federal Reserve Economic Data",
  seriesId: "CPIAUCSL",
  url: "https://fred.stlouisfed.org/series/CPIAUCSL",
};

const indicator = (
  id: string,
  name: string,
  unit: string,
  source: Source = fredSource,
): IndicatorMetadata => ({
  id,
  name,
  description: `${name} test metadata.`,
  quadrantId: "inflation",
  countryCode: "US",
  frequency: "monthly",
  unit,
  source,
  tags: [],
});

const widgetResponse: WidgetDataResponse = {
  widgetId: "widget_cpi",
  indicator: indicator("us_headline_cpi", "CPI", "index points"),
  unit: "index points",
  currentValue: 311.4,
  previousValue: 310.1,
  change: {
    value: 1.3,
    unit: "index points",
    percent: 0.42,
    period: "vs prior month",
  },
  observationDate: "2026-03",
  releaseDate: "2026-04-15",
  fetchedAt: "2026-04-29T10:00:00.000Z",
  cacheStatus: "fresh",
  source: fredSource,
  trend: {
    direction: "up",
    label: "Rising",
    period: "vs prior month",
  },
  status: {
    tone: "neutral",
    label: "Context only",
  },
};

const seriesResponse = (
  id: string,
  name: string,
  unit = "index points",
  source = fredSource,
): SingleSeriesResponse => ({
  indicator: indicator(id, name, unit, source),
  unit,
  frequency: "monthly",
  transform: "level",
  range: {
    start: "2026-01",
    end: "2026-03",
  },
  source,
  observationDate: "2026-03",
  releaseDate: "2026-04-15",
  fetchedAt: "2026-04-29T10:00:00.000Z",
  cacheStatus: "fresh",
  points: [
    { date: "2026-01", value: 309.8 },
    { date: "2026-02", value: null },
    { date: "2026-03", value: 312.2 },
  ],
});

const comparisonResponse: ComparisonResponse = {
  series: [
    {
      ...seriesResponse("us_10y_treasury_yield", "10Y Treasury yield", "percent"),
      points: [
        { date: "2026-04-23", value: 4.18 },
        { date: "2026-04-24", value: 4.22 },
      ],
      observationDate: "2026-04-24",
      releaseDate: "2026-04-25",
      range: {
        start: "2026-04-23",
        end: "2026-04-24",
      },
    },
    {
      ...seriesResponse("us_2y_treasury_yield", "2Y Treasury yield", "percent"),
      points: [
        { date: "2026-04-23", value: 3.91 },
        { date: "2026-04-24", value: 3.95 },
      ],
      observationDate: "2026-04-24",
      releaseDate: "2026-04-25",
      range: {
        start: "2026-04-23",
        end: "2026-04-24",
      },
    },
  ],
  range: {
    start: "2026-04-23",
    end: "2026-04-24",
  },
  transform: "level",
  fetchedAt: "2026-04-29T10:00:00.000Z",
  cacheStatus: "fresh",
};

const testLayout: DashboardLayout = {
  id: "main",
  version: 1,
  quadrants: {
    growth: {
      id: "growth",
      label: "Growth",
      widgets: [
        {
          id: "widget_cpi",
          type: "metric_card",
          title: "CPI",
          description: "Headline consumer prices.",
          indicatorId: "us_headline_cpi",
        },
      ],
    },
    inflation: {
      id: "inflation",
      label: "Inflation",
      widgets: [
        {
          id: "widget_core_cpi",
          type: "line_chart",
          title: "Core CPI",
          description: "Underlying consumer price trend.",
          indicatorId: "us_core_cpi",
          range: {
            start: "2026-01",
          },
          transform: "level",
        },
      ],
    },
    policy: {
      id: "policy",
      label: "Policy / Liquidity",
      widgets: [],
    },
    market: {
      id: "market",
      label: "Market",
      widgets: [
        {
          id: "widget_yield_curve",
          type: "comparison_chart",
          title: "Yield curve",
          description: "10Y and 2Y Treasury yields.",
          indicatorIds: ["us_10y_treasury_yield", "us_2y_treasury_yield"],
          range: {
            start: "2026-01-01",
          },
          transform: "level",
        },
      ],
    },
  },
};

const responseJson = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DashboardDataView", () => {
  it("names each widget while data is being fetched", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    renderWithLayout(testLayout);

    expect(screen.getByText("Fetching CPI widget data")).toBeInTheDocument();
    expect(screen.getByText("Fetching Core CPI series")).toBeInTheDocument();
    expect(screen.getByText("Fetching Yield curve comparison series")).toBeInTheDocument();
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });

  it("fetches widget data through the backend API paths and preserves units and dates", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = input.toString();
      if (path === "/api/widgets/widget_cpi") return responseJson(widgetResponse);
      if (path === "/api/series/us_core_cpi?start=2026-01&transform=level") {
        return responseJson(seriesResponse("us_core_cpi", "Core CPI"));
      }
      if (
        path ===
        "/api/series/compare?indicatorIds=us_10y_treasury_yield%2Cus_2y_treasury_yield&start=2026-01-01&transform=level"
      ) {
        return responseJson(comparisonResponse);
      }
      return responseJson(
        {
          error: {
            code: "unexpected_error",
            message: `Unexpected path ${path}`,
          },
          requestId: "req_unexpected",
        },
        500,
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithLayout(testLayout);

    expect(await screen.findByText("311.40")).toBeInTheDocument();
    expect(screen.getAllByText("index points").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("as of Mar 2026").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("4.22 percent as of 2026-04-24")).toBeInTheDocument();
    expect(screen.getAllByText(/Source: Federal Reserve Economic Data/).length).toBeGreaterThan(0);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/widgets/widget_cpi",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("renders factual API errors with retry affordance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        responseJson(
          {
            error: {
              code: "provider_error",
              message: "FRED is not responding.",
            },
            requestId: "req_provider_error",
          },
          503,
        ),
      ),
    );

    renderWithLayout(testLayout);

    expect(await screen.findByText("Could not fetch CPI")).toBeInTheDocument();
    expect(screen.getAllByText("FRED is not responding.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Code: provider_error").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "Retry" }).length).toBeGreaterThanOrEqual(1);
  });

  it("renders widgets in the order defined by the layout schema", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    const reorderedLayout: DashboardLayout = {
      id: "main",
      version: 1,
      quadrants: {
        growth: {
          id: "growth",
          label: "Growth",
          widgets: [
            {
              id: "widget_zeta",
              type: "metric_card",
              title: "Zeta indicator",
              description: "Second indicator alphabetically.",
              indicatorId: "us_unemployment_rate",
            },
            {
              id: "widget_alpha",
              type: "metric_card",
              title: "Alpha indicator",
              description: "First indicator alphabetically.",
              indicatorId: "us_real_gdp",
            },
          ],
        },
        inflation: { id: "inflation", label: "Inflation", widgets: [] },
        policy: { id: "policy", label: "Policy / Liquidity", widgets: [] },
        market: { id: "market", label: "Market", widgets: [] },
      },
    };

    const { container } = render(
      <LayoutProvider initialLayout={reorderedLayout}>
        <DashboardDataView />
      </LayoutProvider>,
    );

    const growthSection = container.querySelector('section[data-quadrant="growth"]');
    expect(growthSection).not.toBeNull();
    const titles = Array.from(growthSection!.querySelectorAll("h3")).map((node) => node.textContent);
    expect(titles).toEqual(["Zeta indicator", "Alpha indicator"]);
  });

  it("renders the widget count from each quadrant config", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    const buildMetric = (id: string): MetricWidgetConfig => ({
      id,
      type: "metric_card",
      title: id,
      description: `${id} description.`,
      indicatorId: "us_unemployment_rate",
    });

    const variedLayout: DashboardLayout = {
      id: "main",
      version: 1,
      quadrants: {
        growth: {
          id: "growth",
          label: "Growth",
          widgets: [buildMetric("widget_growth_a"), buildMetric("widget_growth_b")],
        },
        inflation: {
          id: "inflation",
          label: "Inflation",
          widgets: [
            buildMetric("widget_inflation_a"),
            buildMetric("widget_inflation_b"),
            buildMetric("widget_inflation_c"),
          ],
        },
        policy: {
          id: "policy",
          label: "Policy / Liquidity",
          widgets: [
            buildMetric("widget_policy_a"),
            buildMetric("widget_policy_b"),
            buildMetric("widget_policy_c"),
            buildMetric("widget_policy_d"),
          ],
        },
        market: {
          id: "market",
          label: "Market",
          widgets: [buildMetric("widget_market_a"), buildMetric("widget_market_b")],
        },
      },
    };

    const { container } = render(
      <LayoutProvider initialLayout={variedLayout}>
        <DashboardDataView />
      </LayoutProvider>,
    );

    const articlesIn = (quadrant: string) =>
      container.querySelectorAll(`section[data-quadrant="${quadrant}"] article`);
    expect(articlesIn("growth")).toHaveLength(2);
    expect(articlesIn("inflation")).toHaveLength(3);
    expect(articlesIn("policy")).toHaveLength(4);
    expect(articlesIn("market")).toHaveLength(2);
  });

  it("opens the indicator detail panel when a widget card is activated", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = input.toString();
      if (path === "/api/widgets/widget_cpi") return responseJson(widgetResponse);
      if (path.startsWith("/api/series/us_headline_cpi")) {
        return responseJson(seriesResponse("us_headline_cpi", "CPI"));
      }
      if (path.startsWith("/api/series/us_core_cpi")) {
        return responseJson(seriesResponse("us_core_cpi", "Core CPI"));
      }
      if (path.startsWith("/api/series/compare")) {
        return responseJson(comparisonResponse);
      }
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithLayout(testLayout);

    const openButton = await screen.findByRole("button", { name: "Open details for CPI" });
    fireEvent.click(openButton);

    const panel = await screen.findByTestId("indicator-detail-panel");
    expect(within(panel).getByRole("heading", { name: "CPI", level: 2 })).toBeInTheDocument();

    const closeButton = within(panel).getByRole("button", { name: "Close indicator details" });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId("indicator-detail-panel")).not.toBeInTheDocument();
    });
    expect(openButton).toHaveFocus();
  });

  it("renders a factual widget-level error when fetched data does not match the widget type", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = input.toString();
      if (path === "/api/widgets/widget_cpi") {
        return responseJson(seriesResponse("us_headline_cpi", "CPI"));
      }
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal("fetch", fetchMock);

    const mismatchLayout: DashboardLayout = {
      id: "main",
      version: 1,
      quadrants: {
        growth: {
          id: "growth",
          label: "Growth",
          widgets: [
            {
              id: "widget_cpi",
              type: "metric_card",
              title: "CPI",
              description: "Headline consumer prices.",
              indicatorId: "us_headline_cpi",
            },
          ],
        },
        inflation: { id: "inflation", label: "Inflation", widgets: [] },
        policy: { id: "policy", label: "Policy / Liquidity", widgets: [] },
        market: { id: "market", label: "Market", widgets: [] },
      },
    };

    renderWithLayout(mismatchLayout);

    expect(await screen.findByText("Could not fetch CPI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
