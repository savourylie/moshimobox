import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/api/errors";
import { fixtureProvider } from "./fixtureProvider";

describe("fixtureProvider", () => {
  it("returns full-series points for a known indicator with the catalog source", async () => {
    const result = await fixtureProvider.getSeries({ indicatorId: "us_headline_cpi" });

    expect(result.indicator.id).toBe("us_headline_cpi");
    expect(result.source.provider).toBe("fred");
    expect(result.source.seriesId).toBe("CPIAUCSL");
    expect(result.unit).toBe("index points");
    expect(result.points.length).toBeGreaterThan(0);
    expect(result.observationDate).toBe(result.points[result.points.length - 1].date);
    expect(result.releaseDate).toBe("2026-04-15");
    expect(result.range.start).toBe(result.points[0].date);
    expect(result.range.end).toBe(result.points[result.points.length - 1].date);
  });

  it("slices results by range", async () => {
    const result = await fixtureProvider.getSeries({
      indicatorId: "us_headline_cpi",
      range: { start: "2025-01", end: "2025-06" },
    });

    expect(result.points.map((p) => p.date)).toEqual([
      "2025-01",
      "2025-02",
      "2025-03",
      "2025-04",
      "2025-05",
      "2025-06",
    ]);
    expect(result.observationDate).toBe("2025-06");
    expect(result.releaseDate).toBe("2025-07-15");
  });

  it("throws indicator_not_found for unknown ids", async () => {
    await expect(fixtureProvider.getSeries({ indicatorId: "us_unknown" })).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(fixtureProvider.getSeries({ indicatorId: "us_unknown" })).rejects.toMatchObject({
      code: "indicator_not_found",
      status: 404,
    });
  });

  it("rejects ranges that produce no observations", async () => {
    await expect(
      fixtureProvider.getSeries({
        indicatorId: "us_headline_cpi",
        range: { start: "1900-01", end: "1900-12" },
      }),
    ).rejects.toMatchObject({
      code: "invalid_query",
      status: 400,
    });
  });

  it("handles quarterly indicators with quarter-format dates", async () => {
    const result = await fixtureProvider.getSeries({
      indicatorId: "us_real_gdp",
      range: { start: "2024-Q1", end: "2025-Q4" },
    });

    expect(result.points.map((p) => p.date)).toEqual([
      "2024-Q1",
      "2024-Q2",
      "2024-Q3",
      "2024-Q4",
      "2025-Q1",
      "2025-Q2",
      "2025-Q3",
      "2025-Q4",
    ]);
    expect(result.observationDate).toBe("2025-Q4");
    expect(result.releaseDate).toBe("2026-01-30");
  });
});
