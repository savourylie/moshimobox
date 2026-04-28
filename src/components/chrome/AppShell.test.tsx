import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";
import { QUADRANTS } from "./QUADRANTS";

describe("AppShell", () => {
  it("renders the top bar, sidebar nav, and main landmarks", () => {
    render(
      <AppShell>
        <div data-testid="content">hello</div>
      </AppShell>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /quadrants/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders children inside <main>", () => {
    render(
      <AppShell>
        <div data-testid="content">hello</div>
      </AppShell>,
    );
    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByTestId("content"));
  });

  it("renders a link for each quadrant with the correct anchor", () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    );
    for (const quadrant of QUADRANTS) {
      const link = screen.getByRole("link", { name: quadrant.label });
      expect(link).toHaveAttribute("href", quadrant.anchor);
    }
  });

  it("includes the Policy / Liquidity sidebar entry by name", () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    );
    expect(
      screen.getByRole("link", { name: "Policy / Liquidity" }),
    ).toBeInTheDocument();
  });

  it("exposes the logo, search, and settings affordances", () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    );
    expect(screen.getByAltText("Moshimo Box")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /search indicators, sources, or layouts/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /settings/i }),
    ).toBeInTheDocument();
  });

  it("toggles the copilot button and chat panel slot", () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    );
    const copilot = screen.getByRole("button", { name: /copilot/i });
    expect(copilot).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("complementary", { name: /chat panel/i }),
    ).toBeInTheDocument();

    fireEvent.click(copilot);
    expect(copilot).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("complementary", { name: /chat panel/i }),
    ).toBeNull();

    fireEvent.click(copilot);
    expect(copilot).toHaveAttribute("aria-pressed", "true");
  });
});
