import { tool } from "@openai/agents";
import { z } from "zod";
import { DataProviderSchema, QuadrantIdSchema } from "@/domain/schemas";
import { searchIndicators } from "@/server/indicators/search";
import { toolErrorMessage } from "./errorMessage";

const ParamsSchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(1)
      .nullish()
      .describe("Free-text query against indicator name, description, and tags."),
    quadrant: QuadrantIdSchema.nullish().describe(
      "Restrict to one of: growth, inflation, policy, market.",
    ),
    category: z
      .string()
      .trim()
      .min(1)
      .nullish()
      .describe("Indicator category, case-insensitive (e.g. 'Consumer prices')."),
    country: z
      .string()
      .trim()
      .min(2)
      .nullish()
      .describe("ISO country code, e.g. 'US'. The MVP catalog only seeds US data."),
    source: DataProviderSchema.nullish().describe(
      "Data provider: fred, world_bank, or fixture.",
    ),
  })
  .strict();

export type IndicatorSearchInput = z.infer<typeof ParamsSchema>;

export const indicatorSearchHandler = async (input: IndicatorSearchInput) => {
  const filters = {
    q: input.q ?? undefined,
    quadrant: input.quadrant ?? undefined,
    category: input.category ?? undefined,
    country: input.country ?? undefined,
    source: input.source ?? undefined,
  };
  const results = searchIndicators(filters);

  if (results.length === 0) {
    return {
      indicators: [],
      message: "No indicators in the MVP catalog match those filters.",
    };
  }

  return {
    indicators: results.map((summary) => ({
      id: summary.metadata.id,
      name: summary.metadata.name,
      description: summary.metadata.description,
      quadrant: summary.metadata.quadrantId,
      unit: summary.metadata.unit,
      frequency: summary.metadata.frequency,
      country: { code: summary.country.code, name: summary.country.name },
      category: summary.category,
      source: {
        provider: summary.metadata.source.provider,
        name: summary.metadata.source.name,
        seriesId: summary.metadata.source.seriesId,
      },
      definition: summary.definition,
      tags: summary.metadata.tags,
    })),
  };
};

export const indicatorSearchTool = tool({
  name: "search_indicators",
  description:
    "Search the catalog of macro indicators. Returns matching indicators with their id, name, unit, frequency, source, country, category, and definition. Use this when the user asks what indicators exist, or when you need an indicator id before fetching data.",
  parameters: ParamsSchema,
  errorFunction: (_ctx, error) => toolErrorMessage(error),
  execute: indicatorSearchHandler,
});
