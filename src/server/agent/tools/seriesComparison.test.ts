import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/api/errors";
import {
  MAX_POINTS_PER_SERIES,
  seriesComparisonHandler,
  seriesComparisonTool,
} from "./seriesComparison";

describe("seriesComparisonHandler", () => {
  it("returns each series with citation metadata and recent points", async () => {
    const result = (await seriesComparisonHandler({
      indicatorIds: ["us_10y_treasury_yield", "us_2y_treasury_yield"],
      start: "2024-01-01",
      end: undefined,
      transform: undefined,
    })) as {
      series: Array<{
        indicator: { id: string; unit: string };
        observationDate: string;
        source: { name: string };
        recentPoints: unknown[];
      }>;
      transform: string;
    };

    expect(result.series.length).toBe(2);
    for (const entry of result.series) {
      expect(entry.indicator.unit).toBeDefined();
      expect(entry.observationDate).toBeDefined();
      expect(entry.source.name).toBeDefined();
      expect(entry.recentPoints.length).toBeLessThanOrEqual(MAX_POINTS_PER_SERIES);
    }
    expect(result.transform).toBe("level");
  });

  it("throws ApiError when given fewer than two indicators", async () => {
    await expect(
      seriesComparisonHandler({
        indicatorIds: ["us_headline_cpi"],
        start: undefined,
        end: undefined,
        transform: undefined,
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("throws ApiError when an indicator is unknown", async () => {
    await expect(
      seriesComparisonHandler({
        indicatorIds: ["us_headline_cpi", "us_unknown_indicator"],
        start: undefined,
        end: undefined,
        transform: undefined,
      }),
    ).rejects.toMatchObject({ code: "indicator_not_found" });
  });

  it("declares the OpenAI tool with a snake_case name", () => {
    expect(seriesComparisonTool.name).toBe("compare_indicator_series");
    expect(seriesComparisonTool.type).toBe("function");
  });
});
