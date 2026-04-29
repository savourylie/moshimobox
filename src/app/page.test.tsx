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
});
