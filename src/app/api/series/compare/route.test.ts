import { describe, expect, it, vi } from "vitest";
import { ApiErrorSchema, ComparisonResponseSchema } from "@/domain/schemas";
import { GET } from "./route";

const callRoute = (query: string) =>
  GET(new Request(`http://test/api/series/compare?${query}`));

describe("GET /api/series/compare", () => {
  it("returns a parseable ComparisonResponse with two series", async () => {
    const response = await callRoute(
      "indicatorIds=us_10y_treasury_yield,us_2y_treasury_yield&start=2024-01-01",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    const parsed = ComparisonResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.series.length).toBe(2);
      expect(parsed.data.transform).toBe("level");
    }
  });

  it("supports up to four series", async () => {
    const response = await callRoute(
      "indicatorIds=us_headline_cpi,us_core_cpi,us_5y_breakeven_inflation,us_10y_treasury_yield",
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.series.length).toBe(4);
  });

  it("rejects fewer than two indicators", async () => {
    const response = await callRoute("indicatorIds=us_headline_cpi");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(ApiErrorSchema.safeParse(body).success).toBe(true);
    expect(body.error.code).toBe("invalid_query");
  });

  it("rejects more than four indicators", async () => {
    const ids = [
      "us_headline_cpi",
      "us_core_cpi",
      "us_5y_breakeven_inflation",
      "us_10y_treasury_yield",
      "us_2y_treasury_yield",
    ].join(",");
    const response = await callRoute(`indicatorIds=${ids}`);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
  });

  it("rejects duplicate indicator ids", async () => {
    const response = await callRoute(
      "indicatorIds=us_headline_cpi,us_headline_cpi",
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_query");
  });

  it("returns 404 indicator_not_found when one indicator is unknown", async () => {
    const response = await callRoute("indicatorIds=us_headline_cpi,us_unknown");

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("indicator_not_found");
  });

  it("returns 500 unexpected_error when the repository throws a non-ApiError", async () => {
    const repo = await import("@/server/series/seriesRepository");
    const spy = vi.spyOn(repo.seriesRepository, "getSeries").mockImplementation(async () => {
      throw new Error("storage gone");
    });

    try {
      const response = await callRoute(
        "indicatorIds=us_headline_cpi,us_core_cpi",
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error.code).toBe("unexpected_error");
      expect(body.error.message).not.toContain("storage gone");
    } finally {
      spy.mockRestore();
    }
  });
});
