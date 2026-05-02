import { z } from "zod";
import { failure, failureFromUnknown, ok } from "@/server/api/response";
import { newRequestId } from "@/server/api/requestId";
import { runResearchAgent } from "@/server/agent/runAgent";

export const runtime = "nodejs";

const HistoryItemSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    text: z.string().trim().min(1),
  })
  .strict();

const BodySchema = z
  .object({
    message: z.string().trim().min(1),
    history: z.array(HistoryItemSchema).max(40).default([]),
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
      return failure("invalid_query", "Chat request body is invalid.", {
        requestId,
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
          message: issue.message,
        })),
      });
    }

    const result = await runResearchAgent({
      message: parsed.data.message,
      history: parsed.data.history,
    });

    return ok({
      text: result.text,
      toolInvocations: result.toolInvocations,
      ...(result.proposal ? { proposal: result.proposal } : {}),
      requestId,
    });
  } catch (err) {
    return failureFromUnknown(err, requestId);
  }
}
