"use client";

import { Check, Sparkles } from "lucide-react";
import type {
  ActionProposalDiffEntry,
  ProposalValidationIssue,
  ProposalValidationIssueCode,
  QuadrantId,
} from "@/domain/schemas";
import type { PendingProposalState, ProposalStatus } from "./useChatState";
import styles from "./ProposalCard.module.css";

interface ProposalCardProps {
  state: PendingProposalState;
  onApply: () => void;
  onDismiss: () => void;
}

const QUADRANT_LABELS: Record<QuadrantId, string> = {
  growth: "Growth",
  inflation: "Inflation",
  policy: "Policy / Liquidity",
  market: "Market",
};

const ISSUE_LABELS: Partial<Record<ProposalValidationIssueCode, string>> = {
  proposal_schema_invalid: "Proposal data is malformed.",
  layout_schema_invalid: "Current dashboard layout is malformed.",
  dashboard_mismatch: "Proposal targets a different dashboard.",
  widget_not_found: "That widget is not on the dashboard.",
  widget_already_exists: "A widget with that id already exists.",
  indicator_not_found: "That indicator is not in the catalog.",
  indicator_not_unique: "Comparison charts need unique indicators.",
  indicator_quadrant_mismatch: "That indicator belongs to a different quadrant.",
  invalid_target: "Target position is outside the quadrant.",
  invalid_widget_config: "Widget configuration is invalid.",
  quadrant_limit_exceeded: "That quadrant is full (max 4 widgets).",
  layout_incompatible: "The resulting layout would be invalid.",
};

const formatIssue = (issue: ProposalValidationIssue): string =>
  ISSUE_LABELS[issue.code] ?? issue.message;

const formatReasonsList = (state: PendingProposalState): string[] => {
  if (state.issues && state.issues.length > 0) {
    return state.issues.map(formatIssue);
  }
  if (state.reasons && state.reasons.length > 0) return [...state.reasons];
  if (!state.validation.valid) {
    if (state.validation.issues.length > 0) return state.validation.issues.map(formatIssue);
    return [...state.validation.reasons];
  }
  return [];
};

const collectQuadrantLabels = (diff: readonly ActionProposalDiffEntry[]): string => {
  const ids = new Set<QuadrantId>();
  for (const entry of diff) {
    if (entry.before) ids.add(entry.before.quadrantId);
    if (entry.after) ids.add(entry.after.quadrantId);
  }
  if (ids.size === 0) return "Layout";
  return Array.from(ids)
    .map((id) => QUADRANT_LABELS[id])
    .join(" · ");
};

const collectAffectedDiff = (
  state: PendingProposalState,
): readonly ActionProposalDiffEntry[] => {
  if (state.appliedDiff && state.appliedDiff.length > 0) return state.appliedDiff;
  if (state.validation.valid) return state.validation.diff;
  return state.validation.diff;
};

const eyebrowText = (status: ProposalStatus, quadrants: string): string => {
  switch (status) {
    case "applied":
      return `Applied · ${quadrants}`;
    case "rejected":
      return "Cannot apply";
    case "stale":
      return "Layout has changed";
    case "error":
      return "Could not apply";
    default:
      return `Proposed action · ${quadrants}`;
  }
};

export function ProposalCard({ state, onApply, onDismiss }: ProposalCardProps) {
  const diff = collectAffectedDiff(state);
  const quadrants = collectQuadrantLabels(diff);
  const eyebrow = eyebrowText(state.status, quadrants);
  const isBusy = state.status === "applying";
  const showApply = state.status === "idle" || state.status === "error";
  const showDismiss = state.status !== "applied" && state.status !== "applying";
  const reasons = formatReasonsList(state);

  return (
    <article
      aria-busy={isBusy ? "true" : undefined}
      aria-label={`Layout proposal: ${state.proposal.summary}`}
      className={styles.card}
      data-status={state.status}
    >
      <div className={styles.eyebrow}>
        <Sparkles aria-hidden="true" size={12} strokeWidth={1.5} />
        <span>{eyebrow}</span>
      </div>

      <h3 className={styles.title}>{state.proposal.summary}</h3>

      {(state.status === "idle" ||
        state.status === "applying" ||
        state.status === "applied") &&
      diff.length > 0 ? (
        <ul className={styles.diffList}>
          {diff.map((entry) => (
            <li key={`${entry.actionIndex}-${entry.widgetId}`}>{entry.summary}</li>
          ))}
        </ul>
      ) : null}

      {state.status === "rejected" && reasons.length > 0 ? (
        <ul className={styles.reasonList} role="list">
          {reasons.map((reason, index) => (
            <li key={`${index}-${reason}`}>{reason}</li>
          ))}
        </ul>
      ) : null}

      {state.status === "stale" ? (
        <p className={styles.body}>
          {state.errorMessage ??
            "The dashboard layout has changed since this was proposed. Ask the agent again to refresh."}
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className={styles.body}>
          {state.errorMessage ?? "Could not apply this change. Try again in a moment."}
        </p>
      ) : null}

      {showApply || showDismiss ? (
        <div className={styles.actions}>
          {showApply ? (
            <button
              aria-label={`Apply: ${state.proposal.summary}`}
              className={styles.applyButton}
              disabled={isBusy}
              onClick={onApply}
              type="button"
            >
              <Check aria-hidden="true" size={13} strokeWidth={1.5} />
              {state.status === "error" ? "Retry" : "Apply"}
            </button>
          ) : null}
          {showDismiss ? (
            <button
              aria-label={`Dismiss: ${state.proposal.summary}`}
              className={styles.dismissButton}
              disabled={isBusy}
              onClick={onDismiss}
              type="button"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
