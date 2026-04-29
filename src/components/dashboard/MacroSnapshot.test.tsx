import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MACRO_SNAPSHOT_BODY,
  DEFAULT_MACRO_SNAPSHOT_HEADLINE,
  MacroSnapshot,
} from "./MacroSnapshot";

describe("MacroSnapshot", () => {
  it("renders the eyebrow with the asOf month and year", () => {
    render(<MacroSnapshot asOf={new Date(2026, 3, 30)} />);
    expect(screen.getByText("Macro snapshot · as of Apr 2026")).toBeInTheDocument();
  });

  it("renders the default headline as a level-1 heading", () => {
    render(<MacroSnapshot asOf={new Date(2026, 3, 30)} />);
    expect(
      screen.getByRole("heading", { level: 1, name: DEFAULT_MACRO_SNAPSHOT_HEADLINE }),
    ).toBeInTheDocument();
  });

  it("renders the default body paragraph", () => {
    render(<MacroSnapshot asOf={new Date(2026, 3, 30)} />);
    expect(screen.getByText(DEFAULT_MACRO_SNAPSHOT_BODY)).toBeInTheDocument();
  });

  it("makes the no-investment-advice framing explicit", () => {
    render(<MacroSnapshot asOf={new Date(2026, 3, 30)} />);
    expect(screen.getByText(/not investment advice/i)).toBeInTheDocument();
  });

  it("does not use prescriptive investment verbs", () => {
    render(<MacroSnapshot asOf={new Date(2026, 3, 30)} />);
    expect(
      screen.queryByText(/\b(buy|sell|recommend|should|consider)\b/i),
    ).not.toBeInTheDocument();
  });

  it("accepts headline and body overrides", () => {
    render(
      <MacroSnapshot
        asOf={new Date(2026, 3, 30)}
        headline="Custom headline."
        body="Custom body copy."
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Custom headline." })).toBeInTheDocument();
    expect(screen.getByText("Custom body copy.")).toBeInTheDocument();
  });
});
