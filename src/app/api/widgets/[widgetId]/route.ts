import { failure, failureFromUnknown, ok } from "@/server/api/response";
import { newRequestId } from "@/server/api/requestId";
import { getWidgetData } from "@/server/indicators/widgetData";

export async function GET(
  _request: Request,
  context: { params: Promise<{ widgetId: string }> },
): Promise<Response> {
  const requestId = newRequestId();
  try {
    const { widgetId } = await context.params;
    if (!widgetId) {
      return failure("invalid_query", "widgetId path parameter is required.", { requestId });
    }
    const data = await getWidgetData(widgetId);
    return ok(data);
  } catch (err) {
    return failureFromUnknown(err, requestId);
  }
}
