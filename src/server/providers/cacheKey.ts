import type { IndicatorMetadata } from "@/domain/schemas";
import type { SeriesRequest } from "./types";

const WILDCARD = "*";

export const makeCacheKey = (
  request: SeriesRequest,
  indicator: IndicatorMetadata,
): string => {
  const seriesId = indicator.source.seriesId ?? indicator.id;
  const country = indicator.countryCode ?? WILDCARD;
  const start = request.range?.start ?? WILDCARD;
  const end = request.range?.end ?? WILDCARD;
  const transform = request.transform ?? "level";
  return [
    indicator.source.provider,
    seriesId,
    country,
    start,
    end,
    indicator.frequency,
    transform,
  ].join("|");
};
