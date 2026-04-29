import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { IndicatorMetadata, Source } from "@/domain/schemas";
import { MetricWidget, type MetricWidgetData } from "./MetricWidget";

const fredSource: Source = {
  provider: "fred",
  name: "Federal Reserve Economic Data",
  seriesId: "CPIAUCSL",
  url: "https://fred.stlouisfed.org/series/CPIAUCSL",
};

const indicator: IndicatorMetadata = {
  id: "us_headline_cpi",
  name: "CPI",
  description: "US headline consumer price index for all urban consumers.",
  quadrantId: "inflation",
  countryCode: "US",
  frequency: "monthly",
  unit: "index points",
  source: fredSource,
  tags: ["prices"],
};

const metricData = (overrides: Partial<MetricWidgetData> = {}): MetricWidgetData => ({
  widgetId: "widget_us_headline_cpi",
  indicator,
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
  ...overrides,
});

describe("MetricWidget", () => {
  it("renders title, value, unit, signed change, dates, source, and description", () => {
    render(
      <MetricWidget
        data={metricData()}
        description="Headline consumer prices as the inflation anchor."
        quadrantId="inflation"
        title="CPI"
      />,
    );

    expect(screen.getByRole("heading", { name: "CPI", level: 3 })).toBeInTheDocument();
    expect(screen.getByText("311.40")).toBeInTheDocument();
    expect(screen.getAllByText("index points").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("+1.30 index points")).toBeInTheDocument();
    expect(screen.getByText("vs prior month")).toBeInTheDocument();
    expect(screen.getByText("as of Mar 2026")).toBeInTheDocument();
    expect(screen.getByText("Released 2026-04-15")).toBeInTheDocument();
    expect(
      screen.getByText("Source: Federal Reserve Economic Data · CPIAUCSL"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Headline consumer prices as the inflation anchor."),
    ).toBeInTheDocument();
  });

  it("uses muted status tone attributes for positive, negative, and neutral states", () => {
    const { rerender } = render(
      <MetricWidget
        data={metricData({
          status: {
            tone: "positive",
            label: "Cooling",
          },
        })}
        description="Labor slack check."
        quadrantId="growth"
        title="Unemployment rate"
      />,
    );

    expect(
      screen.getByLabelText("Unemployment rate current value").closest("article"),
    ).toHaveAttribute("data-tone", "positive");
    expect(screen.getByText("Cooling")).toBeInTheDocument();

    rerender(
      <MetricWidget
        data={metricData({
          change: {
            value: -0.1,
            unit: "percent",
            period: "vs prior month",
          },
          status: {
            tone: "negative",
            label: "Pressure rising",
          },
          unit: "percent",
        })}
        description="Policy-rate baseline."
        quadrantId="policy"
        title="Effective federal funds rate"
      />,
    );

    expect(
      screen.getByLabelText("Effective federal funds rate current value").closest("article"),
    ).toHaveAttribute("data-tone", "negative");
    expect(screen.getByText("-0.10 percent")).toBeInTheDocument();

    rerender(
      <MetricWidget
        data={metricData({
          change: {
            value: 0,
            unit: "index points",
            period: "vs prior day",
          },
          status: {
            tone: "neutral",
            label: "Context only",
          },
        })}
        description="Expected equity volatility."
        quadrantId="market"
        title="VIX"
      />,
    );

    expect(screen.getByLabelText("VIX current value").closest("article")).toHaveAttribute(
      "data-tone",
      "neutral",
    );
    expect(screen.getByText("0 index points")).toBeInTheDocument();
  });

  it("keeps release metadata optional without dropping observation date or source", () => {
    render(
      <MetricWidget
        data={metricData({ releaseDate: undefined })}
        description="Annual World Bank reference for US growth momentum."
        quadrantId="growth"
        title="GDP growth"
      />,
    );

    expect(screen.queryByText(/Released/)).not.toBeInTheDocument();
    expect(screen.getByText("as of Mar 2026")).toBeInTheDocument();
    expect(
      screen.getByText("Source: Federal Reserve Economic Data · CPIAUCSL"),
    ).toBeInTheDocument();
  });

  it("renders a selection button that fires onSelect when the card is activated", () => {
    const onSelect = vi.fn();
    render(
      <MetricWidget
        data={metricData()}
        description="Headline consumer prices as the inflation anchor."
        onSelect={onSelect}
        quadrantId="inflation"
        title="CPI"
      />,
    );

    const button = screen.getByRole("button", { name: "Open details for CPI" });
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("omits the selection button when no onSelect handler is supplied", () => {
    render(
      <MetricWidget
        data={metricData()}
        description="Headline consumer prices as the inflation anchor."
        quadrantId="inflation"
        title="CPI"
      />,
    );

    expect(screen.queryByRole("button", { name: /Open details/ })).not.toBeInTheDocument();
  });
});
