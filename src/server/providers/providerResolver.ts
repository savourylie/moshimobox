import { getSeedIndicator } from "@/domain/seeds";
import { getFredApiKey } from "@/server/config/env";
import { fixtureProvider } from "./fixtureProvider";
import { createFredProvider } from "./fredProvider";
import type { SeriesProvider, SeriesRequest } from "./types";

export interface ProviderResolverDeps {
  fredApiKey?: string;
  fetch?: typeof fetch;
  fixture?: SeriesProvider;
  fred?: SeriesProvider;
}

export const createProviderResolver = ({
  fredApiKey,
  fetch: fetchImpl,
  fixture = fixtureProvider,
  fred,
}: ProviderResolverDeps = {}): SeriesProvider => {
  const liveFred = fredApiKey
    ? (fred ?? createFredProvider({ apiKey: fredApiKey, fetch: fetchImpl }))
    : undefined;

  return {
    async getSeries(request: SeriesRequest) {
      const seed = getSeedIndicator(request.indicatorId);
      if (!seed) {
        return fixture.getSeries(request);
      }
      if (seed.metadata.source.provider === "fred" && liveFred) {
        return liveFred.getSeries(request);
      }
      return fixture.getSeries(request);
    },
  };
};

export const defaultProviderResolver: SeriesProvider = createProviderResolver({
  fredApiKey: getFredApiKey(),
});
