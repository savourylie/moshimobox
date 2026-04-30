import { tool } from "@openai/agents";
import { z } from "zod";
import {
  CalendarDateSchema,
  type SingleSeriesResponse,
  type TimeSeriesPoint,
  TransformSchema,
} from "@/domain/schemas";
import { seriesRepository } from "@/server/series/seriesRepository";
import { toolErrorMessage } from "./errorMessage";

export const MAX_POINTS_RETURNED = 24;

const ParamsSchema = z
  .object({
    indicatorId: z
      .string()
      .trim()
      .min(1)
      .describe("Indicator id (e.g. 'us_headline_cpi'). Use search_indicators to discover ids."),
    start: CalendarDateSchema.nullish().describe(
      "Start date in YYYY-MM-DD, YYYY-MM, or YYYY-Qn. Optional; defaults to the indicator's full available range.",
    ),
    end: CalendarDateSchema.nullish().describe(
      "End date in the same formats as start. Requires start to be set when used.",
    ),
    transform: TransformSchema.nullish().describe(
      "Transform: level (default), change, percent_change, year_over_year, moving_average.",
    ),
  })
  .strict();

export type SeriesRetrievalInput = z.infer<typeof ParamsSchema>;

interface PointSummary {
  earliest: TimeSeriesPoint | null;
  latest: TimeSeriesPoint | null;
  totalPoints: number;
  truncated: boolean;
  recent: TimeSeriesPoint[];
}

const summarisePoints = (points: readonly TimeSeriesPoint[]): PointSummary => {
  const valued = points.filter((point) => point.value !== null);
  const earliest = valued[0] ?? null;
  const latest = valued[valued.length - 1] ?? null;
  const recent = points.slice(-MAX_POINTS_RETURNED);
  return {
    earliest,
    latest,
    totalPoints: points.length,
    truncated: points.length > MAX_POINTS_RETURNED,
    recent,
  };
};

const trimPayload = (response: SingleSeriesResponse) => {
  const summary = summarisePoints(response.points);
  return {
    indicator: {
      id: response.indicator.id,
      name: response.indicator.name,
      unit: response.unit,
      frequency: response.frequency,
    },
    transform: response.transform,
    range: response.range,
    source: {
      provider: response.source.provider,
      name: response.source.name,
      seriesId: response.source.seriesId,
    },
    observationDate: response.observationDate,
    releaseDate: response.releaseDate,
    fetchedAt: response.fetchedAt,
    cacheStatus: response.cacheStatus,
    earliest: summary.earliest,
    latest: summary.latest,
    totalPoints: summary.totalPoints,
    pointsTruncated: summary.truncated,
    recentPoints: summary.recent,
  };
};

export const seriesRetrievalHandler = async (input: SeriesRetrievalInput) => {
  const range = input.start
    ? { start: input.start, ...(input.end ? { end: input.end } : {}) }
    : undefined;
  const result = await seriesRepository.getSeries({
    indicatorId: input.indicatorId,
    transform: input.transform ?? undefined,
    range,
  });
  return trimPayload(result);
};

export const seriesRetrievalTool = tool({
  name: "get_indicator_series",
  description: `Retrieve a time series for a single indicator. Returns indicator metadata, observation/release dates, source, and the most recent ${MAX_POINTS_RETURNED} points. Cite source, unit, and the observation date for any number you report.`,
  parameters: ParamsSchema,
  errorFunction: (_ctx, error) => toolErrorMessage(error),
  execute: seriesRetrievalHandler,
});
