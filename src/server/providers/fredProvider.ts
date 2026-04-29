import type { Frequency, TimeSeriesPoint } from "@/domain/schemas";
import { getSeedIndicator } from "@/domain/seeds";
import { ApiError } from "@/server/api/errors";
import { computeReleaseDate } from "@/server/fixtures/dateAxis";
import type { ProviderSeriesResult, SeriesProvider, SeriesRequest } from "./types";

export const FRED_OBSERVATIONS_URL = "https://api.stlouisfed.org/fred/series/observations";

export interface FredProviderDeps {
  apiKey: string;
  fetch?: typeof fetch;
}

interface FredObservation {
  date: string;
  value: string;
  realtime_start?: string;
  realtime_end?: string;
}

interface FredObservationsResponse {
  observations?: FredObservation[];
  error_code?: number;
  error_message?: string;
}

interface BuildFredUrlInput {
  seriesId: string;
  apiKey: string;
  range?: { start?: string; end?: string };
}

const QUARTER_FOR_MONTH: Record<number, 1 | 2 | 3 | 4> = {
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 2,
  6: 2,
  7: 3,
  8: 3,
  9: 3,
  10: 4,
  11: 4,
  12: 4,
};

const parseFredDate = (value: string, indicatorId: string): { y: number; m: number; d: number } => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new ApiError(
      "provider_error",
      `FRED returned an unexpected date "${value}" for ${indicatorId}.`,
    );
  }
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
};

export const normalizeFredDate = (
  raw: string,
  frequency: Frequency,
  indicatorId: string,
): string => {
  const { y, m } = parseFredDate(raw, indicatorId);
  switch (frequency) {
    case "daily":
    case "weekly":
      return raw;
    case "monthly":
      return `${y}-${String(m).padStart(2, "0")}`;
    case "quarterly":
      return `${y}-Q${QUARTER_FOR_MONTH[m]}`;
    case "annual":
      return `${y}-12`;
  }
};

export const parseFredValue = (raw: string | null | undefined): number | null => {
  if (raw == null) return null;
  if (raw === "." || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const anchorToFredDate = (calendarDate: string, mode: "start" | "end"): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(calendarDate)) return calendarDate;

  const ymMatch = /^(\d{4})-(\d{2})$/.exec(calendarDate);
  if (ymMatch) {
    const y = Number(ymMatch[1]);
    const m = Number(ymMatch[2]);
    if (mode === "start") return `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }

  const qMatch = /^(\d{4})-Q([1-4])$/.exec(calendarDate);
  if (qMatch) {
    const y = Number(qMatch[1]);
    const q = Number(qMatch[2]);
    if (mode === "start") {
      const startMonth = (q - 1) * 3 + 1;
      return `${y}-${String(startMonth).padStart(2, "0")}-01`;
    }
    const endMonth = q * 3;
    const lastDay = new Date(Date.UTC(y, endMonth, 0)).getUTCDate();
    return `${y}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }

  throw new ApiError(
    "invalid_query",
    `Could not anchor calendar date "${calendarDate}" for the FRED request.`,
  );
};

const buildFredUrl = ({ seriesId, apiKey, range }: BuildFredUrlInput): string => {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
  });
  if (range?.start) {
    params.set("observation_start", anchorToFredDate(range.start, "start"));
  }
  if (range?.end) {
    params.set("observation_end", anchorToFredDate(range.end, "end"));
  }
  return `${FRED_OBSERVATIONS_URL}?${params.toString()}`;
};

const toTimeSeriesPoint = (
  obs: FredObservation,
  frequency: Frequency,
  indicatorId: string,
): TimeSeriesPoint => ({
  date: normalizeFredDate(obs.date, frequency, indicatorId),
  value: parseFredValue(obs.value),
});

export const createFredProvider = ({
  apiKey,
  fetch: fetchImpl = fetch,
}: FredProviderDeps): SeriesProvider => ({
  async getSeries({ indicatorId, range }: SeriesRequest): Promise<ProviderSeriesResult> {
    if (!apiKey) {
      throw new ApiError(
        "unexpected_error",
        `FRED provider invoked without an API key for ${indicatorId}.`,
      );
    }

    const seed = getSeedIndicator(indicatorId);
    if (!seed) {
      throw new ApiError(
        "indicator_not_found",
        `Indicator ${indicatorId} was not found in the catalog.`,
      );
    }

    const { metadata } = seed;
    if (metadata.source.provider !== "fred") {
      throw new ApiError("invalid_query", `Indicator ${indicatorId} is not sourced from FRED.`);
    }

    const fredSeriesId = metadata.source.seriesId;
    if (!fredSeriesId) {
      throw new ApiError(
        "invalid_query",
        `Indicator ${indicatorId} has no FRED series id in its catalog metadata.`,
      );
    }

    const url = buildFredUrl({ seriesId: fredSeriesId, apiKey, range });

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch {
      throw new ApiError(
        "provider_error",
        `FRED request failed for ${indicatorId}: network error.`,
      );
    }

    let body: FredObservationsResponse;
    try {
      body = (await response.json()) as FredObservationsResponse;
    } catch {
      throw new ApiError("provider_error", `FRED returned a non-JSON response for ${indicatorId}.`);
    }

    if (!response.ok) {
      const detail =
        typeof body?.error_message === "string" && body.error_message.trim().length > 0
          ? body.error_message
          : `HTTP ${response.status}`;

      if (response.status === 400) {
        throw new ApiError(
          "invalid_query",
          `FRED rejected the request for ${indicatorId}: ${detail}.`,
        );
      }
      throw new ApiError("provider_error", `FRED request failed for ${indicatorId}: ${detail}.`);
    }

    const rawObservations = Array.isArray(body.observations) ? body.observations : [];
    if (rawObservations.length === 0) {
      throw new ApiError("invalid_query", `FRED returned no observations for ${indicatorId}.`);
    }

    const points = rawObservations.map((obs) =>
      toTimeSeriesPoint(obs, metadata.frequency, indicatorId),
    );

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const observationDate = lastPoint.date;
    const releaseDate = computeReleaseDate(observationDate, metadata.frequency);

    return {
      indicator: metadata,
      source: metadata.source,
      unit: metadata.unit,
      points,
      observationDate,
      releaseDate,
      fetchedAt: new Date().toISOString(),
      cacheStatus: "fresh",
      range: { start: firstPoint.date, end: lastPoint.date },
    };
  },
});
