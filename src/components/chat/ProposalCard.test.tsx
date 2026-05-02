import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ActionProposalDiffEntry,
  ActionProposalValidationResult,
  ProposalValidationIssue,
  UIActionProposal,
} from "@/domain/schemas";
import { ProposalCard } from "./ProposalCard";
import type { PendingProposalState, ProposalStatus } from "./useChatState";

const proposal: UIActionProposal = {
  id: "proposal-1",
  summary: "Add Breakeven extra to Inflation",
  proposedBy: "agent",
  proposedAt: "2026-05-02T10:00:00.000Z",
  dashboardId: "main",
  actions: [
    {
      type: "add_widget",
      target: { quadrantId: "inflation" },
      widget: {
        id: "widget.line.us_5y_breakeven_extra",
        type: "line_chart",
        title: "Breakeven extra",
        description: "Additional view of 5-year breakeven inflation.",
        indicatorId: "us_5y_breakeven_inflation",
        transform: "level",
      },
    },
  ],
};

const diffEntry: ActionProposalDiffEntry = {
  actionIndex: 0,
  actionType: "add_widget",
  widgetId: "widget.line.us_5y_breakeven_extra",
  title: "Breakeven extra",
  before: null,
  after: {
    quadrantId: "inflation",
    index: 3,
    widget: {
      id: "widget.line.us_5y_breakeven_extra",
      type: "line_chart",
      title: "Breakeven extra",
      description: "Additional view.",
      indicatorId: "us_5y_breakeven_inflation",
      transform: "level",
    },
  },
  summary: "Add Breakeven extra to Inflation.",
};

const validValidation: ActionProposalValidationResult = {
  valid: true,
  proposalId: "proposal-1",
  dashboardId: "main",
  summary: "Add Breakeven extra to Inflation.",
  affectedWidgetIds: ["widget.line.us_5y_breakeven_extra"],
  diff: [diffEntry],
  previewLayout: {
    id: "main",
    version: 1,
    quadrants: {
      growth: { id: "growth", label: "Growth", widgets: [] },
      inflation: { id: "inflation", label: "Inflation", widgets: [] },
      policy: { id: "policy", label: "Policy / Liquidity", widgets: [] },
      market: { id: "market", label: "Market", widgets: [] },
    },
  },
  reasons: [],
  issues: [],
};

const rejectIssue: ProposalValidationIssue = {
  code: "quadrant_limit_exceeded",
  message: "Inflation would have 5 widgets; allowed range is 2 to 4.",
  actionIndex: 0,
  quadrantId: "inflation",
};

const buildState = (
  status: ProposalStatus,
  overrides: Partial<PendingProposalState> = {},
): PendingProposalState => ({
  proposal,
  validation: validValidation,
  basedOnVersion: 1,
  chatTurnId: "turn-1",
  status,
  ...overrides,
});

describe("ProposalCard", () => {
  it("renders idle state with diff bullets and Apply/Dismiss controls", () => {
    const onApply = vi.fn();
    const onDismiss = vi.fn();
    render(<ProposalCard state={buildState("idle")} onApply={onApply} onDismiss={onDismiss} />);

    expect(screen.getByText(/Proposed action · Inflation/i)).toBeInTheDocument();
    expect(screen.getByText("Add Breakeven extra to Inflation")).toBeInTheDocument();
    expect(screen.getByText("Add Breakeven extra to Inflation.")).toBeInTheDocument();

    const applyButton = screen.getByRole("button", { name: /Apply: /i });
    const dismissButton = screen.getByRole("button", { name: /Dismiss: /i });
    fireEvent.click(applyButton);
    fireEvent.click(dismissButton);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("disables Apply and Dismiss in applying state", () => {
    render(
      <ProposalCard state={buildState("applying")} onApply={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: /Apply: /i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Dismiss: /i })).toBeNull();
  });

  it("shows applied summary without buttons after a successful apply", () => {
    render(
      <ProposalCard
        state={buildState("applied", { appliedDiff: [diffEntry] })}
        onApply={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText(/Applied · Inflation/i)).toBeInTheDocument();
    expect(screen.getByText("Add Breakeven extra to Inflation.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply: /i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Dismiss: /i })).toBeNull();
  });

  it("maps issue codes to human labels in the rejected state", () => {
    render(
      <ProposalCard
        state={buildState("rejected", {
          issues: [rejectIssue],
          reasons: [rejectIssue.message],
        })}
        onApply={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText("Cannot apply")).toBeInTheDocument();
    expect(screen.getByText("That quadrant is full (max 4 widgets).")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply: /i })).toBeNull();
    expect(screen.getByRole("button", { name: /Dismiss: /i })).toBeInTheDocument();
  });

  it("renders factual stale copy with only a Dismiss action", () => {
    render(
      <ProposalCard
        state={buildState("stale", {
          errorMessage: "The dashboard layout has changed.",
        })}
        onApply={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText("Layout has changed")).toBeInTheDocument();
    expect(screen.getByText("The dashboard layout has changed.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply: /i })).toBeNull();
    expect(screen.getByRole("button", { name: /Dismiss: /i })).toBeInTheDocument();
  });

  it("offers a Retry button in the error state", () => {
    const onApply = vi.fn();
    render(
      <ProposalCard
        state={buildState("error", {
          errorMessage: "Could not apply this change. Try again in a moment.",
        })}
        onApply={onApply}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText("Could not apply")).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /Apply: /i });
    expect(retry).toHaveTextContent(/Retry/i);
    fireEvent.click(retry);
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
