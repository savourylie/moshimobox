import type { Frequency } from "@/domain/schemas";
import { getCacheTtlOverrideMs } from "@/server/config/env";

const HOUR_MS = 60 * 60 * 1000;

export const DEFAULT_TTL_BY_FREQUENCY: Record<Frequency, number> = {
  daily: 1 * HOUR_MS,
  weekly: 6 * HOUR_MS,
  monthly: 24 * HOUR_MS,
  quarterly: 24 * HOUR_MS,
  annual: 24 * HOUR_MS,
};

export const ttlForFrequency = (frequency: Frequency): number => {
  const override = getCacheTtlOverrideMs();
  if (override !== undefined) return override;
  return DEFAULT_TTL_BY_FREQUENCY[frequency];
};
