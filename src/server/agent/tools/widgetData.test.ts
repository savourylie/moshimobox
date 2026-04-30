import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/api/errors";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";
import { widgetDataHandler, widgetDataTool } from "./widgetData";

describe("widgetDataHandler", () => {
  it("returns trimmed widget data with citation fields", async () => {
    const widget = DEFAULT_DASHBOARD_LAYOUT.quadrants.inflation.widgets.find(
      (entry) => entry.type === "metric_card",
    );
    if (!widget) throw new Error("Expected at least one metric widget for the test fixture");

    const result = (await widgetDataHandler({ widgetId: widget.id })) as {
      widgetId: string;
      indicator: { unit: string };
      observationDate: string;
      source: { name: string };
    };

    expect(result.widgetId).toBe(widget.id);
    expect(result.indicator.unit).toBeDefined();
    expect(result.observationDate).toMatch(/\d{4}-/);
    expect(result.source.name).toBeDefined();
  });

  it("throws ApiError when the widget id is unknown", async () => {
    await expect(widgetDataHandler({ widgetId: "widget.unknown" })).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(widgetDataHandler({ widgetId: "widget.unknown" })).rejects.toMatchObject({
      code: "widget_not_found",
    });
  });

  it("declares the OpenAI tool with a snake_case name", () => {
    expect(widgetDataTool.name).toBe("get_widget_data");
    expect(widgetDataTool.type).toBe("function");
  });
});
