import type {
  Frequency,
  QuadrantId,
  TrendMetadata,
  WidgetConfig,
  WidgetDataResponse,
} from "@/domain/schemas";
import { QUADRANT_IDS } from "@/domain/schemas";
import { DEFAULT_DASHBOARD_LAYOUT, getSeedIndicator } from "@/domain/seeds";
import { ApiError } from "@/server/api/errors";
import { periodLabel } from "@/server/fixtures/dateAxis";
import { seriesRepository } from "@/server/series/seriesRepository";

const findWidget = (
  widgetId: string,
): { widget: WidgetConfig; quadrantId: QuadrantId } | undefined => {
  for (const quadrantId of QUADRANT_IDS) {
    const widget = DEFAULT_DASHBOARD_LAYOUT.quadrants[quadrantId].widgets.find(
      (candidate) => candidate.id === widgetId,
    );
    if (widget) {
      return { widget, quadrantId };
    }
  }
  return undefined;
};

const trendFor = (delta: number, frequency: Frequency): TrendMetadata => {
  if (delta > 0) {
    return { direction: "up", label: "Rising", period: periodLabel(frequency) };
  }
  if (delta < 0) {
    return { direction: "down", label: "Falling", period: periodLabel(frequency) };
  }
  return { direction: "flat", label: "Steady", period: periodLabel(frequency) };
};

const round = (value: number): number => Math.round(value * 10000) / 10000;

export const getWidgetData = async (widgetId: string): Promise<WidgetDataResponse> => {
  const found = findWidget(widgetId);
  if (!found) {
    throw new ApiError("widget_not_found", `Widget ${widgetId} was not found in the layout.`);
  }

  const { widget } = found;

  if (widget.type === "comparison_chart") {
    throw new ApiError(
      "widget_type_unsupported",
      `Widget ${widgetId} is a comparison chart. Use /api/series/compare for multi-indicator data.`,
    );
  }

  const seed = getSeedIndicator(widget.indicatorId);
  if (!seed) {
    throw new ApiError(
      "indicator_not_found",
      `Indicator ${widget.indicatorId} referenced by widget ${widgetId} was not found.`,
    );
  }

  const series = await seriesRepository.getSeries({ indicatorId: widget.indicatorId });

  if (series.points.length < 2) {
    throw new ApiError(
      "unexpected_error",
      `Widget ${widgetId} requires at least two observations.`,
    );
  }

  const last = series.points[series.points.length - 1];
  const prev = series.points[series.points.length - 2];

  if (last.value === null || prev.value === null) {
    throw new ApiError(
      "unexpected_error",
      `Widget ${widgetId} has missing values in the latest observations.`,
    );
  }

  const deltaValue = round(last.value - prev.value);
  const deltaPercent =
    prev.value === 0 ? undefined : round(((last.value - prev.value) / prev.value) * 100);
  const period = periodLabel(seed.metadata.frequency);

  return {
    widgetId,
    indicator: seed.metadata,
    unit: seed.metadata.unit,
    currentValue: last.value,
    previousValue: prev.value,
    change: {
      value: deltaValue,
      unit: seed.metadata.unit,
      ...(deltaPercent !== undefined ? { percent: deltaPercent } : {}),
      period,
    },
    observationDate: series.observationDate,
    releaseDate: series.releaseDate,
    source: seed.metadata.source,
    trend: trendFor(deltaValue, seed.metadata.frequency),
    status: {
      tone: "neutral",
      label: "Context only",
      rationale: "Fixture data is for contract validation, not market signals.",
    },
  };
};
