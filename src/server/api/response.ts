import type { ApiError as ApiErrorPayload, ApiErrorCode, ApiErrorField } from "@/domain/schemas";
import { ApiError, statusForCode } from "./errors";
import { newRequestId } from "./requestId";

const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store",
};

export const ok = <T extends object>(body: T): Response =>
  Response.json(body, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });

export interface FailureOptions {
  fields?: ApiErrorField[];
  requestId?: string;
}

export const failure = (
  code: ApiErrorCode,
  message: string,
  options?: FailureOptions,
): Response => {
  const payload: ApiErrorPayload = {
    error: {
      code,
      message,
      ...(options?.fields ? { fields: options.fields } : {}),
    },
    requestId: options?.requestId ?? newRequestId(),
  };

  return Response.json(payload, {
    status: statusForCode(code),
    headers: NO_STORE_HEADERS,
  });
};

const UNEXPECTED_MESSAGE = "The server could not complete this request.";

export const failureFromUnknown = (cause: unknown, requestId?: string): Response => {
  if (cause instanceof ApiError) {
    return failure(cause.code, cause.message, {
      fields: cause.fields,
      requestId,
    });
  }

  return failure("unexpected_error", UNEXPECTED_MESSAGE, { requestId });
};
