import type { Frequency, TimeSeriesPoint } from "@/domain/schemas";
import { DEFAULT_FIXTURE_LENGTHS, generateDateAxis } from "./dateAxis";

export const FIXTURE_GENERATOR_VERSION = 1;

interface SeriesProfile {
  base: number;
  drift: number;
  noise: number;
  decimals: number;
}

const PROFILES: Record<string, SeriesProfile> = {
  us_real_gdp: { base: 22500, drift: 60, noise: 25, decimals: 1 },
  us_unemployment_rate: { base: 4.0, drift: -0.01, noise: 0.05, decimals: 2 },
  us_gdp_growth_annual: { base: 2.4, drift: 0, noise: 0.4, decimals: 2 },
  us_headline_cpi: { base: 320, drift: 0.6, noise: 0.3, decimals: 2 },
  us_core_cpi: { base: 325, drift: 0.5, noise: 0.25, decimals: 2 },
  us_5y_breakeven_inflation: { base: 2.3, drift: 0, noise: 0.04, decimals: 3 },
  us_effective_fed_funds_rate: { base: 4.25, drift: -0.01, noise: 0.03, decimals: 2 },
  us_m2_money_supply: { base: 21000, drift: 30, noise: 20, decimals: 1 },
  us_fed_total_assets: { base: 7_500_000, drift: -2000, noise: 1500, decimals: 0 },
  us_10y_treasury_yield: { base: 4.3, drift: 0, noise: 0.05, decimals: 3 },
  us_2y_treasury_yield: { base: 4.5, drift: 0, noise: 0.06, decimals: 3 },
  us_sp500: { base: 5400, drift: 0.8, noise: 25, decimals: 2 },
  us_vix: { base: 16, drift: 0, noise: 1.5, decimals: 2 },
};

export const hasFixtureProfile = (indicatorId: string): boolean => indicatorId in PROFILES;

const FNV_OFFSET = 2166136261 >>> 0;
const FNV_PRIME = 16777619;

const fnv1a = (text: string): number => {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash ^ text.charCodeAt(i)) >>> 0;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
};

const LCG_MOD = 2 ** 32;
const LCG_A = 1664525;
const LCG_C = 1013904223;

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export interface SeriesGeneratorOptions {
  indicatorId: string;
  frequency: Frequency;
  endObservation: string;
  length?: number;
}

export interface GeneratedSeries {
  points: TimeSeriesPoint[];
  generatorVersion: number;
}

export const generateFixtureSeries = ({
  indicatorId,
  frequency,
  endObservation,
  length,
}: SeriesGeneratorOptions): GeneratedSeries => {
  const profile = PROFILES[indicatorId];
  if (!profile) {
    throw new Error(`No fixture profile for indicator "${indicatorId}".`);
  }

  const axisLength = length ?? DEFAULT_FIXTURE_LENGTHS[frequency];
  const axis = generateDateAxis({
    endObservation,
    frequency,
    length: axisLength,
  });

  const seed = (fnv1a(`${indicatorId}::v${FIXTURE_GENERATOR_VERSION}`) + 1) >>> 0;
  let state = seed;

  const points: TimeSeriesPoint[] = axis.map((date, index) => {
    state = (Math.imul(state, LCG_A) + LCG_C) >>> 0;
    const unit = state / LCG_MOD;
    const noise = (unit * 2 - 1) * profile.noise;
    const offsetFromEnd = index - (axis.length - 1);
    const raw = profile.base + profile.drift * offsetFromEnd + noise;
    return { date, value: round(raw, profile.decimals) };
  });

  return { points, generatorVersion: FIXTURE_GENERATOR_VERSION };
};
