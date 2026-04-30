import { describe, expect, it } from "vitest";
import { indicatorSearchHandler, indicatorSearchTool } from "./indicatorSearch";

describe("indicatorSearchHandler", () => {
  it("returns matching indicators with cite-able metadata", async () => {
    const result = (await indicatorSearchHandler({
      q: "CPI",
      quadrant: undefined,
      category: undefined,
      country: undefined,
      source: undefined,
    })) as { indicators: Array<{ id: string; unit: string; source: { name: string } }> };

    expect(result.indicators.length).toBeGreaterThan(0);
    const cpi = result.indicators.find((entry) => entry.id === "us_headline_cpi");
    expect(cpi).toBeDefined();
    expect(cpi?.unit).toBeDefined();
    expect(cpi?.source.name).toBeDefined();
  });

  it("filters by quadrant", async () => {
    const result = (await indicatorSearchHandler({
      quadrant: "policy",
      q: undefined,
      category: undefined,
      country: undefined,
      source: undefined,
    })) as { indicators: Array<{ quadrant: string }> };

    expect(result.indicators.length).toBeGreaterThan(0);
    expect(result.indicators.every((entry) => entry.quadrant === "policy")).toBe(true);
  });

  it("returns an empty list with a calm message when nothing matches", async () => {
    const result = (await indicatorSearchHandler({
      q: "definitely-not-an-indicator-xyz",
      quadrant: undefined,
      category: undefined,
      country: undefined,
      source: undefined,
    })) as { indicators: unknown[]; message?: string };

    expect(result.indicators).toEqual([]);
    expect(result.message).toContain("No indicators");
  });

  it("declares the OpenAI tool with a snake_case name", () => {
    expect(indicatorSearchTool.name).toBe("search_indicators");
    expect(indicatorSearchTool.type).toBe("function");
  });
});
