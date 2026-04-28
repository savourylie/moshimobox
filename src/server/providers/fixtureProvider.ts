import type { TimeSeriesPoint } from "@/domain/schemas";
import { getSeedIndicator } from "@/domain/seeds";
import { ApiError } from "@/server/api/errors";
import { computeReleaseDate } from "@/server/fixtures/dateAxis";
import { generateFixtureSeries } from "@/server/fixtures/seriesGenerator";
import type { ProviderSeriesResult, SeriesProvider, SeriesRequest } from "./types";

const compareDates = (a: string, b: string): number => {
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

const sliceByRange = (
  points: TimeSeriesPoint[],
  range: { start?: string; end?: string },
): TimeSeriesPoint[] =>
  points.filter((point) => {
    if (range.start && compareDates(point.date, range.start) < 0) return false;
    if (range.end && compareDates(point.date, range.end) > 0) return false;
    return true;
  });

export const createFixtureProvider = (): SeriesProvider => ({
  async getSeries({ indicatorId, range }: SeriesRequest): Promise<ProviderSeriesResult> {
    const seed = getSeedIndicator(indicatorId);
    if (!seed) {
      throw new ApiError(
        "indicator_not_found",
        `Indicator ${indicatorId} was not found in the catalog.`,
      );
    }

    const { metadata, display } = seed;
    const fullSeries = generateFixtureSeries({
      indicatorId,
      frequency: metadata.frequency,
      endObservation: display.observationDatePlaceholder,
    });

    const sliced = range ? sliceByRange(fullSeries.points, range) : fullSeries.points;
    if (sliced.length === 0) {
      throw new ApiError(
        "invalid_query",
        `No fixture observations fall in the requested range for ${indicatorId}.`,
      );
    }

    const lastPoint = sliced[sliced.length - 1];
    const observationDate = lastPoint.date;
    const releaseDate = computeReleaseDate(observationDate, metadata.frequency);
    const firstPoint = sliced[0];

    return {
      indicator: metadata,
      source: metadata.source,
      unit: metadata.unit,
      points: sliced,
      observationDate,
      releaseDate,
      range: { start: firstPoint.date, end: lastPoint.date },
    };
  },
});

export const fixtureProvider: SeriesProvider = createFixtureProvider();
