import { beforeEach, describe, expect, it } from "vitest";
import { QUADRANT_IDS, WidgetDataResponseSchema } from "@/domain/schemas";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";
import { ApiError } from "@/server/api/errors";
import { layoutStore } from "@/server/layout";
import { getWidgetData, pickLatestPair } from "./widgetData";

const ALL_WIDGETS = QUADRANT_IDS.flatMap(
  (quadrantId) => DEFAULT_DASHBOARD_LAYOUT.quadrants[quadrantId].widgets,
);

describe("getWidgetData", () => {
  beforeEach(() => {
    layoutStore.reset();
  });

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

describe("pickLatestPair", () => {
  it("returns the last two points when both are non-null", () => {
    const result = pickLatestPair([
      { date: "2024-01", value: 1 },
      { date: "2024-02", value: 2 },
      { date: "2024-03", value: 3 },
    ]);
    expect(result).toEqual({
      current: { date: "2024-03", value: 3 },
      previous: { date: "2024-02", value: 2 },
    });
  });

  it("walks back over trailing null observations", () => {
    const result = pickLatestPair([
      { date: "2022-12", value: 5 },
      { date: "2023-12", value: 6 },
      { date: "2024-12", value: 7 },
      { date: "2025-12", value: null },
    ]);
    expect(result).toEqual({
      current: { date: "2024-12", value: 7 },
      previous: { date: "2023-12", value: 6 },
    });
  });

  it("walks back over null gaps between non-null observations", () => {
    const result = pickLatestPair([
      { date: "2022-12", value: 5 },
      { date: "2023-12", value: null },
      { date: "2024-12", value: 7 },
      { date: "2025-12", value: null },
    ]);
    expect(result).toEqual({
      current: { date: "2024-12", value: 7 },
      previous: { date: "2022-12", value: 5 },
    });
  });

  it("returns null when fewer than two non-null observations exist", () => {
    expect(
      pickLatestPair([
        { date: "2024-12", value: null },
        { date: "2025-12", value: 3 },
      ]),
    ).toBeNull();
    expect(
      pickLatestPair([
        { date: "2024-12", value: null },
        { date: "2025-12", value: null },
      ]),
    ).toBeNull();
    expect(pickLatestPair([])).toBeNull();
  });
});
