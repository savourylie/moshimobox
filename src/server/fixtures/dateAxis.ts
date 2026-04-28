import type { Frequency } from "@/domain/schemas";

export const DEFAULT_FIXTURE_LENGTHS: Record<Frequency, number> = {
  daily: 252 * 5,
  weekly: 52 * 5,
  monthly: 60,
  quarterly: 20,
  annual: 5,
};

const MS_PER_DAY = 86_400_000;

const parseISO = (value: string): { y: number; m: number; d: number } => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Expected YYYY-MM-DD, received "${value}".`);
  }
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
};

const parseYM = (value: string): { y: number; m: number } => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Expected YYYY-MM, received "${value}".`);
  }
  return { y: Number(match[1]), m: Number(match[2]) };
};

const parseQuarter = (value: string): { y: number; q: number } => {
  const match = /^(\d{4})-Q([1-4])$/.exec(value);
  if (!match) {
    throw new Error(`Expected YYYY-Qn, received "${value}".`);
  }
  return { y: Number(match[1]), q: Number(match[2]) };
};

const toDateUTC = (parts: { y: number; m: number; d: number }): Date =>
  new Date(Date.UTC(parts.y, parts.m - 1, parts.d));

const formatYMD = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatYM = (y: number, m: number): string => `${y}-${String(m).padStart(2, "0")}`;

const generateDailyAxis = (end: string, count: number): string[] => {
  const dates: string[] = [];
  let cursor = toDateUTC(parseISO(end));
  while (dates.length < count) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(formatYMD(cursor));
    }
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  return dates.reverse();
};

const generateWeeklyAxis = (end: string, count: number): string[] => {
  const dates: string[] = [];
  let cursor = toDateUTC(parseISO(end));
  for (let i = 0; i < count; i += 1) {
    dates.push(formatYMD(cursor));
    cursor = new Date(cursor.getTime() - 7 * MS_PER_DAY);
  }
  return dates.reverse();
};

const generateMonthlyAxis = (end: string, count: number): string[] => {
  const dates: string[] = [];
  let { y, m } = parseYM(end);
  for (let i = 0; i < count; i += 1) {
    dates.push(formatYM(y, m));
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return dates.reverse();
};

const generateQuarterlyAxis = (end: string, count: number): string[] => {
  const dates: string[] = [];
  let { y, q } = parseQuarter(end);
  for (let i = 0; i < count; i += 1) {
    dates.push(`${y}-Q${q}`);
    q -= 1;
    if (q === 0) {
      q = 4;
      y -= 1;
    }
  }
  return dates.reverse();
};

const generateAnnualAxis = (end: string, count: number): string[] => {
  const { y, m } = parseYM(end);
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) {
    dates.push(formatYM(y - i, m));
  }
  return dates.reverse();
};

export interface DateAxisOptions {
  endObservation: string;
  frequency: Frequency;
  length: number;
}

export const generateDateAxis = ({
  endObservation,
  frequency,
  length,
}: DateAxisOptions): string[] => {
  if (length < 1) {
    throw new Error("length must be at least 1.");
  }

  switch (frequency) {
    case "daily":
      return generateDailyAxis(endObservation, length);
    case "weekly":
      return generateWeeklyAxis(endObservation, length);
    case "monthly":
      return generateMonthlyAxis(endObservation, length);
    case "quarterly":
      return generateQuarterlyAxis(endObservation, length);
    case "annual":
      return generateAnnualAxis(endObservation, length);
  }
};

export const computeReleaseDate = (observationDate: string, frequency: Frequency): string => {
  switch (frequency) {
    case "daily":
      return observationDate;
    case "weekly": {
      const next = new Date(toDateUTC(parseISO(observationDate)).getTime() + MS_PER_DAY);
      return formatYMD(next);
    }
    case "monthly": {
      const { y, m } = parseYM(observationDate);
      const nextY = m === 12 ? y + 1 : y;
      const nextM = m === 12 ? 1 : m + 1;
      return `${nextY}-${String(nextM).padStart(2, "0")}-15`;
    }
    case "quarterly": {
      const { y, q } = parseQuarter(observationDate);
      const endMonth = q * 3;
      const releaseY = endMonth === 12 ? y + 1 : y;
      const releaseM = endMonth === 12 ? 1 : endMonth + 1;
      return `${releaseY}-${String(releaseM).padStart(2, "0")}-30`;
    }
    case "annual": {
      const { y } = parseYM(observationDate);
      return `${y + 1}-04-15`;
    }
  }
};

export const periodLabel = (frequency: Frequency): string => {
  switch (frequency) {
    case "daily":
      return "vs prior business day";
    case "weekly":
      return "vs prior week";
    case "monthly":
      return "vs prior month";
    case "quarterly":
      return "vs prior quarter";
    case "annual":
      return "vs prior year";
  }
};
