import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiErrorSchema, WidgetDataResponseSchema } from "@/domain/schemas";
import { layoutStore } from "@/server/layout";
import { GET } from "./route";

const callRoute = (widgetId: string) =>
  GET(new Request(`http://test/api/widgets/${widgetId}`), {
    params: Promise.resolve({ widgetId }),
  });

describe("GET /api/widgets/[widgetId]", () => {
  beforeEach(() => {
    layoutStore.reset();
  });

  it("returns a parseable WidgetDataResponse for a metric_card widget", async () => {
    const response = await callRoute("widget_us_headline_cpi");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    const parsed = WidgetDataResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("returns 400 widget_type_unsupported for comparison_chart widgets", async () => {
    const response = await callRoute("widget_us_yield_curve");

    expect(response.status).toBe(400);
    const body = await response.json();
    const parsed = ApiErrorSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe("widget_type_unsupported");
    }
  });

  it("returns 404 widget_not_found for unknown widget ids", async () => {
    const response = await callRoute("widget_does_not_exist");

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("widget_not_found");
    expect(body.requestId.length).toBeGreaterThan(0);
  });

  it("returns 500 unexpected_error when the assembler throws", async () => {
    const widgetData = await import("@/server/indicators/widgetData");
    const spy = vi.spyOn(widgetData, "getWidgetData").mockImplementation(async () => {
      throw new Error("db down");
    });

    try {
      const response = await callRoute("widget_us_headline_cpi");
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error.code).toBe("unexpected_error");
      expect(body.error.message).not.toContain("db down");
    } finally {
      spy.mockRestore();
    }
  });
});
