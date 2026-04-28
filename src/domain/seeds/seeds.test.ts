import { describe, expect, it } from "vitest";
import {
  CalendarDateSchema,
  DashboardLayoutSchema,
  IndicatorMetadataSchema,
  QUADRANT_IDS,
  type QuadrantId,
  type WidgetConfig,
} from "@/domain/schemas";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  getSeedIndicatorsByQuadrant,
  MVP_INDICATOR_CATALOG,
  MVP_INDICATOR_CATALOG_ASSUMPTIONS,
} from ".";

const getWidgetIndicatorIds = (widget: WidgetConfig): string[] =>
  widget.type === "comparison_chart" ? widget.indicatorIds : [widget.indicatorId];

describe("seed indicator catalog", () => {
  it("documents the assumptions behind the provisional MVP indicator list", () => {
    expect(MVP_INDICATOR_CATALOG_ASSUMPTIONS.length).toBeGreaterThan(0);
    expect(
      MVP_INDICATOR_CATALOG_ASSUMPTIONS.some((assumption) =>
        assumption.toLowerCase().includes("provisional"),
      ),
    ).toBe(true);
  });

  it("validates every strict metadata payload against the shared indicator schema", () => {
    for (const indicator of MVP_INDICATOR_CATALOG) {
      expect(IndicatorMetadataSchema.safeParse(indicator.metadata).success).toBe(true);
    }
  });

  it("includes two to four indicators per macro quadrant", () => {
    for (const quadrantId of QUADRANT_IDS) {
      const indicators = getSeedIndicatorsByQuadrant(quadrantId);

      expect(indicators.length).toBeGreaterThanOrEqual(2);
      expect(indicators.length).toBeLessThanOrEqual(4);
    }
  });

  it("includes the review fields required before provider work begins", () => {
    for (const indicator of MVP_INDICATOR_CATALOG) {
      expect(indicator.metadata.name).toBeTruthy();
      expect(indicator.category).toBeTruthy();
      expect(indicator.country.code).toBe(indicator.metadata.countryCode);
      expect(indicator.country.name).toBeTruthy();
      expect(indicator.metadata.source.name).toBeTruthy();
      expect(indicator.metadata.source.seriesId).toBeTruthy();
      expect(indicator.metadata.unit).toBeTruthy();
      expect(indicator.metadata.frequency).toBeTruthy();
      expect(indicator.definition).toBeTruthy();
      expect(indicator.display.guidance).toBeTruthy();
      expect(
        CalendarDateSchema.safeParse(indicator.display.observationDatePlaceholder).success,
      ).toBe(true);
    }
  });

  it("uses stable unique ids across the catalog", () => {
    const indicatorIds = MVP_INDICATOR_CATALOG.map((indicator) => indicator.metadata.id);

    expect(new Set(indicatorIds).size).toBe(indicatorIds.length);
  });
});

describe("default dashboard layout seed", () => {
  it("validates against the shared single-dashboard layout schema", () => {
    const result = DashboardLayoutSchema.safeParse(DEFAULT_DASHBOARD_LAYOUT);

    expect(result.success).toBe(true);
  });

  it("renders the four fixed MVP macro sections", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT.id).toBe("main");
    for (const quadrantId of QUADRANT_IDS) {
      expect(DEFAULT_DASHBOARD_LAYOUT.quadrants[quadrantId].id).toBe(quadrantId);
      expect(DEFAULT_DASHBOARD_LAYOUT.quadrants[quadrantId].widgets.length).toBeGreaterThan(0);
    }
  });

  it("links every default widget to catalog indicators in the same quadrant", () => {
    const catalogById = new Map(
      MVP_INDICATOR_CATALOG.map((indicator) => [indicator.metadata.id, indicator]),
    );

    for (const quadrantId of QUADRANT_IDS) {
      const widgets = DEFAULT_DASHBOARD_LAYOUT.quadrants[quadrantId].widgets;

      for (const widget of widgets) {
        for (const indicatorId of getWidgetIndicatorIds(widget)) {
          const indicator = catalogById.get(indicatorId);

          expect(indicator, `${widget.id} references ${indicatorId}`).toBeDefined();
          expect(indicator?.metadata.quadrantId).toBe(quadrantId);
          expect(indicator?.metadata.unit).toBeTruthy();
          expect(indicator?.metadata.source).toBeTruthy();
          expect(indicator?.display.observationDatePlaceholder).toBeTruthy();
        }
      }
    }
  });

  it("gives every default widget a short semantic dashboard description", () => {
    const allWidgets = QUADRANT_IDS.flatMap(
      (quadrantId: QuadrantId) => DEFAULT_DASHBOARD_LAYOUT.quadrants[quadrantId].widgets,
    );

    for (const widget of allWidgets) {
      expect(widget.description.length).toBeGreaterThan(20);
      expect(widget.description.length).toBeLessThanOrEqual(96);
    }
  });
});
