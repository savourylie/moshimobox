export const FRED_API_KEY_ENV = "FRED_API_KEY";

export const getFredApiKey = (): string | undefined => {
  const raw = process.env[FRED_API_KEY_ENV];
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
