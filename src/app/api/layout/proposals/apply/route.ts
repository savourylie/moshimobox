import { z } from "zod";
import { failure, failureFromUnknown, ok } from "@/server/api/response";
import { newRequestId } from "@/server/api/requestId";
import { layoutMutationService } from "@/server/layout";

export const runtime = "nodejs";

const ActorSchema = z.enum(["agent", "user", "system"]);

const BodySchema = z
  .object({
    proposal: z.unknown(),
    basedOnVersion: z.number().int().nonnegative(),
    actor: ActorSchema.optional(),
    chatTurnId: z.string().min(1).optional(),
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
      return failure("invalid_query", "Apply request body is invalid.", {
        requestId,
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
          message: issue.message,
        })),
      });
    }

    const outcome = layoutMutationService.applyProposal({
      proposal: parsed.data.proposal,
      basedOnVersion: parsed.data.basedOnVersion,
      ...(parsed.data.actor ? { actor: parsed.data.actor } : {}),
      ...(parsed.data.chatTurnId ? { chatTurnId: parsed.data.chatTurnId } : {}),
    });

    if (outcome.kind === "stale") {
      return failure(
        "proposal_stale",
        `Proposal was validated against version ${outcome.attemptedVersion}, but the current layout is version ${outcome.currentVersion}.`,
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

    if (outcome.kind === "rejected") {
      return ok({
        valid: false,
        ...(outcome.proposalId ? { proposalId: outcome.proposalId } : {}),
        summary: outcome.summary,
        reasons: outcome.reasons,
        issues: outcome.issues,
        requestId,
      });
    }

    return ok({
      valid: true,
      layout: outcome.layout,
      version: outcome.version,
      diff: outcome.diff,
      affectedWidgetIds: outcome.affectedWidgetIds,
      summary: outcome.summary,
      logEntries: outcome.logEntries,
      requestId,
    });
  } catch (err) {
    return failureFromUnknown(err, requestId);
  }
}
