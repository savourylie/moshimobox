import { describe, expect, it } from "vitest";
import { CalendarDateSchema, ReleaseDateSchema } from "@/domain/schemas";
import { computeReleaseDate, generateDateAxis, periodLabel } from "./dateAxis";

describe("generateDateAxis", () => {
  it("emits daily business days ending at the placeholder", () => {
    const axis = generateDateAxis({
      endObservation: "2026-04-24",
      frequency: "daily",
      length: 5,
    });

    expect(axis).toEqual(["2026-04-20", "2026-04-21", "2026-04-22", "2026-04-23", "2026-04-24"]);
  });

  it("never emits weekends in the daily axis", () => {
    const axis = generateDateAxis({
      endObservation: "2026-04-24",
      frequency: "daily",
      length: 60,
    });

    for (const value of axis) {
      const dow = new Date(`${value}T00:00:00Z`).getUTCDay();
      expect(dow).not.toBe(0);
      expect(dow).not.toBe(6);
    }
  });

  it("emits weekly cadence at exactly seven-day spacing", () => {
    const axis = generateDateAxis({
      endObservation: "2026-04-22",
      frequency: "weekly",
      length: 4,
    });

    expect(axis).toEqual(["2026-04-01", "2026-04-08", "2026-04-15", "2026-04-22"]);
  });

  it("emits ascending monthly periods ending at the placeholder", () => {
    const axis = generateDateAxis({
      endObservation: "2026-03",
      frequency: "monthly",
      length: 5,
    });

    expect(axis).toEqual(["2025-11", "2025-12", "2026-01", "2026-02", "2026-03"]);
  });

  it("emits ascending quarters ending at the placeholder", () => {
    const axis = generateDateAxis({
      endObservation: "2025-Q4",
      frequency: "quarterly",
      length: 5,
    });

    expect(axis).toEqual(["2024-Q4", "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"]);
  });

  it("emits annual axis using the placeholder month", () => {
    const axis = generateDateAxis({
      endObservation: "2024-12",
      frequency: "annual",
      length: 4,
    });

    expect(axis).toEqual(["2021-12", "2022-12", "2023-12", "2024-12"]);
  });

  it("returns ascending, unique calendar dates conforming to the schema", () => {
    const cases = [
      { endObservation: "2026-04-24", frequency: "daily" as const, length: 30 },
      { endObservation: "2026-04-22", frequency: "weekly" as const, length: 30 },
      { endObservation: "2026-03", frequency: "monthly" as const, length: 30 },
      { endObservation: "2025-Q4", frequency: "quarterly" as const, length: 12 },
      { endObservation: "2024-12", frequency: "annual" as const, length: 5 },
    ];

    for (const opts of cases) {
      const axis = generateDateAxis(opts);
      const set = new Set(axis);
      expect(set.size).toBe(axis.length);
      const sorted = [...axis].sort();
      expect(axis).toEqual(sorted);
      for (const value of axis) {
        expect(CalendarDateSchema.safeParse(value).success).toBe(true);
      }
    }
  });

  it("rejects invalid placeholders", () => {
    expect(() =>
      generateDateAxis({ endObservation: "not-a-date", frequency: "monthly", length: 1 }),
    ).toThrow();
  });
});

describe("computeReleaseDate", () => {
  it("returns the same date for daily observations", () => {
    expect(computeReleaseDate("2026-04-24", "daily")).toBe("2026-04-24");
  });

  it("adds one day for weekly observations", () => {
    expect(computeReleaseDate("2026-04-22", "weekly")).toBe("2026-04-23");
  });

  it("uses the 15th of the following month for monthly observations", () => {
    expect(computeReleaseDate("2026-03", "monthly")).toBe("2026-04-15");
  });

  it("rolls year over for December monthly observations", () => {
    expect(computeReleaseDate("2025-12", "monthly")).toBe("2026-01-15");
  });

  it("uses the 30th of the month after quarter end for quarterly observations", () => {
    expect(computeReleaseDate("2025-Q4", "quarterly")).toBe("2026-01-30");
    expect(computeReleaseDate("2025-Q2", "quarterly")).toBe("2025-07-30");
  });

  it("uses April 15 of the following year for annual observations", () => {
    expect(computeReleaseDate("2024-12", "annual")).toBe("2025-04-15");
  });

  it("returns release dates that conform to the YYYY-MM-DD release schema", () => {
    const cases = [
      ["2026-04-24", "daily"],
      ["2026-04-22", "weekly"],
      ["2026-03", "monthly"],
      ["2025-Q4", "quarterly"],
      ["2024-12", "annual"],
    ] as const;

    for (const [obs, freq] of cases) {
      const release = computeReleaseDate(obs, freq);
      expect(ReleaseDateSchema.safeParse(release).success).toBe(true);
    }
  });
});

describe("periodLabel", () => {
  it("returns a calm prior-period label per frequency", () => {
    expect(periodLabel("daily")).toBe("vs prior business day");
    expect(periodLabel("weekly")).toBe("vs prior week");
    expect(periodLabel("monthly")).toBe("vs prior month");
    expect(periodLabel("quarterly")).toBe("vs prior quarter");
    expect(periodLabel("annual")).toBe("vs prior year");
  });
});
