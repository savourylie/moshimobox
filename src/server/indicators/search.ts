import type { DataProvider, IndicatorSummary, QuadrantId } from "@/domain/schemas";
import { MVP_INDICATOR_CATALOG } from "@/domain/seeds";

export interface IndicatorSearchFilters {
  q?: string;
  quadrant?: QuadrantId;
  category?: string;
  country?: string;
  source?: DataProvider;
}

const matchesQuery = (haystack: string[], needle: string): boolean => {
  const lowered = needle.toLowerCase();
  return haystack.some((value) => value.toLowerCase().includes(lowered));
};

export const searchIndicators = (filters: IndicatorSearchFilters = {}): IndicatorSummary[] => {
  const filtered = MVP_INDICATOR_CATALOG.filter((seed) => {
    if (filters.quadrant && seed.metadata.quadrantId !== filters.quadrant) {
      return false;
    }
    if (filters.category && seed.category.toLowerCase() !== filters.category.toLowerCase()) {
      return false;
    }
    if (filters.country && seed.country.code.toUpperCase() !== filters.country.toUpperCase()) {
      return false;
    }
    if (filters.source && seed.metadata.source.provider !== filters.source) {
      return false;
    }
    if (filters.q && filters.q.trim().length > 0) {
      const haystack = [seed.metadata.name, seed.metadata.description, ...seed.metadata.tags];
      if (!matchesQuery(haystack, filters.q.trim())) {
        return false;
      }
    }
    return true;
  });

  return filtered
    .map<IndicatorSummary>((seed) => ({
      metadata: seed.metadata,
      category: seed.category,
      country: seed.country,
      definition: seed.definition,
    }))
    .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
};
