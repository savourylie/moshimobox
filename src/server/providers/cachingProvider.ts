import type { Frequency } from "@/domain/schemas";
import { getSeedIndicator } from "@/domain/seeds";
import { makeCacheKey } from "./cacheKey";
import { ttlForFrequency } from "./freshness";
import type { ProviderSeriesResult, SeriesProvider, SeriesRequest } from "./types";

interface CacheEntry {
  result: ProviderSeriesResult;
  fetchedAt: string;
  expiresAt: number;
}

export interface CachingProviderDeps {
  provider: SeriesProvider;
  now?: () => Date;
  ttl?: (frequency: Frequency) => number;
}

export const createCachingProvider = ({
  provider,
  now = () => new Date(),
  ttl = ttlForFrequency,
}: CachingProviderDeps): SeriesProvider => {
  const cache = new Map<string, CacheEntry>();

  return {
    async getSeries(request: SeriesRequest): Promise<ProviderSeriesResult> {
      const seed = getSeedIndicator(request.indicatorId);
      if (!seed) {
        return provider.getSeries(request);
      }

      const key = makeCacheKey(request, seed.metadata);
      const entry = cache.get(key);
      const nowDate = now();
      const nowMs = nowDate.getTime();

      if (entry && entry.expiresAt > nowMs) {
        return {
          ...entry.result,
          fetchedAt: entry.fetchedAt,
          cacheStatus: "fresh",
        };
      }

      try {
        const fresh = await provider.getSeries(request);
        const fetchedAt = nowDate.toISOString();
        const expiresAt = nowMs + ttl(fresh.indicator.frequency);
        cache.set(key, { result: fresh, fetchedAt, expiresAt });
        return { ...fresh, fetchedAt, cacheStatus: "fresh" };
      } catch (err) {
        if (entry) {
          return {
            ...entry.result,
            fetchedAt: entry.fetchedAt,
            cacheStatus: "stale",
          };
        }
        throw err;
      }
    },
  };
};
