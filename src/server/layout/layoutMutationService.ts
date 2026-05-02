import type {
  ActionLogEntry,
  ActionProposalDiffEntry,
  ActionType,
  DashboardLayout,
  ProposalValidationIssue,
  QuadrantId,
  UIActionProposal,
  WidgetConfig,
} from "@/domain/schemas";
import { QUADRANT_IDS, UIActionProposalSchema } from "@/domain/schemas";
import { validateActionProposal } from "@/server/actions";
import {
  type ActionLogRepository,
  actionLogRepository as defaultActionLogRepository,
} from "./actionLogRepository";
import { type LayoutStore, layoutStore as defaultLayoutStore } from "./layoutStore";

export type Actor = "agent" | "user" | "system";

export interface ApplyProposalInput {
  proposal: unknown;
  basedOnVersion: number;
  actor?: Actor;
  chatTurnId?: string;
}

export interface RollbackInput {
  basedOnVersion: number;
  actor?: Actor;
  reason?: string;
}

export type ApplyProposalOutcome =
  | {
      kind: "applied";
      layout: DashboardLayout;
      version: number;
      diff: ActionProposalDiffEntry[];
      affectedWidgetIds: string[];
      summary: string;
      logEntries: ActionLogEntry[];
    }
  | {
      kind: "rejected";
      reasons: string[];
      issues: ProposalValidationIssue[];
      summary: string;
      proposalId?: string;
      logEntry?: ActionLogEntry;
    }
  | {
      kind: "stale";
      currentVersion: number;
      attemptedVersion: number;
    };

export type RollbackOutcome =
  | {
      kind: "rolled_back";
      layout: DashboardLayout;
      version: number;
      restoredFromVersion: number;
      summary: string;
      logEntry: ActionLogEntry;
    }
  | { kind: "history_empty" }
  | { kind: "stale"; currentVersion: number; attemptedVersion: number };

export interface LayoutMutationServiceDeps {
  store?: LayoutStore;
  log?: ActionLogRepository;
}

const widgetIdsForAction = (action: UIActionProposal["actions"][number]): string[] => {
  switch (action.type) {
    case "add_widget":
      return [action.widget.id];
    case "move_widget":
    case "configure_widget":
    case "remove_widget":
      return [action.widgetId];
  }
};

const widgetIdsForProposal = (proposal: UIActionProposal): string[] => {
  const seen = new Set<string>();
  for (const action of proposal.actions) {
    for (const id of widgetIdsForAction(action)) seen.add(id);
  }
  return [...seen];
};

const widgetEntries = (
  layout: DashboardLayout,
): Map<string, { quadrantId: QuadrantId; index: number; config: WidgetConfig }> => {
  const map = new Map<string, { quadrantId: QuadrantId; index: number; config: WidgetConfig }>();
  for (const quadrantId of QUADRANT_IDS) {
    layout.quadrants[quadrantId].widgets.forEach((widget, index) => {
      map.set(widget.id, { quadrantId, index, config: widget });
    });
  }
  return map;
};

const widgetsChangedBetween = (
  before: DashboardLayout,
  after: DashboardLayout,
): string[] => {
  const beforeMap = widgetEntries(before);
  const afterMap = widgetEntries(after);
  const changed = new Set<string>();
  for (const [id, info] of beforeMap) {
    const counterpart = afterMap.get(id);
    if (
      !counterpart ||
      counterpart.quadrantId !== info.quadrantId ||
      counterpart.index !== info.index ||
      JSON.stringify(counterpart.config) !== JSON.stringify(info.config)
    ) {
      changed.add(id);
    }
  }
  for (const id of afterMap.keys()) {
    if (!beforeMap.has(id)) changed.add(id);
  }
  return [...changed];
};

export const createLayoutMutationService = ({
  store = defaultLayoutStore,
  log = defaultActionLogRepository,
}: LayoutMutationServiceDeps = {}) => ({
  applyProposal(input: ApplyProposalInput): ApplyProposalOutcome {
    const actor: Actor = input.actor ?? "agent";
    const current = store.getCurrent();

    if (input.basedOnVersion !== current.version) {
      return {
        kind: "stale",
        currentVersion: current.version,
        attemptedVersion: input.basedOnVersion,
      };
    }

    const parsed = UIActionProposalSchema.safeParse(input.proposal);
    const validation = validateActionProposal(input.proposal, { layout: current });

    if (!validation.valid) {
      // We only log entries when the proposal parses cleanly. Schema-invalid
      // input is surfaced to the caller via the result but not logged, since
      // there's no meaningful actionType or proposalId to record.
      let logEntry: ActionLogEntry | undefined;
      if (parsed.success) {
        const proposal = parsed.data;
        const chatTurnId = input.chatTurnId ?? proposal.chatTurnId;
        logEntry = log.append({
          proposalId: proposal.id,
          // Convention: rejection logs record the first action's type, since
          // validation is atomic and per-action breakdown is moot for rejections.
          actionType: proposal.actions[0].type as ActionType,
          result: "rejected",
          actor,
          dashboardId: proposal.dashboardId,
          affectedWidgetIds: widgetIdsForProposal(proposal),
          summary: proposal.summary,
          reasons: validation.reasons,
          ...(chatTurnId ? { chatTurnId } : {}),
        });
      }
      return {
        kind: "rejected",
        reasons: validation.reasons,
        issues: validation.issues,
        summary: validation.summary,
        ...(validation.proposalId ? { proposalId: validation.proposalId } : {}),
        ...(logEntry ? { logEntry } : {}),
      };
    }

    // The validator's success path guarantees the proposal parses, so parsed.success is true.
    const proposal = parsed.success ? parsed.data : undefined;
    const chatTurnId = input.chatTurnId ?? proposal?.chatTurnId;

    // Validator's previewLayout has the input layout's version; bump it on commit.
    const nextLayout: DashboardLayout = {
      ...validation.previewLayout,
      version: current.version + 1,
    };
    store.commit(nextLayout, { proposalId: validation.proposalId });

    const logEntries: ActionLogEntry[] = validation.diff.map((entry) =>
      log.append({
        proposalId: validation.proposalId,
        actionType: entry.actionType,
        result: "applied",
        actor,
        dashboardId: validation.dashboardId,
        affectedWidgetIds: [entry.widgetId],
        summary: entry.summary,
        reasons: [],
        ...(chatTurnId ? { chatTurnId } : {}),
      }),
    );

    return {
      kind: "applied",
      layout: nextLayout,
      version: nextLayout.version,
      diff: validation.diff,
      affectedWidgetIds: validation.affectedWidgetIds,
      summary: validation.summary,
      logEntries,
    };
  },

  rollback(input: RollbackInput): RollbackOutcome {
    const actor: Actor = input.actor ?? "user";
    const current = store.getCurrent();

    if (input.basedOnVersion !== current.version) {
      return {
        kind: "stale",
        currentVersion: current.version,
        attemptedVersion: input.basedOnVersion,
      };
    }

    const result = store.rollback();
    if (!result) {
      return { kind: "history_empty" };
    }

    const affectedWidgetIds = widgetsChangedBetween(result.replaced, result.restored);
    const summary = `Rolled back to version ${result.restored.version}`;

    const logEntry = log.append({
      // Convention: rollback uses move_widget as the closest semantic action
      // type; consumers should distinguish via summary/reasons.
      actionType: "move_widget",
      result: "applied",
      actor,
      dashboardId: result.restored.id,
      affectedWidgetIds,
      summary,
      reasons: input.reason ? [input.reason] : [],
      ...(result.replacedEntry.proposalId
        ? { proposalId: result.replacedEntry.proposalId }
        : {}),
    });

    return {
      kind: "rolled_back",
      layout: result.restored,
      version: result.restored.version,
      restoredFromVersion: result.replaced.version,
      summary,
      logEntry,
    };
  },
});

export type LayoutMutationService = ReturnType<typeof createLayoutMutationService>;

export const layoutMutationService: LayoutMutationService = createLayoutMutationService();
