import { describe, expect, it } from "vitest";
import { QUADRANT_IDS, WidgetDataResponseSchema } from "@/domain/schemas";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";
import { ApiError } from "@/server/api/errors";
import { getWidgetData } from "./widgetData";

const ALL_WIDGETS = QUADRANT_IDS.flatMap(
  (quadrantId) => DEFAULT_DASHBOARD_LAYOUT.quadrants[quadrantId].widgets,
);

describe("getWidgetData", () => {
  it("returns a valid WidgetDataResponse for every metric_card and line_chart widget", async () => {
    const supportedWidgets = ALL_WIDGETS.filter((widget) => widget.type !== "comparison_chart");

    expect(supportedWidgets.length).toBeGreaterThan(0);

    for (const widget of supportedWidgets) {
      const data = await getWidgetData(widget.id);
      const parsed = WidgetDataResponseSchema.safeParse(data);
      expect(parsed.success).toBe(true);
      expect(data.widgetId).toBe(widget.id);
      expect(data.indicator.id).toBe(widget.indicatorId);
      expect(data.unit).toBe(data.indicator.unit);
    }
  });

  it("computes change.value as currentValue minus previousValue", async () => {
    const data = await getWidgetData("widget_us_headline_cpi");
    const expected = Math.round((data.currentValue - data.previousValue) * 10000) / 10000;
    expect(data.change.value).toBe(expected);
  });

  it("attaches a neutral status tone for fixture data", async () => {
    const data = await getWidgetData("widget_us_headline_cpi");
    expect(data.status.tone).toBe("neutral");
  });

  it("rejects comparison_chart widgets with widget_type_unsupported", async () => {
    await expect(getWidgetData("widget_us_yield_curve")).rejects.toMatchObject({
      code: "widget_type_unsupported",
      status: 400,
    });
    await expect(getWidgetData("widget_us_yield_curve")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects unknown widget ids with widget_not_found", async () => {
    await expect(getWidgetData("widget_does_not_exist")).rejects.toMatchObject({
      code: "widget_not_found",
      status: 404,
    });
  });
});
