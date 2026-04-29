import { describe, expect, it } from "vitest";
import type { IndicatorMetadata } from "@/domain/schemas";
import { makeCacheKey } from "./cacheKey";

const fredCpi: IndicatorMetadata = {
  id: "us_headline_cpi",
  name: "US headline CPI",
  description: "stub",
  quadrantId: "inflation",
  countryCode: "US",
  frequency: "monthly",
  unit: "index points",
  source: { provider: "fred", name: "FRED", seriesId: "CPIAUCSL" },
  tags: [],
};

const wbGdp: IndicatorMetadata = {
  id: "us_gdp_growth_annual",
  name: "US GDP growth (annual %)",
  description: "stub",
  quadrantId: "growth",
  countryCode: "US",
  frequency: "annual",
  unit: "percent",
  source: { provider: "world_bank", name: "World Bank", seriesId: "NY.GDP.MKTP.KD.ZG" },
  tags: [],
};

describe("makeCacheKey", () => {
  it("produces identical keys for identical requests", () => {
    const a = makeCacheKey({ indicatorId: fredCpi.id }, fredCpi);
    const b = makeCacheKey({ indicatorId: fredCpi.id }, fredCpi);
    expect(a).toBe(b);
  });

  it("includes provider, seriesId, country, frequency, and a default transform of level", () => {
    const key = makeCacheKey({ indicatorId: fredCpi.id }, fredCpi);
    expect(key).toBe("fred|CPIAUCSL|US|*|*|monthly|level");
  });

  it("falls back to the indicator id when the source has no seriesId", () => {
    const noSeriesId: IndicatorMetadata = {
      ...fredCpi,
      source: { provider: "fixture", name: "Fixture" },
    };
    const key = makeCacheKey({ indicatorId: noSeriesId.id }, noSeriesId);
    expect(key.startsWith("fixture|us_headline_cpi|US|")).toBe(true);
  });

  it("uses a wildcard for missing countryCode", () => {
    const noCountry: IndicatorMetadata = { ...fredCpi, countryCode: undefined };
    const key = makeCacheKey({ indicatorId: noCountry.id }, noCountry);
    expect(key).toBe("fred|CPIAUCSL|*|*|*|monthly|level");
  });

  it("differentiates by transform", () => {
    const level = makeCacheKey({ indicatorId: fredCpi.id }, fredCpi);
    const yoy = makeCacheKey({ indicatorId: fredCpi.id, transform: "year_over_year" }, fredCpi);
    expect(level).not.toBe(yoy);
  });

  it("differentiates by range start", () => {
    const a = makeCacheKey({ indicatorId: fredCpi.id, range: { start: "2024-01" } }, fredCpi);
    const b = makeCacheKey({ indicatorId: fredCpi.id, range: { start: "2024-02" } }, fredCpi);
    expect(a).not.toBe(b);
  });

  it("differentiates by range end", () => {
    const a = makeCacheKey(
      { indicatorId: fredCpi.id, range: { start: "2024-01", end: "2024-12" } },
      fredCpi,
    );
    const b = makeCacheKey(
      { indicatorId: fredCpi.id, range: { start: "2024-01", end: "2025-12" } },
      fredCpi,
    );
    expect(a).not.toBe(b);
  });

  it("differentiates by provider", () => {
    expect(makeCacheKey({ indicatorId: fredCpi.id }, fredCpi)).not.toBe(
      makeCacheKey({ indicatorId: wbGdp.id }, wbGdp),
    );
  });

  it("differentiates by frequency", () => {
    const monthly = makeCacheKey({ indicatorId: fredCpi.id }, fredCpi);
    const annual = makeCacheKey(
      { indicatorId: fredCpi.id },
      { ...fredCpi, frequency: "annual" },
    );
    expect(monthly).not.toBe(annual);
  });
});
