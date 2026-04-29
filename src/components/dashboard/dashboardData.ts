import {
  ApiErrorSchema,
  ComparisonResponseSchema,
  SingleSeriesResponseSchema,
  WidgetDataResponseSchema,
  type ApiError,
  type ComparisonResponse,
  type SingleSeriesResponse,
  type Source,
  type TimeSeriesPoint,
  type WidgetConfig,
  type WidgetDataResponse,
} from "@/domain/schemas";

export type DashboardWidgetData =
  | {
      kind: "widget";
      data: WidgetDataResponse;
    }
  | {
      kind: "series";
      data: SingleSeriesResponse;
    }
  | {
      kind: "comparison";
      data: ComparisonResponse;
    };

export interface DashboardFetchMetadata {
  cacheStatus: "fresh" | "stale";
  fetchedAt: string;
  sourceLabel: string;
}

export interface ObservedTimeSeriesPoint {
  date: string;
  value: number;
}

export class DashboardDataError extends Error {
  readonly code?: string;
  readonly requestId?: string;
  readonly status: number;

  constructor(message: string, options: { code?: string; requestId?: string; status: number }) {
    super(message);
    this.name = "DashboardDataError";
    this.code = options.code;
    this.requestId = options.requestId;
    this.status = options.status;
  }
}

export const visibleWidgetFetchLabel = (widget: WidgetConfig): string => {
  switch (widget.type) {
    case "metric_card":
      return `Fetching ${widget.title} widget data`;
    case "line_chart":
      return `Fetching ${widget.title} series`;
    case "comparison_chart":
      return `Fetching ${widget.title} comparison series`;
  }
};

export const buildDashboardWidgetRequestPath = (widget: WidgetConfig): string => {
  if (widget.type === "metric_card") {
    return `/api/widgets/${encodeURIComponent(widget.id)}`;
  }

  if (widget.type === "line_chart") {
    const params = new URLSearchParams();
    if (widget.range?.start) params.set("start", widget.range.start);
    if (widget.range?.end) params.set("end", widget.range.end);
    if (widget.transform) params.set("transform", widget.transform);

    const query = params.toString();
    const base = `/api/series/${encodeURIComponent(widget.indicatorId)}`;
    return query ? `${base}?${query}` : base;
  }

  const params = new URLSearchParams({
    indicatorIds: widget.indicatorIds.join(","),
  });
  if (widget.range?.start) params.set("start", widget.range.start);
  if (widget.range?.end) params.set("end", widget.range.end);
  if (widget.transform) params.set("transform", widget.transform);

  return `/api/series/compare?${params.toString()}`;
};

interface FetchDashboardWidgetDataOptions {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}

export const fetchDashboardWidgetData = async (
  widget: WidgetConfig,
  { fetcher = fetch, signal }: FetchDashboardWidgetDataOptions = {},
): Promise<DashboardWidgetData> => {
  const response = await fetcher(buildDashboardWidgetRequestPath(widget), {
    cache: "no-store",
    signal,
  });
  const body = await readJson(response);

  if (!response.ok) {
    throw dashboardErrorFromResponse(response, body);
  }

  if (widget.type === "metric_card") {
    return {
      kind: "widget",
      data: WidgetDataResponseSchema.parse(body),
    };
  }

  if (widget.type === "line_chart") {
    return {
      kind: "series",
      data: SingleSeriesResponseSchema.parse(body),
    };
  }

  return {
    kind: "comparison",
    data: ComparisonResponseSchema.parse(body),
  };
};

export const latestObservedPoint = (
  points: readonly TimeSeriesPoint[],
): ObservedTimeSeriesPoint | undefined => {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point.value !== null) {
      return {
        date: point.date,
        value: point.value,
      };
    }
  }
  return undefined;
};

export const metadataFromDashboardWidgetData = (
  widgetData: DashboardWidgetData,
): DashboardFetchMetadata => {
  switch (widgetData.kind) {
    case "widget":
      return metadataFromFields({
        source: widgetData.data.source,
        fetchedAt: widgetData.data.fetchedAt,
        cacheStatus: widgetData.data.cacheStatus,
      });
    case "series":
      return metadataFromFields({
        source: widgetData.data.source,
        fetchedAt: widgetData.data.fetchedAt,
        cacheStatus: widgetData.data.cacheStatus,
      });
    case "comparison":
      return {
        cacheStatus: widgetData.data.cacheStatus,
        fetchedAt: widgetData.data.fetchedAt,
        sourceLabel: uniqueSourceLabel(widgetData.data.series.map((item) => item.source)),
      };
  }
};

const metadataFromFields = ({
  source,
  fetchedAt,
  cacheStatus,
}: {
  source: Source;
  fetchedAt: string;
  cacheStatus: "fresh" | "stale";
}): DashboardFetchMetadata => ({
  cacheStatus,
  fetchedAt,
  sourceLabel: source.name,
});

const uniqueSourceLabel = (sources: readonly Source[]): string => {
  const names = sources.map((source) => source.name);
  return Array.from(new Set(names)).join(", ");
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

const dashboardErrorFromResponse = (response: Response, body: unknown): DashboardDataError => {
  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    return dashboardErrorFromApiPayload(parsed.data, response.status);
  }

  return new DashboardDataError(`Request failed with HTTP ${response.status}.`, {
    status: response.status,
  });
};

const dashboardErrorFromApiPayload = (payload: ApiError, status: number): DashboardDataError =>
  new DashboardDataError(payload.error.message, {
    code: payload.error.code,
    requestId: payload.requestId,
    status,
  });
