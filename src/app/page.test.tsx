import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";
import { QUADRANTS } from "@/components/chrome/QUADRANTS";

describe("HomePage", () => {
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

  it("shows an empty caption per section", () => {
    render(<HomePage />);
    expect(screen.getAllByText("No widgets yet.")).toHaveLength(QUADRANTS.length);
  });
});
