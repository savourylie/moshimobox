import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api/errors";
import type { ProviderSeriesResult, SeriesProvider } from "./types";
import { createProviderResolver } from "./providerResolver";

const stubResult = (indicatorId: string): ProviderSeriesResult => ({
  indicator: {
    id: indicatorId,
    name: indicatorId,
    description: "stub",
    quadrantId: "growth",
    frequency: "monthly",
    unit: "stub-unit",
    source: { provider: "fred", name: "stub", seriesId: "STUB" },
    tags: [],
  },
  source: { provider: "fred", name: "stub", seriesId: "STUB" },
  unit: "stub-unit",
  points: [{ date: "2026-03", value: 1 }],
  observationDate: "2026-03",
  releaseDate: "2026-04-15",
  range: { start: "2026-03", end: "2026-03" },
});

const buildProviderMocks = () => {
  const fred: SeriesProvider = { getSeries: vi.fn(async (req) => stubResult(req.indicatorId)) };
  const fixture: SeriesProvider = {
    getSeries: vi.fn(async (req) => {
      if (req.indicatorId === "us_unknown") {
        throw new ApiError("indicator_not_found", `Indicator ${req.indicatorId} was not found.`);
      }
      return stubResult(req.indicatorId);
    }),
  };
  return { fred, fixture };
};

describe("createProviderResolver", () => {
  it("routes FRED indicators to the fixture provider when no API key is configured", async () => {
    const { fred, fixture } = buildProviderMocks();
    const resolver = createProviderResolver({ fred, fixture });

    await resolver.getSeries({ indicatorId: "us_headline_cpi" });

    expect(fixture.getSeries).toHaveBeenCalledTimes(1);
    expect(fred.getSeries).not.toHaveBeenCalled();
  });

  it("routes World Bank indicators to the fixture provider when no API key is configured", async () => {
    const { fred, fixture } = buildProviderMocks();
    const resolver = createProviderResolver({ fred, fixture });

    await resolver.getSeries({ indicatorId: "us_gdp_growth_annual" });

    expect(fixture.getSeries).toHaveBeenCalledTimes(1);
    expect(fred.getSeries).not.toHaveBeenCalled();
  });

  it("routes FRED indicators to the FRED provider when an API key is configured", async () => {
    const { fred, fixture } = buildProviderMocks();
    const resolver = createProviderResolver({ fredApiKey: "test-key", fred, fixture });

    await resolver.getSeries({ indicatorId: "us_headline_cpi" });

    expect(fred.getSeries).toHaveBeenCalledTimes(1);
    expect(fixture.getSeries).not.toHaveBeenCalled();
  });

  it("still routes World Bank indicators to fixtures when a FRED key is configured", async () => {
    const { fred, fixture } = buildProviderMocks();
    const resolver = createProviderResolver({ fredApiKey: "test-key", fred, fixture });

    await resolver.getSeries({ indicatorId: "us_gdp_growth_annual" });

    expect(fixture.getSeries).toHaveBeenCalledTimes(1);
    expect(fred.getSeries).not.toHaveBeenCalled();
  });

  it("delegates unknown ids to fixtures so the indicator_not_found error is preserved", async () => {
    const { fred, fixture } = buildProviderMocks();
    const resolver = createProviderResolver({ fredApiKey: "test-key", fred, fixture });

    await expect(resolver.getSeries({ indicatorId: "us_unknown" })).rejects.toMatchObject({
      code: "indicator_not_found",
      status: 404,
    });
    expect(fred.getSeries).not.toHaveBeenCalled();
  });
});
