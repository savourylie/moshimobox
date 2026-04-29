import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Frequency } from "@/domain/schemas";
import { ApiError } from "@/server/api/errors";
import { createCachingProvider } from "./cachingProvider";
import type { ProviderSeriesResult, SeriesProvider, SeriesRequest } from "./types";

const HOUR_MS = 60 * 60 * 1000;

const stubResult = (overrides: Partial<ProviderSeriesResult> = {}): ProviderSeriesResult => ({
  indicator: {
    id: "us_headline_cpi",
    name: "US headline CPI",
    description: "stub",
    quadrantId: "inflation",
    countryCode: "US",
    frequency: "monthly",
    unit: "index points",
    source: { provider: "fred", name: "FRED", seriesId: "CPIAUCSL" },
    tags: [],
  },
  source: { provider: "fred", name: "FRED", seriesId: "CPIAUCSL" },
  unit: "index points",
  points: [{ date: "2026-03", value: 320.1 }],
  observationDate: "2026-03",
  releaseDate: "2026-04-15",
  fetchedAt: "1970-01-01T00:00:00.000Z",
  cacheStatus: "fresh",
  range: { start: "2026-03", end: "2026-03" },
  ...overrides,
});

interface ClockHandle {
  set: (date: Date) => void;
  advanceMs: (ms: number) => void;
  now: () => Date;
}

const makeClock = (start: Date): ClockHandle => {
  let current = new Date(start.getTime());
  return {
    set: (date) => {
      current = new Date(date.getTime());
    },
    advanceMs: (ms) => {
      current = new Date(current.getTime() + ms);
    },
    now: () => new Date(current.getTime()),
  };
};

describe("createCachingProvider", () => {
  let clock: ClockHandle;
  let inner: SeriesProvider & { getSeries: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clock = makeClock(new Date("2026-04-29T12:00:00.000Z"));
    inner = {
      getSeries: vi.fn(async (req: SeriesRequest) =>
        stubResult({ indicator: { ...stubResult().indicator, id: req.indicatorId } }),
      ),
    };
  });

  it("calls the inner provider on a miss and tags the result fresh with the current time", async () => {
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    const result = await cache.getSeries({ indicatorId: "us_headline_cpi" });

    expect(inner.getSeries).toHaveBeenCalledTimes(1);
    expect(result.cacheStatus).toBe("fresh");
    expect(result.fetchedAt).toBe("2026-04-29T12:00:00.000Z");
  });

  it("returns the cached entry on a hit without calling the inner provider", async () => {
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    const first = await cache.getSeries({ indicatorId: "us_headline_cpi" });

    clock.advanceMs(30 * 60 * 1000); // 30 minutes later, well within monthly TTL
    const second = await cache.getSeries({ indicatorId: "us_headline_cpi" });

    expect(inner.getSeries).toHaveBeenCalledTimes(1);
    expect(second.cacheStatus).toBe("fresh");
    expect(second.fetchedAt).toBe(first.fetchedAt);
  });

  it("treats different ranges as separate cache entries", async () => {
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    await cache.getSeries({ indicatorId: "us_headline_cpi" });
    await cache.getSeries({
      indicatorId: "us_headline_cpi",
      range: { start: "2024-01", end: "2024-12" },
    });

    expect(inner.getSeries).toHaveBeenCalledTimes(2);
  });

  it("treats different transforms as separate cache entries", async () => {
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    await cache.getSeries({ indicatorId: "us_headline_cpi" });
    await cache.getSeries({ indicatorId: "us_headline_cpi", transform: "year_over_year" });

    expect(inner.getSeries).toHaveBeenCalledTimes(2);
  });

  it("revalidates after the TTL has expired", async () => {
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    await cache.getSeries({ indicatorId: "us_headline_cpi" });

    clock.advanceMs(25 * HOUR_MS); // monthly TTL is 24h
    const second = await cache.getSeries({ indicatorId: "us_headline_cpi" });

    expect(inner.getSeries).toHaveBeenCalledTimes(2);
    expect(second.cacheStatus).toBe("fresh");
    expect(second.fetchedAt).toBe(clock.now().toISOString());
  });

  it("falls back to the stale cached entry when revalidation fails", async () => {
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    const first = await cache.getSeries({ indicatorId: "us_headline_cpi" });

    clock.advanceMs(25 * HOUR_MS);
    inner.getSeries.mockRejectedValueOnce(new ApiError("provider_error", "FRED request failed."));

    const stale = await cache.getSeries({ indicatorId: "us_headline_cpi" });

    expect(stale.cacheStatus).toBe("stale");
    expect(stale.fetchedAt).toBe(first.fetchedAt);
    expect(stale.points).toEqual(first.points);
  });

  it("propagates the provider error when there is no cached entry to fall back on", async () => {
    inner.getSeries.mockRejectedValueOnce(new ApiError("provider_error", "FRED request failed."));
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    await expect(cache.getSeries({ indicatorId: "us_headline_cpi" })).rejects.toMatchObject({
      code: "provider_error",
      status: 502,
    });
  });

  it("does not cache or swallow indicator_not_found errors", async () => {
    inner.getSeries.mockRejectedValue(
      new ApiError("indicator_not_found", "Indicator us_unknown was not found."),
    );
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    await expect(cache.getSeries({ indicatorId: "us_unknown" })).rejects.toMatchObject({
      code: "indicator_not_found",
      status: 404,
    });
    await expect(cache.getSeries({ indicatorId: "us_unknown" })).rejects.toMatchObject({
      code: "indicator_not_found",
    });
    expect(inner.getSeries).toHaveBeenCalledTimes(2);
  });

  it("does not cache invalid_query errors", async () => {
    inner.getSeries.mockRejectedValue(
      new ApiError("invalid_query", "Indicator is not sourced from FRED."),
    );
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    await expect(cache.getSeries({ indicatorId: "us_headline_cpi" })).rejects.toMatchObject({
      code: "invalid_query",
    });
    await expect(cache.getSeries({ indicatorId: "us_headline_cpi" })).rejects.toMatchObject({
      code: "invalid_query",
    });
    expect(inner.getSeries).toHaveBeenCalledTimes(2);
  });

  it("honors a per-frequency TTL function", async () => {
    const customTtl = vi.fn((freq: Frequency) => (freq === "annual" ? 7 * 24 * HOUR_MS : HOUR_MS));
    const cache = createCachingProvider({ provider: inner, now: clock.now, ttl: customTtl });

    await cache.getSeries({ indicatorId: "us_headline_cpi" });
    expect(customTtl).toHaveBeenCalledWith("monthly");

    clock.advanceMs(2 * HOUR_MS); // exceeds the 1h custom TTL
    await cache.getSeries({ indicatorId: "us_headline_cpi" });
    expect(inner.getSeries).toHaveBeenCalledTimes(2);
  });

  it("delegates to the inner provider when the indicator is unknown to the catalog", async () => {
    inner.getSeries.mockRejectedValueOnce(
      new ApiError("indicator_not_found", "Indicator us_unknown was not found."),
    );
    const cache = createCachingProvider({ provider: inner, now: clock.now });

    await expect(cache.getSeries({ indicatorId: "us_unknown" })).rejects.toMatchObject({
      code: "indicator_not_found",
    });
    expect(inner.getSeries).toHaveBeenCalledWith({ indicatorId: "us_unknown" });
  });
});
