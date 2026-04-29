import { getSeedIndicator } from "@/domain/seeds";
import { getFredApiKey, getWorldBankBaseUrl } from "@/server/config/env";
import { createCachingProvider } from "./cachingProvider";
import { fixtureProvider } from "./fixtureProvider";
import { createFredProvider } from "./fredProvider";
import { createWorldBankProvider } from "./worldBankProvider";
import type { SeriesProvider, SeriesRequest } from "./types";

export interface ProviderResolverDeps {
  fredApiKey?: string;
  worldBankBaseUrl?: string;
  fetch?: typeof fetch;
  fixture?: SeriesProvider;
  fred?: SeriesProvider;
  worldBank?: SeriesProvider;
}

export const createProviderResolver = ({
  fredApiKey,
  worldBankBaseUrl,
  fetch: fetchImpl,
  fixture = fixtureProvider,
  fred,
  worldBank,
}: ProviderResolverDeps = {}): SeriesProvider => {
  const liveFred = fredApiKey
    ? (fred ?? createFredProvider({ apiKey: fredApiKey, fetch: fetchImpl }))
    : undefined;

  const liveWorldBank = worldBankBaseUrl
    ? (worldBank ?? createWorldBankProvider({ baseUrl: worldBankBaseUrl, fetch: fetchImpl }))
    : undefined;

  return {
    async getSeries(request: SeriesRequest) {
      const seed = getSeedIndicator(request.indicatorId);
      if (!seed) {
        return fixture.getSeries(request);
      }

      switch (seed.metadata.source.provider) {
        case "fred":
          return (liveFred ?? fixture).getSeries(request);
        case "world_bank":
          return (liveWorldBank ?? fixture).getSeries(request);
        default:
          return fixture.getSeries(request);
      }
    },
  };
};

export const defaultProviderResolver: SeriesProvider = createCachingProvider({
  provider: createProviderResolver({
    fredApiKey: getFredApiKey(),
    worldBankBaseUrl: getWorldBankBaseUrl(),
  }),
});
