import { describe, expect, it, vi } from "vitest";
import { ApiErrorSchema, IndicatorSearchResponseSchema } from "@/domain/schemas";
import { GET } from "./route";

const callRoute = (url: string) => GET(new Request(url));

describe("GET /api/indicators", () => {
  it("returns a parseable IndicatorSearchResponse with no-store headers", async () => {
    const response = await callRoute("http://test/api/indicators");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    const parsed = IndicatorSearchResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("filters by quadrant and source when provided", async () => {
    const response = await callRoute("http://test/api/indicators?quadrant=policy&source=fred");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.indicators.length).toBeGreaterThan(0);
    for (const summary of body.indicators) {
      expect(summary.metadata.quadrantId).toBe("policy");
      expect(summary.metadata.source.provider).toBe("fred");
    }
  });

  it("returns 400 invalid_query for an unknown filter value", async () => {
    const response = await callRoute("http://test/api/indicators?quadrant=unknown");

    expect(response.status).toBe(400);
    const body = await response.json();
    const parsed = ApiErrorSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe("invalid_query");
      expect(parsed.data.requestId.length).toBeGreaterThan(0);
    }
  });

  it("returns an empty list (200) for filters that match nothing", async () => {
    const response = await callRoute("http://test/api/indicators?country=GB");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.indicators).toEqual([]);
  });

  it("returns 500 unexpected_error when the search throws", async () => {
    const searchModule = await import("@/server/indicators/search");
    const spy = vi.spyOn(searchModule, "searchIndicators").mockImplementation(() => {
      throw new Error("disk on fire");
    });

    try {
      const response = await callRoute("http://test/api/indicators");
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error.code).toBe("unexpected_error");
      expect(body.error.message).not.toContain("disk on fire");
      expect(body.requestId.length).toBeGreaterThan(0);
    } finally {
      spy.mockRestore();
    }
  });
});
