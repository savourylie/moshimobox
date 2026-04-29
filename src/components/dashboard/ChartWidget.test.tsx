import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  ComparisonResponse,
  IndicatorMetadata,
  SingleSeriesResponse,
  Source,
} from "@/domain/schemas";
import { ComparisonChartWidget, LineChartWidget } from "./ChartWidget";

const fredSource = (seriesId: string): Source => ({
  provider: "fred",
  name: "Federal Reserve Economic Data",
  seriesId,
  url: `https://fred.stlouisfed.org/series/${seriesId}`,
});

const indicator = (id: string, name: string, unit: string, source: Source): IndicatorMetadata => ({
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

const singleSeries = (overrides: Partial<SingleSeriesResponse> = {}): SingleSeriesResponse => {
  const source = fredSource("CPILFESL");
  return {
    indicator: indicator("us_core_cpi", "Core CPI", "index points", source),
    unit: "index points",
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
      { date: "2026-02", value: 310.4 },
      { date: "2026-03", value: 312.2 },
    ],
    ...overrides,
  };
};

const comparisonSeries = (id: string, name: string, seriesId: string): SingleSeriesResponse => {
  const source = fredSource(seriesId);
  return {
    indicator: {
      ...indicator(id, name, "percent", source),
      frequency: "daily",
      quadrantId: "market",
    },
    unit: "percent",
    frequency: "daily",
    transform: "level",
    range: {
      start: "2026-04-23",
      end: "2026-04-24",
    },
    source,
    observationDate: "2026-04-24",
    releaseDate: "2026-04-25",
    fetchedAt: "2026-04-29T10:00:00.000Z",
    cacheStatus: "fresh",
    points:
      id === "us_10y_treasury_yield"
        ? [
            { date: "2026-04-23", value: 4.18 },
            { date: "2026-04-24", value: 4.22 },
          ]
        : [
            { date: "2026-04-23", value: 3.91 },
            { date: "2026-04-24", value: 3.95 },
          ],
  };
};

const comparisonResponse = (overrides: Partial<ComparisonResponse> = {}): ComparisonResponse => ({
  series: [
    comparisonSeries("us_10y_treasury_yield", "10Y Treasury yield", "DGS10"),
    comparisonSeries("us_2y_treasury_yield", "2Y Treasury yield", "DGS2"),
  ],
  range: {
    start: "2026-04-23",
    end: "2026-04-24",
  },
  transform: "level",
  fetchedAt: "2026-04-29T10:00:00.000Z",
  cacheStatus: "fresh",
  ...overrides,
});

describe("LineChartWidget", () => {
  it("renders a single normalized series with labels, latest value, unit, date, and source", () => {
    render(
      <LineChartWidget
        data={singleSeries()}
        description="Underlying consumer price trend."
        quadrantId="inflation"
        title="Core CPI"
      />,
    );

    expect(screen.getByRole("heading", { name: "Core CPI", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Core CPI chart/ })).toBeInTheDocument();
    expect(screen.getByText("312.20")).toBeInTheDocument();
    expect(screen.getAllByText("index points").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("as of Mar 2026")).toBeInTheDocument();
    expect(screen.getByText("Range Jan 2026 to Mar 2026")).toBeInTheDocument();
    expect(
      screen.getByText("Source: Federal Reserve Economic Data - CPILFESL"),
    ).toBeInTheDocument();
  });

  it("keeps sparse series factual and does not connect across missing observations", () => {
    const { container } = render(
      <LineChartWidget
        data={singleSeries({
          range: {
            start: "2026-01",
            end: "2026-04",
          },
          observationDate: "2026-04",
          points: [
            { date: "2026-01", value: 309.8 },
            { date: "2026-02", value: null },
            { date: "2026-03", value: 311.1 },
            { date: "2026-04", value: 312.2 },
          ],
        })}
        description="Underlying consumer price trend."
        quadrantId="inflation"
        title="Core CPI"
      />,
    );

    expect(
      screen.getByText("Core CPI: 1 missing observation omitted without interpolation."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="chart-path"]')).toHaveLength(1);
  });

  it("withholds the chart when no observed values are returned", () => {
    render(
      <LineChartWidget
        data={singleSeries({
          points: [
            { date: "2026-01", value: null },
            { date: "2026-02", value: null },
          ],
        })}
        description="Underlying consumer price trend."
        quadrantId="inflation"
        title="Core CPI"
      />,
    );

    expect(screen.queryByRole("img", { name: /Core CPI chart/ })).not.toBeInTheDocument();
    expect(screen.getByText("No observed values returned for Core CPI.")).toBeInTheDocument();
  });
});

describe("ComparisonChartWidget", () => {
  it("renders two normalized series with labels, shared date scale, units, and sources", () => {
    const { container } = render(
      <ComparisonChartWidget
        data={comparisonResponse()}
        description="10Y and 2Y Treasury yields."
        quadrantId="market"
        title="Yield curve"
      />,
    );

    expect(screen.getByRole("heading", { name: "Yield curve", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Yield curve comparison chart/ })).toBeInTheDocument();
    expect(screen.getByText("10Y Treasury yield")).toBeInTheDocument();
    expect(screen.getByText("4.22 percent as of 2026-04-24")).toBeInTheDocument();
    expect(screen.getByText("2Y Treasury yield")).toBeInTheDocument();
    expect(screen.getByText("3.95 percent as of 2026-04-24")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sources: Federal Reserve Economic Data - DGS10; Federal Reserve Economic Data - DGS2",
      ),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="chart-path"]')).toHaveLength(2);
  });

  it("withholds mixed-frequency comparison charts instead of implying one cadence", () => {
    const daily = comparisonSeries("us_10y_treasury_yield", "10Y Treasury yield", "DGS10");
    const monthlySource = fredSource("CPILFESL");
    const monthly = {
      ...singleSeries({
        indicator: indicator("us_core_cpi", "Core CPI", "index points", monthlySource),
        source: monthlySource,
      }),
      frequency: "monthly" as const,
    };

    render(
      <ComparisonChartWidget
        data={comparisonResponse({
          series: [daily, monthly],
          range: {
            start: "2026-01",
            end: "2026-04-24",
          },
        })}
        description="Daily yields and monthly prices."
        quadrantId="market"
        title="Yield and CPI"
      />,
    );

    expect(
      screen.queryByRole("img", { name: /Yield and CPI comparison chart/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Series use mixed frequencies (daily, monthly); chart is withheld to avoid implying a shared observation cadence.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("4.22 percent as of 2026-04-24")).toBeInTheDocument();
    expect(screen.getByText("312.20 index points as of Mar 2026")).toBeInTheDocument();
  });
});
