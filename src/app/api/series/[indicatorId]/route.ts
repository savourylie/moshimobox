import { z } from "zod";
import { CalendarDateSchema, TransformSchema } from "@/domain/schemas";
import { failure, failureFromUnknown, ok } from "@/server/api/response";
import { newRequestId } from "@/server/api/requestId";
import { seriesRepository } from "@/server/series/seriesRepository";

const QuerySchema = z
  .object({
    start: CalendarDateSchema.optional(),
    end: CalendarDateSchema.optional(),
    transform: TransformSchema.optional(),
  })
  .strict();

export async function GET(
  request: Request,
  context: { params: Promise<{ indicatorId: string }> },
): Promise<Response> {
  const requestId = newRequestId();
  try {
    const { indicatorId } = await context.params;
    if (!indicatorId) {
      return failure("invalid_query", "indicatorId path parameter is required.", { requestId });
    }

    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return failure("invalid_query", "Series filters are invalid.", {
        requestId,
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
          message: issue.message,
        })),
      });
    }

    if (parsed.data.end && !parsed.data.start) {
      return failure("invalid_query", "An end date requires a start date.", { requestId });
    }

    const range = parsed.data.start
      ? { start: parsed.data.start, ...(parsed.data.end ? { end: parsed.data.end } : {}) }
      : undefined;

    const series = await seriesRepository.getSeries({
      indicatorId,
      transform: parsed.data.transform,
      range,
    });

    return ok(series);
  } catch (err) {
    return failureFromUnknown(err, requestId);
  }
}
