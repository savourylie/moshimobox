import { describe, expect, it } from "vitest";
import { TimeSeriesPointSchema } from "@/domain/schemas";
import {
  FIXTURE_GENERATOR_VERSION,
  generateFixtureSeries,
  hasFixtureProfile,
} from "./seriesGenerator";

describe("generateFixtureSeries", () => {
  it("exposes a stable generator version constant", () => {
    expect(FIXTURE_GENERATOR_VERSION).toBe(1);
  });

  it("produces a deterministic monthly series with the expected anchor", () => {
    const first = generateFixtureSeries({
      indicatorId: "us_headline_cpi",
      frequency: "monthly",
      endObservation: "2026-03",
      length: 6,
    });
    const second = generateFixtureSeries({
      indicatorId: "us_headline_cpi",
      frequency: "monthly",
      endObservation: "2026-03",
      length: 6,
    });

    expect(first.points).toEqual(second.points);
    expect(first.points.at(-1)?.date).toBe("2026-03");
    expect(first.points.length).toBe(6);
  });

  it("produces a deterministic quarterly series", () => {
    const series = generateFixtureSeries({
      indicatorId: "us_real_gdp",
      frequency: "quarterly",
      endObservation: "2025-Q4",
      length: 5,
    });

    expect(series.points.map((point) => point.date)).toEqual([
      "2024-Q4",
      "2025-Q1",
      "2025-Q2",
      "2025-Q3",
      "2025-Q4",
    ]);
  });

  it("returns different streams for different indicator ids", () => {
    const cpi = generateFixtureSeries({
      indicatorId: "us_headline_cpi",
      frequency: "monthly",
      endObservation: "2026-03",
      length: 12,
    });
    const core = generateFixtureSeries({
      indicatorId: "us_core_cpi",
      frequency: "monthly",
      endObservation: "2026-03",
      length: 12,
    });

    expect(cpi.points).not.toEqual(core.points);
  });

  it("emits points that pass the time series schema and are ascending and unique", () => {
    const series = generateFixtureSeries({
      indicatorId: "us_5y_breakeven_inflation",
      frequency: "daily",
      endObservation: "2026-04-24",
      length: 20,
    });

    const dates = series.points.map((point) => point.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates].sort()).toEqual(dates);

    for (const point of series.points) {
      expect(TimeSeriesPointSchema.safeParse(point).success).toBe(true);
      expect(point.value).not.toBeNull();
      expect(Number.isFinite(point.value)).toBe(true);
    }
  });

  it("throws when the indicator has no fixture profile", () => {
    expect(() =>
      generateFixtureSeries({
        indicatorId: "us_unknown",
        frequency: "monthly",
        endObservation: "2026-03",
        length: 3,
      }),
    ).toThrow();
    expect(hasFixtureProfile("us_unknown")).toBe(false);
    expect(hasFixtureProfile("us_headline_cpi")).toBe(true);
  });

  it("snapshots concrete values for us_headline_cpi (first 3 + last 3)", () => {
    const series = generateFixtureSeries({
      indicatorId: "us_headline_cpi",
      frequency: "monthly",
      endObservation: "2026-03",
      length: 12,
    });

    const first3 = series.points.slice(0, 3);
    const last3 = series.points.slice(-3);

    expect(first3).toMatchInlineSnapshot(`
      [
        {
          "date": "2025-04",
          "value": 313.3,
        },
        {
          "date": "2025-05",
          "value": 313.99,
        },
        {
          "date": "2025-06",
          "value": 314.86,
        },
      ]
    `);
    expect(last3).toMatchInlineSnapshot(`
      [
        {
          "date": "2026-01",
          "value": 319.04,
        },
        {
          "date": "2026-02",
          "value": 319.67,
        },
        {
          "date": "2026-03",
          "value": 319.7,
        },
      ]
    `);
  });

  it("snapshots concrete values for us_real_gdp (first 3 + last 3)", () => {
    const series = generateFixtureSeries({
      indicatorId: "us_real_gdp",
      frequency: "quarterly",
      endObservation: "2025-Q4",
      length: 12,
    });

    const first3 = series.points.slice(0, 3);
    const last3 = series.points.slice(-3);

    expect(first3).toMatchInlineSnapshot(`
      [
        {
          "date": "2023-Q1",
          "value": 21859.7,
        },
        {
          "date": "2023-Q2",
          "value": 21883.2,
        },
        {
          "date": "2023-Q3",
          "value": 21975.4,
        },
      ]
    `);
    expect(last3).toMatchInlineSnapshot(`
      [
        {
          "date": "2025-Q2",
          "value": 22364.3,
        },
        {
          "date": "2025-Q3",
          "value": 22427.4,
        },
        {
          "date": "2025-Q4",
          "value": 22508.2,
        },
      ]
    `);
  });
});
