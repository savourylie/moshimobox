import type { ApiErrorCode, ApiErrorField } from "@/domain/schemas";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields?: ApiErrorField[];

  constructor(code: ApiErrorCode, message: string, options?: { fields?: ApiErrorField[] }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_FOR_CODE[code];
    this.fields = options?.fields;
  }
}

const STATUS_FOR_CODE: Record<ApiErrorCode, number> = {
  indicator_not_found: 404,
  widget_not_found: 404,
  invalid_query: 400,
  widget_type_unsupported: 400,
  provider_error: 502,
  proposal_stale: 409,
  history_empty: 409,
  unexpected_error: 500,
};

export const statusForCode = (code: ApiErrorCode): number => STATUS_FOR_CODE[code];
