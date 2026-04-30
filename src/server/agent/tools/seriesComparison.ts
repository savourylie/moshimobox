import { tool } from "@openai/agents";
import { z } from "zod";
import {
  CalendarDateSchema,
  type ComparisonResponse,
  type TimeSeriesPoint,
  TransformSchema,
} from "@/domain/schemas";
import { compareSeries } from "@/server/series/comparison";
import { toolErrorMessage } from "./errorMessage";

export const MAX_POINTS_PER_SERIES = 16;

const ParamsSchema = z
  .object({
    indicatorIds: z
      .array(z.string().trim().min(1))
      .min(2)
      .max(4)
      .describe("Two to four indicator ids to compare side by side."),
    start: CalendarDateSchema.nullish().describe(
      "Optional start date in YYYY-MM-DD, YYYY-MM, or YYYY-Qn.",
    ),
    end: CalendarDateSchema.nullish().describe(
      "Optional end date in the same formats. Requires start.",
    ),
    transform: TransformSchema.nullish().describe(
      "Transform applied to all series: level (default), change, percent_change, year_over_year, moving_average.",
    ),
  })
  .strict();

export type SeriesComparisonInput = z.infer<typeof ParamsSchema>;

const summariseRecent = (points: readonly TimeSeriesPoint[]): TimeSeriesPoint[] =>
  points.slice(-MAX_POINTS_PER_SERIES);

const trimPayload = (response: ComparisonResponse) => ({
  range: response.range,
  transform: response.transform,
  fetchedAt: response.fetchedAt,
  cacheStatus: response.cacheStatus,
  series: response.series.map((entry) => ({
    indicator: {
      id: entry.indicator.id,
      name: entry.indicator.name,
      unit: entry.unit,
      frequency: entry.frequency,
    },
    source: {
      provider: entry.source.provider,
      name: entry.source.name,
      seriesId: entry.source.seriesId,
    },
    observationDate: entry.observationDate,
    releaseDate: entry.releaseDate,
    cacheStatus: entry.cacheStatus,
    totalPoints: entry.points.length,
    pointsTruncated: entry.points.length > MAX_POINTS_PER_SERIES,
    recentPoints: summariseRecent(entry.points),
  })),
});

export const seriesComparisonHandler = async (input: SeriesComparisonInput) => {
  const range = input.start
    ? { start: input.start, ...(input.end ? { end: input.end } : {}) }
    : undefined;
  const result = await compareSeries({
    indicatorIds: input.indicatorIds,
    transform: input.transform ?? undefined,
    range,
  });
  return trimPayload(result);
};

export const seriesComparisonTool = tool({
  name: "compare_indicator_series",
  description:
    "Compare two to four indicator time series. Returns each series with its source, unit, observation date, and most recent points. Use this when the user asks to compare countries or related indicators.",
  parameters: ParamsSchema,
  errorFunction: (_ctx, error) => toolErrorMessage(error),
  execute: seriesComparisonHandler,
});
