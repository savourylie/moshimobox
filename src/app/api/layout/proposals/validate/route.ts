import { z } from "zod";
import { DashboardLayoutSchema } from "@/domain/schemas";
import { failure, failureFromUnknown, ok } from "@/server/api/response";
import { newRequestId } from "@/server/api/requestId";
import { validateActionProposal } from "@/server/actions";
import { layoutStore } from "@/server/layout";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    proposal: z.unknown(),
    layout: DashboardLayoutSchema.optional(),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  const requestId = newRequestId();
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return failure("invalid_query", "Request body must be valid JSON.", { requestId });
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return failure("invalid_query", "Proposal validation request body is invalid.", {
        requestId,
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
          message: issue.message,
        })),
      });
    }

    return ok({
      ...validateActionProposal(parsed.data.proposal, {
        layout: parsed.data.layout ?? layoutStore.getCurrent(),
      }),
      requestId,
    });
  } catch (err) {
    return failureFromUnknown(err, requestId);
  }
}
