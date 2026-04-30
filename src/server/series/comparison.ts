import type {
  ComparisonResponse,
  DateRange,
  SingleSeriesResponse,
  Transform,
} from "@/domain/schemas";
import { ApiError } from "@/server/api/errors";
import { seriesRepository } from "./seriesRepository";

export interface CompareSeriesInput {
  indicatorIds: readonly string[];
  range?: DateRange;
  transform?: Transform;
}

const minDate = (a: string, b: string): string => (a <= b ? a : b);
const maxDate = (a: string, b: string): string => (a >= b ? a : b);

const deriveUnionRange = (series: SingleSeriesResponse[]): ComparisonResponse["range"] => {
  let start = series[0].range.start;
  let end = series[0].range.end ?? series[0].range.start;
  for (const item of series.slice(1)) {
    start = minDate(start, item.range.start);
    if (item.range.end) {
      end = maxDate(end, item.range.end);
    }
  }
  return { start, end };
};

export const compareSeries = async (
  input: CompareSeriesInput,
): Promise<ComparisonResponse> => {
  const ids = input.indicatorIds
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (ids.length < 2 || ids.length > 4) {
    throw new ApiError("invalid_query", "indicatorIds must include 2 to 4 indicators.");
  }

  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new ApiError("invalid_query", "indicatorIds must be unique.");
  }

  const transform = input.transform ?? "level";

  const series: SingleSeriesResponse[] = [];
  for (const indicatorId of ids) {
    const result = await seriesRepository.getSeries({
      indicatorId,
      transform,
      range: input.range,
    });
    series.push(result);
  }

  const responseRange = input.range ?? deriveUnionRange(series);
  const fetchedAt = series.reduce(
    (oldest, item) => (item.fetchedAt < oldest ? item.fetchedAt : oldest),
    series[0].fetchedAt,
  );
  const cacheStatus: ComparisonResponse["cacheStatus"] = series.some(
    (item) => item.cacheStatus === "stale",
  )
    ? "stale"
    : "fresh";

  return {
    series: series as ComparisonResponse["series"],
    range: responseRange,
    transform,
    fetchedAt,
    cacheStatus,
  };
};
