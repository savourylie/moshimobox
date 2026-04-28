import { z } from "zod";
import {
  CalendarDateSchema,
  type ComparisonResponse,
  type SingleSeriesResponse,
  TransformSchema,
} from "@/domain/schemas";
import { failure, failureFromUnknown, ok } from "@/server/api/response";
import { newRequestId } from "@/server/api/requestId";
import { seriesRepository } from "@/server/series/seriesRepository";

const QuerySchema = z
  .object({
    indicatorIds: z.string().trim().min(1),
    start: CalendarDateSchema.optional(),
    end: CalendarDateSchema.optional(),
    transform: TransformSchema.optional(),
  })
  .strict();

const minDate = (a: string, b: string): string => (a <= b ? a : b);
const maxDate = (a: string, b: string): string => (a >= b ? a : b);

export async function GET(request: Request): Promise<Response> {
  const requestId = newRequestId();
  try {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return failure("invalid_query", "Comparison filters are invalid.", {
        requestId,
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
          message: issue.message,
        })),
      });
    }

    const ids = parsed.data.indicatorIds
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (ids.length < 2 || ids.length > 4) {
      return failure("invalid_query", "indicatorIds must include 2 to 4 indicators.", {
        requestId,
      });
    }

    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      return failure("invalid_query", "indicatorIds must be unique.", { requestId });
    }

    if (parsed.data.end && !parsed.data.start) {
      return failure("invalid_query", "An end date requires a start date.", { requestId });
    }

    const transform = parsed.data.transform ?? "level";
    const range = parsed.data.start
      ? { start: parsed.data.start, ...(parsed.data.end ? { end: parsed.data.end } : {}) }
      : undefined;

    const series: SingleSeriesResponse[] = [];
    for (const indicatorId of ids) {
      const result = await seriesRepository.getSeries({
        indicatorId,
        transform,
        range,
      });
      series.push(result);
    }

    const responseRange = range ?? deriveUnionRange(series);

    const response: ComparisonResponse = {
      series: series as ComparisonResponse["series"],
      range: responseRange,
      transform,
      fetchedAt: new Date().toISOString(),
    };

    return ok(response);
  } catch (err) {
    return failureFromUnknown(err, requestId);
  }
}

const deriveUnionRange = (
  series: SingleSeriesResponse[],
): ComparisonResponse["range"] => {
  let start = series[0].range.start;
  let end = series[0].range.end ?? series[0].range.start;
  for (const item of series.slice(1)) {
    start = minDate(start, item.range.start);
    if (item.range.end) {
      end = maxDate(end, item.range.end);
    }
  }
  return { start, end };
};
