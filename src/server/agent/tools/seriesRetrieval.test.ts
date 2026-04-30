import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/api/errors";
import {
  MAX_POINTS_RETURNED,
  seriesRetrievalHandler,
  seriesRetrievalTool,
} from "./seriesRetrieval";

describe("seriesRetrievalHandler", () => {
  it("returns trimmed series data with source, unit, and observation metadata", async () => {
    const result = (await seriesRetrievalHandler({
      indicatorId: "us_headline_cpi",
      start: undefined,
      end: undefined,
      transform: undefined,
    })) as {
      indicator: { id: string; unit: string };
      observationDate: string;
      releaseDate: string;
      source: { name: string };
      latest: { date: string; value: number } | null;
      recentPoints: unknown[];
      totalPoints: number;
      pointsTruncated: boolean;
    };

    expect(result.indicator.id).toBe("us_headline_cpi");
    expect(result.indicator.unit).toBeDefined();
    expect(result.observationDate).toBeDefined();
    expect(result.releaseDate).toBeDefined();
    expect(result.source.name).toBeDefined();
    expect(result.latest).not.toBeNull();
    expect(result.recentPoints.length).toBeLessThanOrEqual(MAX_POINTS_RETURNED);
    expect(result.totalPoints).toBeGreaterThan(0);
  });

  it("throws ApiError when the indicator id is unknown", async () => {
    await expect(
      seriesRetrievalHandler({
        indicatorId: "us_unknown_indicator",
        start: undefined,
        end: undefined,
        transform: undefined,
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("declares the OpenAI tool with a snake_case name", () => {
    expect(seriesRetrievalTool.name).toBe("get_indicator_series");
    expect(seriesRetrievalTool.type).toBe("function");
  });
});
