import { z } from "zod";

export const QUADRANT_IDS = ["growth", "inflation", "policy", "market"] as const;

export const WIDGET_TYPES = ["metric_card", "line_chart", "comparison_chart"] as const;

export const ACTION_TYPES = [
  "add_widget",
  "move_widget",
  "configure_widget",
  "remove_widget",
] as const;

const IdSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, {
    message: "Use a stable lowercase API id.",
  });

const NonEmptyStringSchema = z.string().trim().min(1);

export const CalendarDateSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])|\d{4}-(?:0[1-9]|1[0-2])|\d{4}-Q[1-4])$/,
    {
      message: "Use YYYY-MM-DD, YYYY-MM, or YYYY-Qn.",
    },
  );

export const ReleaseDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/, {
    message: "Use YYYY-MM-DD for release dates.",
  });

export const DateTimeSchema = z.iso.datetime({ offset: true });

export const QuadrantIdSchema = z.enum(QUADRANT_IDS);

export const WidgetTypeSchema = z.enum(WIDGET_TYPES);

export const DataProviderSchema = z.enum(["fred", "world_bank", "fixture"]);

export const FrequencySchema = z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]);

export const TransformSchema = z.enum([
  "level",
  "change",
  "percent_change",
  "year_over_year",
  "moving_average",
]);

export const TrendDirectionSchema = z.enum(["up", "down", "flat", "mixed", "unknown"]);

export const StatusToneSchema = z.enum(["positive", "negative", "warning", "neutral", "unknown"]);

export const ActionResultSchema = z.enum([
  "proposed",
  "validated",
  "applied",
  "rejected",
  "dismissed",
]);

export const IndicatorIdSchema = IdSchema;

export const WidgetIdSchema = IdSchema;

export const DashboardIdSchema = z.literal("main");

export const SourceSchema = z
  .object({
    provider: DataProviderSchema,
    name: NonEmptyStringSchema,
    seriesId: NonEmptyStringSchema.optional(),
    url: z.url().optional(),
  })
  .strict();

export const IndicatorMetadataSchema = z
  .object({
    id: IndicatorIdSchema,
    name: NonEmptyStringSchema,
    description: NonEmptyStringSchema,
    quadrantId: QuadrantIdSchema,
    countryCode: z
      .string()
      .trim()
      .regex(/^[A-Z]{2,3}$/)
      .optional(),
    frequency: FrequencySchema,
    unit: NonEmptyStringSchema,
    source: SourceSchema,
    tags: z.array(NonEmptyStringSchema).default([]),
  })
  .strict();

export const TimeSeriesPointSchema = z
  .object({
    date: CalendarDateSchema,
    value: z.number().finite().nullable(),
  })
  .strict();

export const DateRangeSchema = z
  .object({
    start: CalendarDateSchema,
    end: CalendarDateSchema.optional(),
  })
  .strict();

export const TrendMetadataSchema = z
  .object({
    direction: TrendDirectionSchema,
    label: NonEmptyStringSchema,
    period: NonEmptyStringSchema,
  })
  .strict();

export const StatusMetadataSchema = z
  .object({
    tone: StatusToneSchema,
    label: NonEmptyStringSchema,
    rationale: NonEmptyStringSchema.optional(),
  })
  .strict();

export const ChangeSchema = z
  .object({
    value: z.number().finite(),
    unit: NonEmptyStringSchema,
    percent: z.number().finite().optional(),
    period: NonEmptyStringSchema,
  })
  .strict();

export const WidgetDataResponseSchema = z
  .object({
    widgetId: WidgetIdSchema,
    indicator: IndicatorMetadataSchema,
    unit: NonEmptyStringSchema,
    currentValue: z.number().finite(),
    previousValue: z.number().finite(),
    change: ChangeSchema,
    observationDate: CalendarDateSchema,
    releaseDate: ReleaseDateSchema,
    source: SourceSchema,
    trend: TrendMetadataSchema,
    status: StatusMetadataSchema,
  })
  .strict();

const WidgetConfigBaseSchema = z
  .object({
    id: WidgetIdSchema,
    title: NonEmptyStringSchema,
    description: NonEmptyStringSchema,
  })
  .strict();

export const MetricWidgetConfigSchema = WidgetConfigBaseSchema.extend({
  type: z.literal("metric_card"),
  indicatorId: IndicatorIdSchema,
});

export const LineChartWidgetConfigSchema = WidgetConfigBaseSchema.extend({
  type: z.literal("line_chart"),
  indicatorId: IndicatorIdSchema,
  range: DateRangeSchema.optional(),
  transform: TransformSchema.default("level"),
});

export const ComparisonChartWidgetConfigSchema = WidgetConfigBaseSchema.extend({
  type: z.literal("comparison_chart"),
  indicatorIds: z.array(IndicatorIdSchema).min(2).max(4),
  range: DateRangeSchema.optional(),
  transform: TransformSchema.default("level"),
});

export const WidgetConfigSchema = z.discriminatedUnion("type", [
  MetricWidgetConfigSchema,
  LineChartWidgetConfigSchema,
  ComparisonChartWidgetConfigSchema,
]);

const QuadrantLayoutBaseSchema = z
  .object({
    widgets: z.array(WidgetConfigSchema),
  })
  .strict();

export const DashboardLayoutSchema = z
  .object({
    id: DashboardIdSchema,
    version: z.number().int().positive(),
    quadrants: z
      .object({
        growth: QuadrantLayoutBaseSchema.extend({
          id: z.literal("growth"),
          label: z.literal("Growth"),
        }),
        inflation: QuadrantLayoutBaseSchema.extend({
          id: z.literal("inflation"),
          label: z.literal("Inflation"),
        }),
        policy: QuadrantLayoutBaseSchema.extend({
          id: z.literal("policy"),
          label: z.literal("Policy / Liquidity"),
        }),
        market: QuadrantLayoutBaseSchema.extend({
          id: z.literal("market"),
          label: z.literal("Market"),
        }),
      })
      .strict(),
  })
  .strict()
  .superRefine((layout, context) => {
    const seenWidgetIds = new Set<string>();

    for (const quadrantId of QUADRANT_IDS) {
      layout.quadrants[quadrantId].widgets.forEach((widget, index) => {
        if (seenWidgetIds.has(widget.id)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate widget id: ${widget.id}`,
            path: ["quadrants", quadrantId, "widgets", index, "id"],
          });
        }
        seenWidgetIds.add(widget.id);
      });
    }
  });

export const WidgetTargetSchema = z
  .object({
    quadrantId: QuadrantIdSchema,
    index: z.number().int().nonnegative().optional(),
  })
  .strict();

export const WidgetConfigPatchSchema = z
  .object({
    title: NonEmptyStringSchema.optional(),
    description: NonEmptyStringSchema.optional(),
    range: DateRangeSchema.optional(),
    transform: TransformSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Configure actions must include at least one allowed field.",
  });

export const AddWidgetActionSchema = z
  .object({
    type: z.literal("add_widget"),
    widget: WidgetConfigSchema,
    target: WidgetTargetSchema,
  })
  .strict();

export const MoveWidgetActionSchema = z
  .object({
    type: z.literal("move_widget"),
    widgetId: WidgetIdSchema,
    from: WidgetTargetSchema,
    to: WidgetTargetSchema,
  })
  .strict();

export const ConfigureWidgetActionSchema = z
  .object({
    type: z.literal("configure_widget"),
    widgetId: WidgetIdSchema,
    patch: WidgetConfigPatchSchema,
  })
  .strict();

export const RemoveWidgetActionSchema = z
  .object({
    type: z.literal("remove_widget"),
    widgetId: WidgetIdSchema,
  })
  .strict();

export const LayoutActionSchema = z.discriminatedUnion("type", [
  AddWidgetActionSchema,
  MoveWidgetActionSchema,
  ConfigureWidgetActionSchema,
  RemoveWidgetActionSchema,
]);

export const UIActionProposalSchema = z
  .object({
    id: IdSchema,
    summary: NonEmptyStringSchema,
    proposedBy: z.enum(["agent", "user", "system"]),
    proposedAt: DateTimeSchema,
    dashboardId: DashboardIdSchema,
    chatTurnId: IdSchema.optional(),
    actions: z.array(LayoutActionSchema).min(1),
  })
  .strict();

export const ActionLogEntrySchema = z
  .object({
    id: IdSchema,
    proposalId: IdSchema.optional(),
    actionType: z.enum(ACTION_TYPES),
    result: ActionResultSchema,
    actor: z.enum(["agent", "user", "system"]),
    dashboardId: DashboardIdSchema,
    timestamp: DateTimeSchema,
    affectedWidgetIds: z.array(WidgetIdSchema),
    summary: NonEmptyStringSchema,
    reasons: z.array(NonEmptyStringSchema).default([]),
    chatTurnId: IdSchema.optional(),
  })
  .strict();

export const CountrySchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Z]{2,3}$/),
    name: NonEmptyStringSchema,
  })
  .strict();

export const IndicatorSummarySchema = z
  .object({
    metadata: IndicatorMetadataSchema,
    category: NonEmptyStringSchema,
    country: CountrySchema,
    definition: NonEmptyStringSchema,
  })
  .strict();

export const IndicatorSearchResponseSchema = z
  .object({
    indicators: z.array(IndicatorSummarySchema),
    fetchedAt: DateTimeSchema,
  })
  .strict();

export const SingleSeriesResponseSchema = z
  .object({
    indicator: IndicatorMetadataSchema,
    unit: NonEmptyStringSchema,
    frequency: FrequencySchema,
    transform: TransformSchema,
    range: DateRangeSchema,
    source: SourceSchema,
    observationDate: CalendarDateSchema,
    releaseDate: ReleaseDateSchema,
    fetchedAt: DateTimeSchema,
    points: z.array(TimeSeriesPointSchema).min(1),
  })
  .strict();

export const ComparisonResponseSchema = z
  .object({
    series: z.array(SingleSeriesResponseSchema).min(2).max(4),
    range: DateRangeSchema,
    transform: TransformSchema,
    fetchedAt: DateTimeSchema,
  })
  .strict();

export const API_ERROR_CODES = [
  "indicator_not_found",
  "widget_not_found",
  "invalid_query",
  "widget_type_unsupported",
  "unexpected_error",
] as const;

export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);

export const ApiErrorFieldSchema = z
  .object({
    path: NonEmptyStringSchema,
    message: NonEmptyStringSchema,
  })
  .strict();

export const ApiErrorSchema = z
  .object({
    error: z
      .object({
        code: ApiErrorCodeSchema,
        message: NonEmptyStringSchema,
        fields: z.array(ApiErrorFieldSchema).optional(),
      })
      .strict(),
    requestId: NonEmptyStringSchema,
  })
  .strict();

export type QuadrantId = z.infer<typeof QuadrantIdSchema>;
export type WidgetType = z.infer<typeof WidgetTypeSchema>;
export type ActionType = (typeof ACTION_TYPES)[number];
export type DataProvider = z.infer<typeof DataProviderSchema>;
export type Frequency = z.infer<typeof FrequencySchema>;
export type Transform = z.infer<typeof TransformSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type IndicatorMetadata = z.infer<typeof IndicatorMetadataSchema>;
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;
export type TrendMetadata = z.infer<typeof TrendMetadataSchema>;
export type StatusMetadata = z.infer<typeof StatusMetadataSchema>;
export type WidgetDataResponse = z.infer<typeof WidgetDataResponseSchema>;
export type MetricWidgetConfig = z.infer<typeof MetricWidgetConfigSchema>;
export type LineChartWidgetConfig = z.infer<typeof LineChartWidgetConfigSchema>;
export type ComparisonChartWidgetConfig = z.infer<typeof ComparisonChartWidgetConfigSchema>;
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;
export type WidgetTarget = z.infer<typeof WidgetTargetSchema>;
export type WidgetConfigPatch = z.infer<typeof WidgetConfigPatchSchema>;
export type DashboardLayout = z.infer<typeof DashboardLayoutSchema>;
export type LayoutAction = z.infer<typeof LayoutActionSchema>;
export type UIActionProposal = z.infer<typeof UIActionProposalSchema>;
export type ActionLogEntry = z.infer<typeof ActionLogEntrySchema>;
export type Country = z.infer<typeof CountrySchema>;
export type IndicatorSummary = z.infer<typeof IndicatorSummarySchema>;
export type IndicatorSearchResponse = z.infer<typeof IndicatorSearchResponseSchema>;
export type SingleSeriesResponse = z.infer<typeof SingleSeriesResponseSchema>;
export type ComparisonResponse = z.infer<typeof ComparisonResponseSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiErrorField = z.infer<typeof ApiErrorFieldSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
