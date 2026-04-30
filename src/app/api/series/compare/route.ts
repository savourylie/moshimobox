import { z } from "zod";
import { CalendarDateSchema, TransformSchema } from "@/domain/schemas";
import { failure, failureFromUnknown, ok } from "@/server/api/response";
import { newRequestId } from "@/server/api/requestId";
import { compareSeries } from "@/server/series/comparison";

const QuerySchema = z
  .object({
    indicatorIds: z.string().trim().min(1),
    start: CalendarDateSchema.optional(),
    end: CalendarDateSchema.optional(),
    transform: TransformSchema.optional(),
  })
  .strict();

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

    if (parsed.data.end && !parsed.data.start) {
      return failure("invalid_query", "An end date requires a start date.", { requestId });
    }

    const ids = parsed.data.indicatorIds
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const range = parsed.data.start
      ? { start: parsed.data.start, ...(parsed.data.end ? { end: parsed.data.end } : {}) }
      : undefined;

    const response = await compareSeries({
      indicatorIds: ids,
      range,
      transform: parsed.data.transform,
    });

    return ok(response);
  } catch (err) {
    return failureFromUnknown(err, requestId);
  }
}
