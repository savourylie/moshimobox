import type {
  DateRange,
  IndicatorMetadata,
  Source,
  TimeSeriesPoint,
  Transform,
} from "@/domain/schemas";

export interface SeriesRequest {
  indicatorId: string;
  range?: DateRange;
  transform?: Transform;
}

export interface ProviderSeriesResult {
  indicator: IndicatorMetadata;
  source: Source;
  unit: string;
  points: TimeSeriesPoint[];
  observationDate: string;
  releaseDate: string;
  range: DateRange;
}

export interface SeriesProvider {
  getSeries(request: SeriesRequest): Promise<ProviderSeriesResult>;
}
