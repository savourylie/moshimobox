import { z } from "zod";
import { DataProviderSchema, QuadrantIdSchema } from "@/domain/schemas";
import { failure, failureFromUnknown, ok } from "@/server/api/response";
import { newRequestId } from "@/server/api/requestId";
import { searchIndicators } from "@/server/indicators/search";

const QuerySchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    quadrant: QuadrantIdSchema.optional(),
    category: z.string().trim().min(1).optional(),
    country: z.string().trim().min(1).optional(),
    source: DataProviderSchema.optional(),
  })
  .strict();

export async function GET(request: Request): Promise<Response> {
  const requestId = newRequestId();
  try {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return failure("invalid_query", "Search filters are invalid.", {
        requestId,
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
          message: issue.message,
        })),
      });
    }

    const indicators = searchIndicators(parsed.data);
    return ok({ indicators, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return failureFromUnknown(err, requestId);
  }
}
