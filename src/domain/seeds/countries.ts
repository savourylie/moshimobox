import type { Country } from "@/domain/schemas";

export interface CountryMetadata {
  code: string;
  iso3: string;
  name: string;
  nameZh?: string;
}

export const MVP_COUNTRY_REGISTRY: readonly CountryMetadata[] = [
  { code: "US", iso3: "USA", name: "United States", nameZh: "美國" },
] as const;

const COUNTRIES_BY_CODE = new Map<string, CountryMetadata>();
for (const country of MVP_COUNTRY_REGISTRY) {
  COUNTRIES_BY_CODE.set(country.code.toUpperCase(), country);
  COUNTRIES_BY_CODE.set(country.iso3.toUpperCase(), country);
}

const COUNTRIES_BY_NAME = new Map<string, CountryMetadata>();
for (const country of MVP_COUNTRY_REGISTRY) {
  COUNTRIES_BY_NAME.set(country.name.trim().toLowerCase(), country);
  if (country.nameZh) {
    COUNTRIES_BY_NAME.set(country.nameZh.trim().toLowerCase(), country);
  }
}

export const getCountryMetadata = (codeOrIso3: string): CountryMetadata | undefined => {
  if (typeof codeOrIso3 !== "string") return undefined;
  return COUNTRIES_BY_CODE.get(codeOrIso3.trim().toUpperCase());
};

export const findCountryByName = (name: string): CountryMetadata | undefined => {
  if (typeof name !== "string") return undefined;
  return COUNTRIES_BY_NAME.get(name.trim().toLowerCase());
};

export const getCountrySummary = (code: string): Country | undefined => {
  const meta = getCountryMetadata(code);
  if (!meta) return undefined;
  return { code: meta.code, name: meta.name };
};
