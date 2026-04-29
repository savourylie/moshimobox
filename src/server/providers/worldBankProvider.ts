import type { Frequency, TimeSeriesPoint } from "@/domain/schemas";
import { getSeedIndicator } from "@/domain/seeds";
import { ApiError } from "@/server/api/errors";
import { computeReleaseDate } from "@/server/fixtures/dateAxis";
import type { ProviderSeriesResult, SeriesProvider, SeriesRequest } from "./types";

export const WORLD_BANK_PER_PAGE = 20000;

export interface WorldBankProviderDeps {
  baseUrl: string;
  fetch?: typeof fetch;
}

interface WorldBankObservation {
  indicator?: { id?: string; value?: string };
  country?: { id?: string; value?: string };
  countryiso3code?: string;
  date?: string;
  value?: number | null;
  unit?: string;
  obs_status?: string;
  decimal?: number;
}

interface WorldBankErrorMessage {
  id?: string;
  key?: string;
  value?: string;
}

interface WorldBankErrorEnvelope {
  message?: WorldBankErrorMessage[];
}

interface BuildWorldBankUrlInput {
  baseUrl: string;
  country: string;
  seriesId: string;
  range?: { start?: string; end?: string };
}

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

export const extractWorldBankYear = (calendarDate: string): number => {
  if (typeof calendarDate !== "string" || calendarDate.length === 0) {
    throw new ApiError(
      "invalid_query",
      `Could not extract a year from calendar date "${calendarDate}".`,
    );
  }
  const yearOnly = /^(\d{4})$/.exec(calendarDate);
  if (yearOnly) return Number(yearOnly[1]);

  const ymd = /^(\d{4})-\d{2}-\d{2}$/.exec(calendarDate);
  if (ymd) return Number(ymd[1]);

  const ym = /^(\d{4})-\d{2}$/.exec(calendarDate);
  if (ym) return Number(ym[1]);

  const quarter = /^(\d{4})-Q[1-4]$/.exec(calendarDate);
  if (quarter) return Number(quarter[1]);

  throw new ApiError(
    "invalid_query",
    `Could not extract a year from calendar date "${calendarDate}".`,
  );
};

export const normalizeWorldBankDate = (
  raw: string,
  frequency: Frequency,
  indicatorId: string,
): string => {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new ApiError(
      "unexpected_error",
      `World Bank returned an unexpected date "${raw}" for ${indicatorId}.`,
    );
  }

  switch (frequency) {
    case "annual": {
      const match = /^(\d{4})$/.exec(raw);
      if (!match) {
        throw new ApiError(
          "unexpected_error",
          `World Bank returned a non-annual date "${raw}" for ${indicatorId}.`,
        );
      }
      return `${match[1]}-12`;
    }
    case "quarterly": {
      const match = /^(\d{4})Q([1-4])$/.exec(raw);
      if (!match) {
        throw new ApiError(
          "unexpected_error",
          `World Bank returned a non-quarterly date "${raw}" for ${indicatorId}.`,
        );
      }
      return `${match[1]}-Q${match[2]}`;
    }
    case "monthly": {
      const match = /^(\d{4})M(\d{1,2})$/.exec(raw);
      if (!match) {
        throw new ApiError(
          "unexpected_error",
          `World Bank returned a non-monthly date "${raw}" for ${indicatorId}.`,
        );
      }
      const month = Number(match[2]);
      if (!Number.isFinite(month) || month < 1 || month > 12) {
        throw new ApiError(
          "unexpected_error",
          `World Bank returned an invalid month in date "${raw}" for ${indicatorId}.`,
        );
      }
      return `${match[1]}-${String(month).padStart(2, "0")}`;
    }
    case "weekly":
    case "daily":
      throw new ApiError(
        "invalid_query",
        `World Bank does not publish ${frequency} observations for ${indicatorId}.`,
      );
  }
};

export const parseWorldBankValue = (
  raw: number | null | undefined,
): number | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "number") return null;
  if (!Number.isFinite(raw)) return null;
  return raw;
};

const buildWorldBankUrl = ({
  baseUrl,
  country,
  seriesId,
  range,
}: BuildWorldBankUrlInput): string => {
  const params = new URLSearchParams({
    format: "json",
    per_page: String(WORLD_BANK_PER_PAGE),
  });
  if (range?.start && range?.end) {
    const startYear = extractWorldBankYear(range.start);
    const endYear = extractWorldBankYear(range.end);
    const lo = Math.min(startYear, endYear);
    const hi = Math.max(startYear, endYear);
    params.set("date", `${lo}:${hi}`);
  }
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const encodedCountry = encodeURIComponent(country);
  const encodedSeries = encodeURIComponent(seriesId);
  return `${trimmedBase}/country/${encodedCountry}/indicator/${encodedSeries}?${params.toString()}`;
};

const extractWorldBankErrorDetail = (body: unknown): string | undefined => {
  if (!Array.isArray(body) || body.length === 0) return undefined;
  const head = body[0] as WorldBankErrorEnvelope | undefined;
  if (!head || !Array.isArray(head.message) || head.message.length === 0) return undefined;
  const first = head.message[0];
  if (!first || typeof first.value !== "string") return undefined;
  const trimmed = first.value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const createWorldBankProvider = ({
  baseUrl,
  fetch: fetchImpl = fetch,
}: WorldBankProviderDeps): SeriesProvider => ({
  async getSeries({ indicatorId, range }: SeriesRequest): Promise<ProviderSeriesResult> {
    if (!baseUrl || baseUrl.trim().length === 0) {
      throw new ApiError(
        "unexpected_error",
        `World Bank provider invoked without a base URL for ${indicatorId}.`,
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
    if (metadata.source.provider !== "world_bank") {
      throw new ApiError(
        "invalid_query",
        `Indicator ${indicatorId} is not sourced from World Bank.`,
      );
    }

    const seriesId = metadata.source.seriesId;
    if (!seriesId) {
      throw new ApiError(
        "invalid_query",
        `Indicator ${indicatorId} has no World Bank series id in its catalog metadata.`,
      );
    }

    const country = metadata.countryCode;
    if (!country) {
      throw new ApiError(
        "invalid_query",
        `Indicator ${indicatorId} has no country code in its catalog metadata.`,
      );
    }

    const url = buildWorldBankUrl({ baseUrl, country, seriesId, range });

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch {
      throw new ApiError(
        "unexpected_error",
        `World Bank request failed for ${indicatorId}: network error.`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError(
        "unexpected_error",
        `World Bank returned a non-JSON response for ${indicatorId}.`,
      );
    }

    if (!response.ok) {
      const detail = extractWorldBankErrorDetail(body) ?? `HTTP ${response.status}`;
      if (response.status === 400) {
        throw new ApiError(
          "invalid_query",
          `World Bank rejected the request for ${indicatorId}: ${detail}.`,
        );
      }
      throw new ApiError(
        "unexpected_error",
        `World Bank request failed for ${indicatorId}: ${detail}.`,
      );
    }

    const errorDetail = extractWorldBankErrorDetail(body);
    if (errorDetail) {
      throw new ApiError(
        "invalid_query",
        `World Bank rejected the request for ${indicatorId}: ${errorDetail}.`,
      );
    }

    if (!Array.isArray(body) || body.length < 2) {
      throw new ApiError(
        "unexpected_error",
        `World Bank returned an unexpected response shape for ${indicatorId}.`,
      );
    }

    const rawObservations = body[1];
    if (rawObservations === null || rawObservations === undefined) {
      throw new ApiError(
        "invalid_query",
        `World Bank returned no observations for ${indicatorId}.`,
      );
    }
    if (!Array.isArray(rawObservations)) {
      throw new ApiError(
        "unexpected_error",
        `World Bank returned an unexpected observations payload for ${indicatorId}.`,
      );
    }
    if (rawObservations.length === 0) {
      throw new ApiError(
        "invalid_query",
        `World Bank returned no observations for ${indicatorId}.`,
      );
    }

    const observations = rawObservations as WorldBankObservation[];
    const points: TimeSeriesPoint[] = observations.map((obs) => ({
      date: normalizeWorldBankDate(obs.date ?? "", metadata.frequency, indicatorId),
      value: parseWorldBankValue(obs.value),
    }));

    points.sort((a, b) => compareDates(a.date, b.date));

    const sliced = range ? sliceByRange(points, range) : points;
    if (sliced.length === 0) {
      throw new ApiError(
        "invalid_query",
        `No World Bank observations fall in the requested range for ${indicatorId}.`,
      );
    }

    const firstPoint = sliced[0];
    const lastPoint = sliced[sliced.length - 1];
    const observationDate = lastPoint.date;
    const releaseDate = computeReleaseDate(observationDate, metadata.frequency);

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
