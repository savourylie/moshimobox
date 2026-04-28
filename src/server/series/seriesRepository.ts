import type { DateRange, SingleSeriesResponse, Transform } from "@/domain/schemas";
import { fixtureProvider } from "@/server/providers/fixtureProvider";
import type { SeriesProvider } from "@/server/providers/types";
import { applyTransform } from "@/server/transforms/apply";

export interface GetSeriesInput {
  indicatorId: string;
  range?: DateRange;
  transform?: Transform;
}

export interface SeriesRepositoryDeps {
  provider?: SeriesProvider;
  now?: () => Date;
}

const defaultNow = () => new Date();

export const createSeriesRepository = ({
  provider = fixtureProvider,
  now = defaultNow,
}: SeriesRepositoryDeps = {}) => ({
  async getSeries(input: GetSeriesInput): Promise<SingleSeriesResponse> {
    const transform: Transform = input.transform ?? "level";
    const result = await provider.getSeries({
      indicatorId: input.indicatorId,
      range: input.range,
      transform,
    });

    const transformed = applyTransform({
      points: result.points,
      transform,
      frequency: result.indicator.frequency,
    });

    return {
      indicator: result.indicator,
      unit: transformed.unitOverride ?? result.unit,
      frequency: result.indicator.frequency,
      transform,
      range: result.range,
      source: result.source,
      observationDate: result.observationDate,
      releaseDate: result.releaseDate,
      fetchedAt: now().toISOString(),
      points: transformed.points,
    };
  },
});

export const seriesRepository = createSeriesRepository();
