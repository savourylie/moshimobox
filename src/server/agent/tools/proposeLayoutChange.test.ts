import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { layoutStore } from "@/server/layout";
import { proposeLayoutChangeHandler } from "./proposeLayoutChange";

describe("proposeLayoutChangeHandler", () => {
  beforeEach(() => {
    layoutStore.reset();
  });

  afterEach(() => {
    layoutStore.reset();
  });

  it("returns a valid proposal envelope for a well-formed add_widget action", async () => {
    const result = await proposeLayoutChangeHandler({
      summary: "Add 30Y vs 5Y breakeven comparison to Inflation",
      actions: [
        {
          type: "add_widget",
          target: { quadrantId: "inflation" },
          widget: {
            id: "widget.line.us_5y_breakeven_extra",
            type: "line_chart",
            title: "Breakeven inflation extra",
            description: "Additional view of 5-year breakeven inflation.",
            indicatorId: "us_5y_breakeven_inflation",
            transform: "level",
          },
        },
      ],
    });

    expect(result.proposal.id).toMatch(/^proposal-/);
    expect(result.proposal.proposedBy).toBe("agent");
    expect(result.proposal.dashboardId).toBe("main");
    expect(result.proposal.actions).toHaveLength(1);
    expect(result.basedOnVersion).toBe(layoutStore.getCurrent().version);
    expect(result.validation.valid).toBe(true);
    if (result.validation.valid) {
      expect(result.validation.diff).toHaveLength(1);
      expect(result.validation.diff[0].actionType).toBe("add_widget");
      expect(result.validation.previewLayout.id).toBe("main");
    }
  });

  it("returns a rejection envelope when the indicator does not match the target quadrant", async () => {
    const result = await proposeLayoutChangeHandler({
      summary: "Move CPI to Growth (invalid)",
      actions: [
        {
          type: "add_widget",
          target: { quadrantId: "growth" },
          widget: {
            id: "widget.metric.cpi_misplaced",
            type: "metric_card",
            title: "CPI misplaced",
            description: "CPI placed in the wrong quadrant.",
            indicatorId: "us_headline_cpi",
          },
        },
      ],
    });

    expect(result.validation.valid).toBe(false);
    if (!result.validation.valid) {
      const codes = result.validation.issues.map((issue) => issue.code);
      expect(codes).toContain("indicator_quadrant_mismatch");
      expect(result.validation.reasons.length).toBeGreaterThan(0);
    }
  });

  it("returns a rejection envelope when the indicator id is unknown", async () => {
    const result = await proposeLayoutChangeHandler({
      summary: "Add unknown indicator",
      actions: [
        {
          type: "add_widget",
          target: { quadrantId: "inflation" },
          widget: {
            id: "widget.metric.unknown",
            type: "metric_card",
            title: "Unknown indicator",
            description: "Indicator not in the catalog.",
            indicatorId: "us_does_not_exist",
          },
        },
      ],
    });

    expect(result.validation.valid).toBe(false);
    if (!result.validation.valid) {
      expect(result.validation.issues.map((issue) => issue.code)).toContain(
        "indicator_not_found",
      );
    }
  });

  it("captures basedOnVersion at call time", async () => {
    const startVersion = layoutStore.getCurrent().version;
    const result = await proposeLayoutChangeHandler({
      summary: "Remove a widget",
      actions: [
        {
          type: "remove_widget",
          widgetId: "widget_us_vix",
        },
      ],
    });

    expect(result.basedOnVersion).toBe(startVersion);
  });
});
