import { describe, expect, it } from "vitest";
import type { TimeSeriesPoint } from "@/domain/schemas";
import { applyTransform, movingAverageWindow, yearOverYearLag } from "./apply";

const monthly = (values: (number | null)[]): TimeSeriesPoint[] =>
  values.map((value, index) => ({
    date: `2025-${String(index + 1).padStart(2, "0")}`,
    value,
  }));

describe("applyTransform", () => {
  it("returns a deep copy for level transform", () => {
    const points = monthly([1, 2, 3]);
    const result = applyTransform({ points, transform: "level", frequency: "monthly" });

    expect(result.points).toEqual(points);
    expect(result.points).not.toBe(points);
    expect(result.unitOverride).toBeUndefined();
  });

  it("computes change with the first point null", () => {
    const result = applyTransform({
      points: monthly([100, 102, 105]),
      transform: "change",
      frequency: "monthly",
    });

    expect(result.points.map((point) => point.value)).toEqual([null, 2, 3]);
  });

  it("computes percent change and overrides the unit", () => {
    const result = applyTransform({
      points: monthly([100, 110, 121]),
      transform: "percent_change",
      frequency: "monthly",
    });

    expect(result.points.map((point) => point.value)).toEqual([null, 10, 10]);
    expect(result.unitOverride).toBe("percent");
  });

  it("returns null for percent change when previous value is zero", () => {
    const result = applyTransform({
      points: monthly([0, 5]),
      transform: "percent_change",
      frequency: "monthly",
    });

    expect(result.points.map((point) => point.value)).toEqual([null, null]);
  });

  it("computes year-over-year with the correct lag for monthly", () => {
    const points: TimeSeriesPoint[] = Array.from({ length: 24 }, (_, i) => ({
      date: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
      value: 100 + i,
    }));
    const result = applyTransform({ points, transform: "year_over_year", frequency: "monthly" });

    expect(result.points.slice(0, 12).every((point) => point.value === null)).toBe(true);
    expect(result.points[12].value).toBe(round(((112 - 100) / 100) * 100));
    expect(result.unitOverride).toBe("percent");
  });

  it("uses lag 4 for quarterly year-over-year", () => {
    expect(yearOverYearLag("quarterly")).toBe(4);
    const points: TimeSeriesPoint[] = Array.from({ length: 8 }, (_, i) => ({
      date: `${2024 + Math.floor(i / 4)}-Q${(i % 4) + 1}`,
      value: 200 + i,
    }));
    const result = applyTransform({ points, transform: "year_over_year", frequency: "quarterly" });

    expect(result.points.slice(0, 4).every((point) => point.value === null)).toBe(true);
    expect(result.points[4].value).toBe(round(((204 - 200) / 200) * 100));
  });

  it("computes moving average with frequency-specific window", () => {
    expect(movingAverageWindow("monthly")).toBe(3);
    expect(movingAverageWindow("quarterly")).toBe(4);
    const result = applyTransform({
      points: monthly([10, 12, 14, 16]),
      transform: "moving_average",
      frequency: "monthly",
    });

    expect(result.points.map((point) => point.value)).toEqual([null, null, 12, 14]);
  });

  it("propagates nulls through transforms", () => {
    const result = applyTransform({
      points: monthly([100, null, 110]),
      transform: "change",
      frequency: "monthly",
    });

    expect(result.points.map((point) => point.value)).toEqual([null, null, null]);
  });
});

const round = (value: number): number => Math.round(value * 10000) / 10000;
