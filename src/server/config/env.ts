export const FRED_API_KEY_ENV = "FRED_API_KEY";

export const getFredApiKey = (): string | undefined => {
  const raw = process.env[FRED_API_KEY_ENV];
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const WORLD_BANK_BASE_URL_ENV = "WORLD_BANK_BASE_URL";

export const DEFAULT_WORLD_BANK_BASE_URL = "https://api.worldbank.org/v2";

export const getWorldBankBaseUrl = (): string | undefined => {
  const raw = process.env[WORLD_BANK_BASE_URL_ENV];
  if (raw === undefined) return DEFAULT_WORLD_BANK_BASE_URL;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const CACHE_TTL_OVERRIDE_MS_ENV = "CACHE_TTL_OVERRIDE_MS";

export const getCacheTtlOverrideMs = (): number | undefined => {
  const raw = process.env[CACHE_TTL_OVERRIDE_MS_ENV];
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
};
