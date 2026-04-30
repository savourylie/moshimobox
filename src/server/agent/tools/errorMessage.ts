import { ApiError } from "@/server/api/errors";

export const toolErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "indicator_not_found":
      case "widget_not_found":
        return `No data found for that identifier (${error.code}).`;
      case "invalid_query":
      case "widget_type_unsupported":
        return `Invalid query (${error.code}): ${error.message}`;
      case "provider_error":
        return "Upstream data source unavailable. A cached value is used when possible.";
      default:
        return `Tool failed (${error.code}).`;
    }
  }
  if (error instanceof Error) {
    return `Tool failed: ${error.message}`;
  }
  return "Tool failed.";
};
