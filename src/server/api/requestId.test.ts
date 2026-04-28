import { describe, expect, it } from "vitest";
import { newRequestId } from "./requestId";

describe("newRequestId", () => {
  it("returns a UUID v4 string", () => {
    const id = newRequestId();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns a different value on each call", () => {
    const a = newRequestId();
    const b = newRequestId();

    expect(a).not.toBe(b);
  });
});
