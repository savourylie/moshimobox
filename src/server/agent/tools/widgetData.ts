import { tool } from "@openai/agents";
import { z } from "zod";
import { getWidgetData } from "@/server/indicators/widgetData";
import { toolErrorMessage } from "./errorMessage";

const ParamsSchema = z
  .object({
    widgetId: z
      .string()
      .trim()
      .min(1)
      .describe(
        "The widget id from the dashboard layout (e.g. 'widget.metric.us_headline_cpi'). Use search_indicators or get_indicator_series when no widget id is known.",
      ),
  })
  .strict();

export type WidgetDataInput = z.infer<typeof ParamsSchema>;

export const widgetDataHandler = async (input: WidgetDataInput) => {
  const data = await getWidgetData(input.widgetId);
  return {
    widgetId: data.widgetId,
    indicator: {
      id: data.indicator.id,
      name: data.indicator.name,
      unit: data.unit,
      frequency: data.indicator.frequency,
    },
    currentValue: data.currentValue,
    previousValue: data.previousValue,
    change: data.change,
    observationDate: data.observationDate,
    releaseDate: data.releaseDate,
    cacheStatus: data.cacheStatus,
    source: {
      provider: data.source.provider,
      name: data.source.name,
      seriesId: data.source.seriesId,
    },
    trend: data.trend,
  };
};

export const widgetDataTool = tool({
  name: "get_widget_data",
  description:
    "Fetch the latest computed value for a metric widget on the dashboard, including current value, previous value, change, observation date, release date, source, and trend direction. Returns provider_error if upstream data is unavailable; cite source, unit, and observation date when reporting.",
  parameters: ParamsSchema,
  errorFunction: (_ctx, error) => toolErrorMessage(error),
  execute: widgetDataHandler,
});
