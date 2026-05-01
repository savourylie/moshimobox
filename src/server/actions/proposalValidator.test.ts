import { describe, expect, it } from "vitest";
import {
  ActionProposalValidationResultSchema,
  type DashboardLayout,
  type LayoutAction,
} from "@/domain/schemas";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";
import { QUADRANT_WIDGET_LIMITS, validateActionProposal } from "./proposalValidator";

const proposal = (actions: LayoutAction[]) => ({
  id: "proposal_test",
  summary: "Validate a dashboard action.",
  proposedBy: "agent" as const,
  proposedAt: "2026-04-30T08:00:00.000Z",
  dashboardId: "main" as const,
  chatTurnId: "turn_test",
  actions,
});

const clone = <T>(value: T): T => structuredClone(value);

describe("validateActionProposal", () => {
  it("validates add_widget proposals and returns a preview diff", () => {
    const originalInflationCount = DEFAULT_DASHBOARD_LAYOUT.quadrants.inflation.widgets.length;
    const result = validateActionProposal(
      proposal([
        {
          type: "add_widget",
          widget: {
            id: "widget_us_core_cpi_metric",
            type: "metric_card",
            title: "Core CPI quick read",
            description: "Underlying consumer price pressure as a compact card.",
            indicatorId: "us_core_cpi",
          },
          target: {
            quadrantId: "inflation",
          },
        },
      ]),
    );

    expect(ActionProposalValidationResultSchema.safeParse(result).success).toBe(true);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.affectedWidgetIds).toEqual(["widget_us_core_cpi_metric"]);
    expect(result.diff[0]).toMatchObject({
      actionType: "add_widget",
      widgetId: "widget_us_core_cpi_metric",
      before: null,
    });
    expect(result.diff[0].after?.quadrantId).toBe("inflation");
    expect(result.previewLayout.quadrants.inflation.widgets).toHaveLength(
      originalInflationCount + 1,
    );
    expect(DEFAULT_DASHBOARD_LAYOUT.quadrants.inflation.widgets).toHaveLength(
      originalInflationCount,
    );
  });

  it("validates move_widget proposals against the current widget location", () => {
    const result = validateActionProposal(
      proposal([
        {
          type: "move_widget",
          widgetId: "widget_us_unemployment_rate",
          from: {
            quadrantId: "growth",
            index: 0,
          },
          to: {
            quadrantId: "growth",
            index: 2,
          },
        },
      ]),
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.diff[0].before?.index).toBe(0);
    expect(result.diff[0].after?.index).toBe(2);
    expect(result.previewLayout.quadrants.growth.widgets[2].id).toBe("widget_us_unemployment_rate");
  });

  it("validates configure_widget proposals and preserves widget schema compatibility", () => {
    const result = validateActionProposal(
      proposal([
        {
          type: "configure_widget",
          widgetId: "widget_us_core_cpi",
          patch: {
            title: "Core CPI trend",
            transform: "year_over_year",
            range: {
              start: "2021-01",
            },
          },
        },
      ]),
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    const updated = result.previewLayout.quadrants.inflation.widgets.find(
      (widget) => widget.id === "widget_us_core_cpi",
    );
    expect(updated).toMatchObject({
      title: "Core CPI trend",
      transform: "year_over_year",
      range: { start: "2021-01" },
    });
  });

  it("validates remove_widget proposals without mutating the source layout", () => {
    const layout = clone(DEFAULT_DASHBOARD_LAYOUT);
    const result = validateActionProposal(
      proposal([
        {
          type: "remove_widget",
          widgetId: "widget_us_vix",
        },
      ]),
      { layout },
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.diff[0].after).toBeNull();
    expect(result.previewLayout.quadrants.market.widgets.map((widget) => widget.id)).not.toContain(
      "widget_us_vix",
    );
    expect(layout.quadrants.market.widgets.map((widget) => widget.id)).toContain("widget_us_vix");
  });

  it("rejects proposals that target an unknown widget", () => {
    const result = validateActionProposal(
      proposal([
        {
          type: "configure_widget",
          widgetId: "widget_missing",
          patch: {
            title: "Missing widget",
          },
        },
      ]),
    );

    expect(ActionProposalValidationResultSchema.safeParse(result).success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      code: "widget_not_found",
      widgetId: "widget_missing",
    });
    expect(result.reasons[0]).toContain("was not found");
  });

  it("rejects proposals that reference unknown indicators", () => {
    const result = validateActionProposal(
      proposal([
        {
          type: "add_widget",
          widget: {
            id: "widget_unknown_indicator",
            type: "metric_card",
            title: "Unknown indicator",
            description: "This indicator is not in the MVP catalog.",
            indicatorId: "us_unknown_indicator",
          },
          target: {
            quadrantId: "growth",
          },
        },
      ]),
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      code: "indicator_not_found",
      indicatorId: "us_unknown_indicator",
    });
  });

  it("rejects proposals that would exceed quadrant widget limits", () => {
    const layout = clone(DEFAULT_DASHBOARD_LAYOUT);
    layout.quadrants.growth.widgets.push({
      id: "widget_us_unemployment_rate_line",
      type: "line_chart",
      title: "Unemployment trend",
      description: "Labor slack over time.",
      indicatorId: "us_unemployment_rate",
      range: {
        start: "2020-01",
      },
      transform: "level",
    });
    expect(layout.quadrants.growth.widgets).toHaveLength(QUADRANT_WIDGET_LIMITS.max);

    const result = validateActionProposal(
      proposal([
        {
          type: "add_widget",
          widget: {
            id: "widget_us_real_gdp_metric",
            type: "metric_card",
            title: "Real GDP quick read",
            description: "Output level as a compact card.",
            indicatorId: "us_real_gdp",
          },
          target: {
            quadrantId: "growth",
          },
        },
      ]),
      { layout: layout as DashboardLayout },
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      code: "quadrant_limit_exceeded",
      quadrantId: "growth",
    });
    expect(layout.quadrants.growth.widgets).toHaveLength(QUADRANT_WIDGET_LIMITS.max);
  });

  it("rejects config patches that do not fit the target widget type", () => {
    const result = validateActionProposal(
      proposal([
        {
          type: "configure_widget",
          widgetId: "widget_us_headline_cpi",
          patch: {
            transform: "year_over_year",
          },
        },
      ]),
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      code: "invalid_widget_config",
      widgetId: "widget_us_headline_cpi",
    });
  });

  it("rejects widgets placed outside their indicator quadrant", () => {
    const result = validateActionProposal(
      proposal([
        {
          type: "add_widget",
          widget: {
            id: "widget_cpi_in_growth",
            type: "metric_card",
            title: "CPI in growth",
            description: "A misplaced inflation indicator.",
            indicatorId: "us_headline_cpi",
          },
          target: {
            quadrantId: "growth",
          },
        },
      ]),
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      code: "indicator_quadrant_mismatch",
      indicatorId: "us_headline_cpi",
      quadrantId: "growth",
    });
  });

  it("rejects unsupported action payloads at the proposal schema boundary", () => {
    const result = validateActionProposal({
      ...proposal([]),
      actions: [
        {
          type: "delete_widget",
          widgetId: "widget_us_vix",
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      code: "proposal_schema_invalid",
    });
  });
});
