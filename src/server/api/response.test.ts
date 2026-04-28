import { describe, expect, it } from "vitest";
import { ApiErrorSchema } from "@/domain/schemas";
import { ApiError } from "./errors";
import { failure, failureFromUnknown, ok } from "./response";

describe("ok", () => {
  it("returns a JSON response with status 200 and no-store cache header", async () => {
    const response = ok({ hello: "world" });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")?.toLowerCase()).toContain("application/json");
    expect(await response.json()).toEqual({ hello: "world" });
  });
});

describe("failure", () => {
  it("returns 400 for invalid_query and a parseable ApiError envelope", async () => {
    const response = failure("invalid_query", "Bad input.");

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    const result = ApiErrorSchema.safeParse(body);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error.code).toBe("invalid_query");
      expect(result.data.error.message).toBe("Bad input.");
      expect(result.data.requestId.length).toBeGreaterThan(0);
    }
  });

  it("returns 404 for indicator_not_found", () => {
    expect(failure("indicator_not_found", "missing").status).toBe(404);
  });

  it("returns 500 for unexpected_error", () => {
    expect(failure("unexpected_error", "internal").status).toBe(500);
  });

  it("includes provided fields and requestId", async () => {
    const response = failure("invalid_query", "Bad input.", {
      requestId: "fixed-request-id",
      fields: [{ path: "start", message: "Use YYYY-MM-DD." }],
    });

    const body = await response.json();
    expect(body.requestId).toBe("fixed-request-id");
    expect(body.error.fields).toEqual([{ path: "start", message: "Use YYYY-MM-DD." }]);
  });
});

describe("failureFromUnknown", () => {
  it("preserves ApiError code and fields", async () => {
    const response = failureFromUnknown(
      new ApiError("widget_not_found", "Widget widget_x was not found."),
      "rid-a",
    );

    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("widget_not_found");
    expect(body.requestId).toBe("rid-a");
  });

  it("returns a generic unexpected_error envelope for arbitrary throws", async () => {
    const response = failureFromUnknown(new Error("connection: leak"), "rid-b");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("unexpected_error");
    expect(body.error.message).toBe("The server could not complete this request.");
    expect(body.error.message).not.toContain("connection: leak");
    expect(body.requestId).toBe("rid-b");
  });
});
