import { z } from "zod";
import { failure, failureFromUnknown, ok } from "@/server/api/response";
import { newRequestId } from "@/server/api/requestId";
import { layoutMutationService } from "@/server/layout";

export const runtime = "nodejs";

const ActorSchema = z.enum(["agent", "user", "system"]);

const BodySchema = z
  .object({
    basedOnVersion: z.number().int().nonnegative(),
    actor: ActorSchema.optional(),
    reason: z.string().min(1).optional(),
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
      return failure("invalid_query", "Rollback request body is invalid.", {
        requestId,
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
          message: issue.message,
        })),
      });
    }

    const outcome = layoutMutationService.rollback({
      basedOnVersion: parsed.data.basedOnVersion,
      ...(parsed.data.actor ? { actor: parsed.data.actor } : {}),
      ...(parsed.data.reason ? { reason: parsed.data.reason } : {}),
    });

    if (outcome.kind === "stale") {
      return failure(
        "proposal_stale",
        `Rollback was based on version ${outcome.attemptedVersion}, but the current layout is version ${outcome.currentVersion}.`,
        {
          requestId,
          fields: [
            {
              path: "basedOnVersion",
              message: `Current layout version is ${outcome.currentVersion}.`,
            },
          ],
        },
      );
    }

    if (outcome.kind === "history_empty") {
      return failure("history_empty", "There are no prior layout versions to roll back to.", {
        requestId,
      });
    }

    return ok({
      layout: outcome.layout,
      version: outcome.version,
      restoredFromVersion: outcome.restoredFromVersion,
      summary: outcome.summary,
      logEntry: outcome.logEntry,
      requestId,
    });
  } catch (err) {
    return failureFromUnknown(err, requestId);
  }
}
