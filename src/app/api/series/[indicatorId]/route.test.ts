import { describe, expect, it, vi } from "vitest";
import { ApiErrorSchema, SingleSeriesResponseSchema } from "@/domain/schemas";
import { GET } from "./route";

const callRoute = (indicatorId: string, query = "") =>
  GET(new Request(`http://test/api/series/${indicatorId}${query ? `?${query}` : ""}`), {
    params: Promise.resolve({ indicatorId }),
  });

describe("GET /api/series/[indicatorId]", () => {
  it("returns a parseable SingleSeriesResponse with default level transform", async () => {
    const response = await callRoute("us_headline_cpi");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    const parsed = SingleSeriesResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.transform).toBe("level");
    }
  });

  it("applies a transform and a range when provided", async () => {
    const response = await callRoute(
      "us_headline_cpi",
      "start=2025-01&end=2025-06&transform=percent_change",
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.transform).toBe("percent_change");
    expect(body.unit).toBe("percent");
    expect(body.points.length).toBe(6);
  });

  it("returns 404 indicator_not_found for unknown ids", async () => {
    const response = await callRoute("us_unknown");

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(ApiErrorSchema.safeParse(body).success).toBe(true);
    expect(body.error.code).toBe("indicator_not_found");
  });

  it("returns 400 invalid_query for an unsupported transform value", async () => {
    const response = await callRoute("us_headline_cpi", "transform=ratio");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
    expect(Array.isArray(body.error.fields)).toBe(true);
  });

  it("returns 400 invalid_query when end is supplied without start", async () => {
    const response = await callRoute("us_headline_cpi", "end=2025-06");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
  });

  it("returns 500 unexpected_error when the repository throws a non-ApiError", async () => {
    const repo = await import("@/server/series/seriesRepository");
    const spy = vi.spyOn(repo.seriesRepository, "getSeries").mockImplementation(async () => {
      throw new Error("oops");
    });

    try {
      const response = await callRoute("us_headline_cpi");
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error.code).toBe("unexpected_error");
      expect(body.error.message).not.toContain("oops");
    } finally {
      spy.mockRestore();
    }
  });
});
