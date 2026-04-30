import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/api/errors";
import { ComparisonResponseSchema } from "@/domain/schemas";
import { compareSeries } from "./comparison";

describe("compareSeries", () => {
  it("returns a parseable ComparisonResponse with two series", async () => {
    const response = await compareSeries({
      indicatorIds: ["us_10y_treasury_yield", "us_2y_treasury_yield"],
      range: { start: "2024-01-01" },
    });

    const parsed = ComparisonResponseSchema.safeParse(response);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.series.length).toBe(2);
      expect(parsed.data.transform).toBe("level");
    }
  });

  it("supports up to four series", async () => {
    const response = await compareSeries({
      indicatorIds: [
        "us_headline_cpi",
        "us_core_cpi",
        "us_5y_breakeven_inflation",
        "us_10y_treasury_yield",
      ],
    });

    expect(response.series.length).toBe(4);
  });

  it("rejects fewer than two indicators", async () => {
    await expect(
      compareSeries({ indicatorIds: ["us_headline_cpi"] }),
    ).rejects.toMatchObject({ code: "invalid_query" });
  });

  it("rejects more than four indicators", async () => {
    await expect(
      compareSeries({
        indicatorIds: [
          "us_headline_cpi",
          "us_core_cpi",
          "us_5y_breakeven_inflation",
          "us_10y_treasury_yield",
          "us_2y_treasury_yield",
        ],
      }),
    ).rejects.toMatchObject({ code: "invalid_query" });
  });

  it("rejects duplicate indicator ids", async () => {
    await expect(
      compareSeries({
        indicatorIds: ["us_headline_cpi", "us_headline_cpi"],
      }),
    ).rejects.toMatchObject({ code: "invalid_query" });
  });

  it("propagates indicator_not_found from the repository", async () => {
    await expect(
      compareSeries({
        indicatorIds: ["us_headline_cpi", "us_unknown"],
      }),
    ).rejects.toMatchObject({ code: "indicator_not_found" });
  });

  it("derives a union range when no explicit range is supplied", async () => {
    const response = await compareSeries({
      indicatorIds: ["us_10y_treasury_yield", "us_2y_treasury_yield"],
    });

    expect(response.range.start).toBeDefined();
    expect(response.range.end).toBeDefined();
  });

  it("marks the response stale when any underlying series is stale", async () => {
    const repo = await import("./seriesRepository");
    const original = repo.seriesRepository.getSeries.bind(repo.seriesRepository);
    let callIndex = 0;
    const spy = vi
      .spyOn(repo.seriesRepository, "getSeries")
      .mockImplementation(async (input) => {
        const result = await original(input);
        callIndex += 1;
        if (callIndex === 2) {
          return { ...result, cacheStatus: "stale" } as typeof result;
        }
        return result;
      });

    try {
      const response = await compareSeries({
        indicatorIds: ["us_10y_treasury_yield", "us_2y_treasury_yield"],
      });
      expect(response.cacheStatus).toBe("stale");
    } finally {
      spy.mockRestore();
    }
  });

  it("ApiError instances thrown by the helper carry an HTTP status", async () => {
    try {
      await compareSeries({ indicatorIds: ["us_headline_cpi"] });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });
});
