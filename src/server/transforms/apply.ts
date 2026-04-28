import type { Frequency, TimeSeriesPoint, Transform } from "@/domain/schemas";

const YEAR_OVER_YEAR_LAGS: Record<Frequency, number> = {
  daily: 252,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  annual: 1,
};

const MOVING_AVERAGE_WINDOWS: Record<Frequency, number> = {
  daily: 3,
  weekly: 3,
  monthly: 3,
  quarterly: 4,
  annual: 3,
};

export interface ApplyTransformOptions {
  points: TimeSeriesPoint[];
  transform: Transform;
  frequency: Frequency;
}

export interface ApplyTransformResult {
  points: TimeSeriesPoint[];
  unitOverride?: string;
}

const passthrough = (points: TimeSeriesPoint[]): TimeSeriesPoint[] =>
  points.map((point) => ({ ...point }));

const change = (points: TimeSeriesPoint[]): TimeSeriesPoint[] =>
  points.map((point, index) => {
    if (index === 0) return { date: point.date, value: null };
    const prev = points[index - 1].value;
    if (prev === null || point.value === null) {
      return { date: point.date, value: null };
    }
    return { date: point.date, value: round(point.value - prev) };
  });

const percentChange = (points: TimeSeriesPoint[]): TimeSeriesPoint[] =>
  points.map((point, index) => {
    if (index === 0) return { date: point.date, value: null };
    const prev = points[index - 1].value;
    if (prev === null || prev === 0 || point.value === null) {
      return { date: point.date, value: null };
    }
    return { date: point.date, value: round(((point.value - prev) / prev) * 100) };
  });

const yearOverYear = (points: TimeSeriesPoint[], lag: number): TimeSeriesPoint[] =>
  points.map((point, index) => {
    if (index < lag) return { date: point.date, value: null };
    const prior = points[index - lag].value;
    if (prior === null || prior === 0 || point.value === null) {
      return { date: point.date, value: null };
    }
    return { date: point.date, value: round(((point.value - prior) / prior) * 100) };
  });

const movingAverage = (points: TimeSeriesPoint[], window: number): TimeSeriesPoint[] =>
  points.map((point, index) => {
    if (index + 1 < window) return { date: point.date, value: null };
    let sum = 0;
    let nullSeen = false;
    for (let offset = 0; offset < window; offset += 1) {
      const value = points[index - offset].value;
      if (value === null) {
        nullSeen = true;
        break;
      }
      sum += value;
    }
    if (nullSeen) return { date: point.date, value: null };
    return { date: point.date, value: round(sum / window) };
  });

const round = (value: number): number => Math.round(value * 10000) / 10000;

export const applyTransform = ({
  points,
  transform,
  frequency,
}: ApplyTransformOptions): ApplyTransformResult => {
  switch (transform) {
    case "level":
      return { points: passthrough(points) };
    case "change":
      return { points: change(points) };
    case "percent_change":
      return { points: percentChange(points), unitOverride: "percent" };
    case "year_over_year":
      return {
        points: yearOverYear(points, YEAR_OVER_YEAR_LAGS[frequency]),
        unitOverride: "percent",
      };
    case "moving_average":
      return { points: movingAverage(points, MOVING_AVERAGE_WINDOWS[frequency]) };
  }
};

export const yearOverYearLag = (frequency: Frequency): number => YEAR_OVER_YEAR_LAGS[frequency];
export const movingAverageWindow = (frequency: Frequency): number =>
  MOVING_AVERAGE_WINDOWS[frequency];
