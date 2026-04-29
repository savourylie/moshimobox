import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { QUADRANTS } from "@/components/chrome/QUADRANTS";

describe("HomePage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an h2 heading for each quadrant", () => {
    render(<HomePage />);
    for (const quadrant of QUADRANTS) {
      expect(screen.getByRole("heading", { name: quadrant.label, level: 2 })).toBeInTheDocument();
    }
  });

  it("anchors each section to its quadrant id", () => {
    const { container } = render(<HomePage />);
    for (const quadrant of QUADRANTS) {
      expect(container.querySelector(`section#${quadrant.id}`)).not.toBeNull();
    }
  });

  it("renders loading states for seeded default-layout widgets", () => {
    render(<HomePage />);
    expect(screen.getByText("Fetching Unemployment rate widget data")).toBeInTheDocument();
    expect(screen.getByText("Fetching Core CPI series")).toBeInTheDocument();
    expect(screen.getByText("Fetching Yield curve comparison series")).toBeInTheDocument();
  });

  it("renders the macro snapshot above the four quadrants", () => {
    const { container } = render(<HomePage />);

    const snapshot = screen.getByTestId("macro-snapshot");
    const firstQuadrant = container.querySelector(`section#${QUADRANTS[0].id}`);

    expect(snapshot).toBeInTheDocument();
    expect(firstQuadrant).not.toBeNull();
    expect(snapshot.compareDocumentPosition(firstQuadrant!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText(/Macro snapshot · as of /)).toBeInTheDocument();
  });

  it("does not present the macro snapshot as investment advice", () => {
    render(<HomePage />);

    const snapshot = screen.getByTestId("macro-snapshot");
    expect(snapshot.textContent ?? "").toMatch(/not investment advice/i);
    expect(snapshot.textContent ?? "").not.toMatch(/\b(buy|sell|recommend|should|consider)\b/i);
  });
});
