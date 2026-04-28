import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the Moshimo Box wordmark", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /Moshimo Box/i, level: 1 })).toBeInTheDocument();
  });

  it("shows the empty workspace caption", () => {
    render(<HomePage />);
    expect(screen.getByText(/no widgets yet/i)).toBeInTheDocument();
  });
});
