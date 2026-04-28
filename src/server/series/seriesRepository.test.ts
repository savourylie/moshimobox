import { describe, expect, it } from "vitest";
import { SingleSeriesResponseSchema } from "@/domain/schemas";
import { ApiError } from "@/server/api/errors";
import { seriesRepository } from "./seriesRepository";

describe("seriesRepository", () => {
  it("returns a SingleSeriesResponse for a known indicator with default transform", async () => {
    const response = await seriesRepository.getSeries({ indicatorId: "us_headline_cpi" });

    const parsed = SingleSeriesResponseSchema.safeParse(response);
    expect(parsed.success).toBe(true);
    expect(response.transform).toBe("level");
    expect(response.frequency).toBe("monthly");
    expect(response.unit).toBe("index points");
    expect(response.points.at(-1)?.date).toBe("2026-03");
  });

  it("applies the percent_change transform and overrides unit", async () => {
    const response = await seriesRepository.getSeries({
      indicatorId: "us_headline_cpi",
      transform: "percent_change",
      range: { start: "2025-09", end: "2026-03" },
    });

    expect(response.transform).toBe("percent_change");
    expect(response.unit).toBe("percent");
    expect(response.points[0].value).toBeNull();
    expect(response.points.length).toBe(7);
  });

  it("propagates ApiError from the provider for unknown indicators", async () => {
    await expect(seriesRepository.getSeries({ indicatorId: "us_unknown" })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
