import type { Frequency, TimeSeriesPoint } from "@/domain/schemas";
import { formatNumber, formatObservationDate } from "./dashboardFormat";

export interface ChartSeriesInput {
  id: string;
  label: string;
  points: readonly TimeSeriesPoint[];
}

export interface ObservedChartPoint {
  date: string;
  index: number;
  time: number;
  value: number;
}

export interface ChartSeriesAnalysis {
  id: string;
  label: string;
  missingCount: number;
  observedPoints: ObservedChartPoint[];
  totalCount: number;
}

export interface ChartCoordinate {
  date: string;
  value: number;
  x: number;
  y: number;
}

export interface ChartSeriesLayout {
  id: string;
  label: string;
  latestPoint?: ChartCoordinate;
  pathSegments: string[];
}

export interface ChartTick {
  label: string;
  value: number;
  y: number;
}

export interface ChartDateTick {
  date: string;
  label: string;
  x: number;
}

export interface ChartLayout {
  height: number;
  plot: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  series: ChartSeriesLayout[];
  width: number;
  xTicks: ChartDateTick[];
  yTicks: ChartTick[];
}

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 220;
const PADDING = {
  top: 18,
  right: 20,
  bottom: 34,
  left: 54,
} as const;

export const parseCalendarDateToTime = (value: string): number => {
  const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (daily) {
    return Date.UTC(Number(daily[1]), Number(daily[2]) - 1, Number(daily[3]));
  }

  const monthly = /^(\d{4})-(\d{2})$/.exec(value);
  if (monthly) {
    return Date.UTC(Number(monthly[1]), Number(monthly[2]) - 1, 1);
  }

  const quarterly = /^(\d{4})-Q([1-4])$/.exec(value);
  if (quarterly) {
    return Date.UTC(Number(quarterly[1]), (Number(quarterly[2]) - 1) * 3, 1);
  }

  return Number.NaN;
};

export const analyzeChartSeries = (series: ChartSeriesInput): ChartSeriesAnalysis => {
  const observedPoints: ObservedChartPoint[] = [];

  series.points.forEach((point, index) => {
    const time = parseCalendarDateToTime(point.date);
    if (point.value !== null && Number.isFinite(time)) {
      observedPoints.push({
        date: point.date,
        index,
        time,
        value: point.value,
      });
    }
  });

  return {
    id: series.id,
    label: series.label,
    missingCount: series.points.length - observedPoints.length,
    observedPoints,
    totalCount: series.points.length,
  };
};

export const hasMixedFrequencies = (frequencies: readonly Frequency[]): boolean =>
  new Set(frequencies).size > 1;

export const buildChartLayout = (
  series: readonly ChartSeriesInput[],
  options: { height?: number; width?: number } = {},
): ChartLayout | null => {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const analyses = series.map(analyzeChartSeries);
  const observed = analyses.flatMap((item) => item.observedPoints);
  if (observed.length < 2) return null;

  const [xMin, xMax] = paddedDomain(
    Math.min(...observed.map((point) => point.time)),
    Math.max(...observed.map((point) => point.time)),
  );
  const [yMin, yMax] = paddedDomain(
    Math.min(...observed.map((point) => point.value)),
    Math.max(...observed.map((point) => point.value)),
  );

  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const xFor = (time: number): number => PADDING.left + ((time - xMin) / (xMax - xMin)) * plotWidth;
  const yFor = (value: number): number =>
    PADDING.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;

  return {
    width,
    height,
    plot: {
      x: PADDING.left,
      y: PADDING.top,
      width: plotWidth,
      height: plotHeight,
    },
    xTicks: buildDateTicks(observed, xFor),
    yTicks: buildValueTicks(yMin, yMax, yFor),
    series: series.map((item) => buildSeriesLayout(item, xFor, yFor)),
  };
};

const buildSeriesLayout = (
  series: ChartSeriesInput,
  xFor: (time: number) => number,
  yFor: (value: number) => number,
): ChartSeriesLayout => {
  const pathSegments: string[] = [];
  const observedCoordinates: ChartCoordinate[] = [];
  let segment: ChartCoordinate[] = [];

  const flushSegment = () => {
    if (segment.length >= 2) {
      pathSegments.push(pathFromCoordinates(segment));
    }
    segment = [];
  };

  series.points.forEach((point) => {
    const time = parseCalendarDateToTime(point.date);
    if (point.value === null || !Number.isFinite(time)) {
      flushSegment();
      return;
    }

    const coordinate = {
      date: point.date,
      value: point.value,
      x: xFor(time),
      y: yFor(point.value),
    };
    observedCoordinates.push(coordinate);
    segment.push(coordinate);
  });
  flushSegment();

  return {
    id: series.id,
    label: series.label,
    latestPoint: observedCoordinates.at(-1),
    pathSegments,
  };
};

const pathFromCoordinates = (coordinates: readonly ChartCoordinate[]): string =>
  coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`)
    .join(" ");

const paddedDomain = (min: number, max: number): [number, number] => {
  if (min === max) {
    const fallbackPadding = Math.max(Math.abs(min) * 0.05, 1);
    return [min - fallbackPadding, max + fallbackPadding];
  }

  const padding = (max - min) * 0.08;
  return [min - padding, max + padding];
};

const buildValueTicks = (
  min: number,
  max: number,
  yFor: (value: number) => number,
): ChartTick[] => {
  const mid = min + (max - min) / 2;
  return [max, mid, min].map((value) => ({
    value,
    label: formatNumber(value),
    y: yFor(value),
  }));
};

const buildDateTicks = (
  observed: readonly ObservedChartPoint[],
  xFor: (time: number) => number,
): ChartDateTick[] => {
  const sorted = [...observed].sort((a, b) => a.time - b.time);
  const candidates = [sorted[0], sorted[Math.floor((sorted.length - 1) / 2)], sorted.at(-1)];
  const seen = new Set<string>();

  return candidates.flatMap((point) => {
    if (!point || seen.has(point.date)) return [];
    seen.add(point.date);
    return [
      {
        date: point.date,
        label: formatObservationDate(point.date),
        x: xFor(point.time),
      },
    ];
  });
};

const round = (value: number): number => Math.round(value * 10) / 10;
