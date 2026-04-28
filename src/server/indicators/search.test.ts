import { describe, expect, it } from "vitest";
import { IndicatorSummarySchema } from "@/domain/schemas";
import { MVP_INDICATOR_CATALOG } from "@/domain/seeds";
import { searchIndicators } from "./search";

describe("searchIndicators", () => {
  it("returns the full catalog when no filters are provided", () => {
    const results = searchIndicators();

    expect(results).toHaveLength(MVP_INDICATOR_CATALOG.length);
    for (const summary of results) {
      expect(IndicatorSummarySchema.safeParse(summary).success).toBe(true);
    }
  });

  it("filters by quadrant", () => {
    const results = searchIndicators({ quadrant: "policy" });

    expect(results.length).toBeGreaterThan(0);
    for (const summary of results) {
      expect(summary.metadata.quadrantId).toBe("policy");
    }
  });

  it("filters by category case-insensitively", () => {
    const lower = searchIndicators({ category: "consumer prices" });
    const upper = searchIndicators({ category: "Consumer Prices" });

    expect(lower.length).toBeGreaterThan(0);
    expect(lower).toEqual(upper);
  });

  it("filters by country ISO code", () => {
    const results = searchIndicators({ country: "us" });

    expect(results.length).toBe(MVP_INDICATOR_CATALOG.length);
    expect(searchIndicators({ country: "GB" })).toHaveLength(0);
  });

  it("filters by data source", () => {
    const fred = searchIndicators({ source: "fred" });
    const wb = searchIndicators({ source: "world_bank" });

    expect(fred.length).toBeGreaterThan(0);
    expect(wb.length).toBeGreaterThan(0);
    expect(fred.length + wb.length).toBe(MVP_INDICATOR_CATALOG.length);
  });

  it("does case-insensitive substring matching across name, description, and tags", () => {
    const byName = searchIndicators({ q: "VIX" });
    expect(byName).toHaveLength(1);
    expect(byName[0].metadata.id).toBe("us_vix");

    const byDescription = searchIndicators({ q: "money stock" });
    expect(byDescription.some((summary) => summary.metadata.id === "us_m2_money_supply")).toBe(
      true,
    );

    const byTag = searchIndicators({ q: "treasury" });
    expect(byTag.length).toBeGreaterThan(0);
  });

  it("returns an empty list (not an error) for unknown filter values", () => {
    expect(searchIndicators({ category: "unknown" })).toEqual([]);
    expect(searchIndicators({ quadrant: "growth", q: "no match here" })).toEqual([]);
  });

  it("sorts results by indicator name", () => {
    const results = searchIndicators({ quadrant: "market" });
    const names = results.map((summary) => summary.metadata.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));

    expect(names).toEqual(sorted);
  });
});
