import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/api/errors";
import { toolErrorMessage } from "./errorMessage";

describe("toolErrorMessage", () => {
  it("maps known ApiError codes to calm strings", () => {
    expect(toolErrorMessage(new ApiError("indicator_not_found", "x"))).toContain(
      "indicator_not_found",
    );
    expect(toolErrorMessage(new ApiError("widget_not_found", "x"))).toContain(
      "widget_not_found",
    );
    expect(toolErrorMessage(new ApiError("invalid_query", "missing field"))).toContain(
      "invalid_query",
    );
    expect(toolErrorMessage(new ApiError("provider_error", "x"))).toMatch(/Upstream/);
  });

  it("falls back gracefully for unknown errors", () => {
    expect(toolErrorMessage(new Error("boom"))).toContain("boom");
    expect(toolErrorMessage("string thrown")).toBe("Tool failed.");
  });
});
