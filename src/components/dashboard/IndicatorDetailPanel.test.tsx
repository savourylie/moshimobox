import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ComparisonChartWidgetConfig,
  ComparisonResponse,
  IndicatorMetadata,
  LineChartWidgetConfig,
  MetricWidgetConfig,
  SingleSeriesResponse,
  Source,
  WidgetDataResponse,
} from "@/domain/schemas";
import { IndicatorDetailPanel } from "./IndicatorDetailPanel";

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

const widgetResponse = (overrides: Partial<WidgetDataResponse> = {}): WidgetDataResponse => ({
  widgetId: "widget_cpi",
  indicator: indicator("us_headline_cpi", "Headline CPI", "index points"),
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
  trend: { direction: "up", label: "Rising", period: "vs prior month" },
  status: { tone: "neutral", label: "Context only" },
  ...overrides,
});

const seriesResponse = (overrides: Partial<SingleSeriesResponse> = {}): SingleSeriesResponse => ({
  indicator: indicator("us_headline_cpi", "Headline CPI", "index points"),
  unit: "index points",
  frequency: "monthly",
  transform: "level",
  range: { start: "2026-01", end: "2026-03" },
  source: fredSource,
  observationDate: "2026-03",
  releaseDate: "2026-04-15",
  fetchedAt: "2026-04-29T10:00:00.000Z",
  cacheStatus: "fresh",
  points: [
    { date: "2026-01", value: 309.8 },
    { date: "2026-02", value: 310.4 },
    { date: "2026-03", value: 312.2 },
  ],
  ...overrides,
});

const tenYearSeries = (): SingleSeriesResponse => ({
  indicator: {
    ...indicator("us_10y_treasury_yield", "10Y Treasury yield", "percent"),
    quadrantId: "market",
    frequency: "daily",
  },
  unit: "percent",
  frequency: "daily",
  transform: "level",
  range: { start: "2026-04-23", end: "2026-04-24" },
  source: { ...fredSource, seriesId: "DGS10" },
  observationDate: "2026-04-24",
  releaseDate: "2026-04-25",
  fetchedAt: "2026-04-29T10:00:00.000Z",
  cacheStatus: "fresh",
  points: [
    { date: "2026-04-23", value: 4.18 },
    { date: "2026-04-24", value: 4.22 },
  ],
});

const twoYearSeries = (): SingleSeriesResponse => ({
  indicator: {
    ...indicator("us_2y_treasury_yield", "2Y Treasury yield", "percent"),
    quadrantId: "market",
    frequency: "daily",
  },
  unit: "percent",
  frequency: "daily",
  transform: "level",
  range: { start: "2026-04-23", end: "2026-04-24" },
  source: { ...fredSource, seriesId: "DGS2" },
  observationDate: "2026-04-24",
  releaseDate: "2026-04-25",
  fetchedAt: "2026-04-29T10:00:00.000Z",
  cacheStatus: "fresh",
  points: [
    { date: "2026-04-23", value: 3.91 },
    { date: "2026-04-24", value: 3.95 },
  ],
});

const comparisonResponse = (): ComparisonResponse => ({
  series: [tenYearSeries(), twoYearSeries()],
  range: { start: "2026-04-23", end: "2026-04-24" },
  transform: "level",
  fetchedAt: "2026-04-29T10:00:00.000Z",
  cacheStatus: "fresh",
});

const metricWidget: MetricWidgetConfig = {
  id: "widget_cpi",
  type: "metric_card",
  title: "Headline CPI",
  description: "Headline consumer price index.",
  indicatorId: "us_headline_cpi",
};

const lineWidget: LineChartWidgetConfig = {
  id: "widget_core_cpi",
  type: "line_chart",
  title: "Core CPI",
  description: "Underlying consumer price trend.",
  indicatorId: "us_headline_cpi",
  range: { start: "2026-01" },
  transform: "level",
};

const comparisonWidget: ComparisonChartWidgetConfig = {
  id: "widget_yield_curve",
  type: "comparison_chart",
  title: "Yield curve",
  description: "10Y and 2Y Treasury yields.",
  indicatorIds: ["us_10y_treasury_yield", "us_2y_treasury_yield"],
  range: { start: "2026-04-01" },
  transform: "level",
};

const responseJson = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("IndicatorDetailPanel", () => {
  it("renders metric widget detail with all required metadata rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responseJson(seriesResponse())),
    );
    const onClose = vi.fn();
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "widget", data: widgetResponse() }}
        onClose={onClose}
        quadrantId="inflation"
        widget={metricWidget}
      />,
    );

    const panel = await screen.findByTestId("indicator-detail-panel");
    expect(within(panel).getByRole("heading", { name: "Headline CPI", level: 2 })).toBeInTheDocument();
    expect(within(panel).getByText("311.40")).toBeInTheDocument();
    expect(within(panel).getByText("as of Mar 2026")).toBeInTheDocument();
    expect(within(panel).getByText("+1.30 index points")).toBeInTheDocument();
    expect(
      within(panel).getByText("Federal Reserve Economic Data · CPIAUCSL"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Monthly")).toBeInTheDocument();
    expect(within(panel).getByText("2026-04-15")).toBeInTheDocument();
    expect(within(panel).getByText("Headline CPI test metadata.")).toBeInTheDocument();
  });

  it("renders line chart widget detail with the historical chart", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responseJson(seriesResponse())),
    );
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "series", data: seriesResponse() }}
        onClose={vi.fn()}
        quadrantId="inflation"
        widget={lineWidget}
      />,
    );

    const panel = await screen.findByTestId("indicator-detail-panel");
    expect(within(panel).getByRole("heading", { name: "Headline CPI", level: 2 })).toBeInTheDocument();
    expect(
      await within(panel).findByRole("img", { name: /Headline CPI historical chart/ }),
    ).toBeInTheDocument();
  });

  it("renders comparison widget detail with one block per constituent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responseJson(comparisonResponse())),
    );
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "comparison", data: comparisonResponse() }}
        onClose={vi.fn()}
        quadrantId="market"
        widget={comparisonWidget}
      />,
    );

    const panel = await screen.findByTestId("indicator-detail-panel");
    expect(within(panel).getByRole("heading", { name: "Yield curve", level: 2 })).toBeInTheDocument();
    expect(
      within(panel).getByRole("heading", { name: "10Y Treasury yield", level: 4 }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("heading", { name: "2Y Treasury yield", level: 4 }),
    ).toBeInTheDocument();
    expect(within(panel).getByText("4.22 percent as of 2026-04-24")).toBeInTheDocument();
    expect(within(panel).getByText("3.95 percent as of 2026-04-24")).toBeInTheDocument();
  });

  it("falls back to a factual label when release date is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responseJson(seriesResponse())),
    );
    const data = widgetResponse();
    // Force the release date to be unavailable to simulate degenerate provider state.
    const stripped = { ...data, releaseDate: null as unknown as string };
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "widget", data: stripped }}
        onClose={vi.fn()}
        quadrantId="inflation"
        widget={metricWidget}
      />,
    );

    expect(await screen.findByText("Release date unavailable")).toBeInTheDocument();
  });

  it("falls back to factual copy when the indicator description is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responseJson(seriesResponse())),
    );
    const data = widgetResponse({
      indicator: { ...indicator("us_headline_cpi", "Headline CPI", "index points"), description: "  " },
    });
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "widget", data }}
        onClose={vi.fn()}
        quadrantId="inflation"
        widget={metricWidget}
      />,
    );

    expect(await screen.findByText("Headline consumer price index.")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responseJson(seriesResponse())),
    );
    const onClose = vi.fn();
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "widget", data: widgetResponse() }}
        onClose={onClose}
        quadrantId="inflation"
        widget={metricWidget}
      />,
    );

    await screen.findByTestId("indicator-detail-panel");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responseJson(seriesResponse())),
    );
    const onClose = vi.fn();
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "widget", data: widgetResponse() }}
        onClose={onClose}
        quadrantId="inflation"
        widget={metricWidget}
      />,
    );

    const backdrop = await screen.findByTestId("indicator-detail-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responseJson(seriesResponse())),
    );
    const onClose = vi.fn();
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "widget", data: widgetResponse() }}
        onClose={onClose}
        quadrantId="inflation"
        widget={metricWidget}
      />,
    );

    const closeButton = await screen.findByRole("button", { name: "Close indicator details" });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("focuses the close button after mount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responseJson(seriesResponse())),
    );
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "widget", data: widgetResponse() }}
        onClose={vi.fn()}
        quadrantId="inflation"
        widget={metricWidget}
      />,
    );

    const closeButton = await screen.findByRole("button", { name: "Close indicator details" });
    await waitFor(() => expect(closeButton).toHaveFocus());
  });

  it("shows a factual chart-error message when the historical series fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        responseJson(
          {
            error: { code: "provider_error", message: "FRED is not responding." },
            requestId: "req_provider_error",
          },
          503,
        ),
      ),
    );
    render(
      <IndicatorDetailPanel
        loaded={{ kind: "widget", data: widgetResponse() }}
        onClose={vi.fn()}
        quadrantId="inflation"
        widget={metricWidget}
      />,
    );

    expect(await screen.findByText(/Series unavailable/)).toBeInTheDocument();
    // The rest of the panel still renders.
    expect(screen.getByText("311.40")).toBeInTheDocument();
  });
});
