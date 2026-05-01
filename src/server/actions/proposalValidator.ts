import type {
  ActionProposalDiffEntry,
  ActionProposalValidationResult,
  DashboardLayout,
  LayoutAction,
  ProposalValidationIssue,
  ProposalValidationIssueCode,
  QuadrantId,
  UIActionProposal,
  WidgetConfig,
  WidgetSnapshot,
  WidgetTarget,
} from "@/domain/schemas";
import {
  DashboardLayoutSchema,
  QUADRANT_IDS,
  UIActionProposalSchema,
  WidgetConfigSchema,
} from "@/domain/schemas";
import { DEFAULT_DASHBOARD_LAYOUT, getSeedIndicator } from "@/domain/seeds";

export const QUADRANT_WIDGET_LIMITS = {
  min: 2,
  max: 4,
} as const;

export interface ValidateActionProposalOptions {
  layout?: DashboardLayout;
}

interface ActionApplication {
  diff: ActionProposalDiffEntry;
  issues: ProposalValidationIssue[];
}

const clone = <T>(value: T): T => structuredClone(value);

const formatPath = (path: readonly (string | number | symbol)[]): string =>
  path.length > 0 ? path.map(String).join(".") : "(root)";

const issueFromZod = (
  code: ProposalValidationIssueCode,
  issues: { path: readonly (string | number | symbol)[]; message: string }[],
): ProposalValidationIssue[] =>
  issues.map((issue) => {
    const path = formatPath(issue.path);
    return {
      code,
      message: `${path}: ${issue.message}`,
      path,
    };
  });

const unique = <T>(values: readonly T[]): T[] => Array.from(new Set(values));

const reject = (
  issues: ProposalValidationIssue[],
  options: {
    proposal?: UIActionProposal;
    dashboardId?: DashboardLayout["id"];
  } = {},
): ActionProposalValidationResult => ({
  valid: false,
  ...(options.proposal ? { proposalId: options.proposal.id } : {}),
  ...(options.dashboardId ? { dashboardId: options.dashboardId } : {}),
  summary: "Action proposal was rejected. No dashboard layout changes were produced.",
  affectedWidgetIds: [],
  diff: [],
  reasons: unique(issues.map((issue) => issue.message)),
  issues,
});

const makeSnapshot = (
  layout: DashboardLayout,
  quadrantId: QuadrantId,
  index: number,
): WidgetSnapshot => ({
  quadrantId,
  index,
  widget: clone(layout.quadrants[quadrantId].widgets[index]),
});

const findWidget = (layout: DashboardLayout, widgetId: string): WidgetSnapshot | undefined => {
  for (const quadrantId of QUADRANT_IDS) {
    const index = layout.quadrants[quadrantId].widgets.findIndex(
      (widget) => widget.id === widgetId,
    );
    if (index >= 0) {
      return makeSnapshot(layout, quadrantId, index);
    }
  }
  return undefined;
};

const indicatorIdsForWidget = (widget: WidgetConfig): string[] => {
  if (widget.type === "comparison_chart") return widget.indicatorIds;
  return [widget.indicatorId];
};

const validateWidgetIndicators = (
  widget: WidgetConfig,
  quadrantId: QuadrantId,
  actionIndex: number,
): ProposalValidationIssue[] => {
  const issues: ProposalValidationIssue[] = [];
  const indicatorIds = indicatorIdsForWidget(widget);

  if (widget.type === "comparison_chart") {
    const uniqueIndicatorIds = new Set(indicatorIds);
    if (uniqueIndicatorIds.size !== indicatorIds.length) {
      issues.push({
        code: "indicator_not_unique",
        actionIndex,
        widgetId: widget.id,
        quadrantId,
        message: `Widget ${widget.id} repeats an indicator id. Comparison charts require unique indicators.`,
      });
    }
  }

  for (const indicatorId of indicatorIds) {
    const seed = getSeedIndicator(indicatorId);
    if (!seed) {
      issues.push({
        code: "indicator_not_found",
        actionIndex,
        widgetId: widget.id,
        indicatorId,
        quadrantId,
        message: `Indicator ${indicatorId} referenced by widget ${widget.id} was not found in the MVP catalog.`,
      });
      continue;
    }

    if (seed.metadata.quadrantId !== quadrantId) {
      issues.push({
        code: "indicator_quadrant_mismatch",
        actionIndex,
        widgetId: widget.id,
        indicatorId,
        quadrantId,
        message: `Indicator ${indicatorId} belongs to ${seed.metadata.quadrantId}, so widget ${widget.id} cannot be placed in ${quadrantId}.`,
      });
    }
  }

  return issues;
};

const resolveInsertIndex = (
  layout: DashboardLayout,
  target: WidgetTarget,
  actionIndex: number,
  path: string,
): { index: number; issues: ProposalValidationIssue[] } => {
  const widgets = layout.quadrants[target.quadrantId].widgets;
  const index = target.index ?? widgets.length;
  if (index > widgets.length) {
    return {
      index,
      issues: [
        {
          code: "invalid_target",
          actionIndex,
          quadrantId: target.quadrantId,
          path,
          message: `Target index ${index} is outside ${target.quadrantId}; valid insert positions are 0 through ${widgets.length}.`,
        },
      ],
    };
  }

  return { index, issues: [] };
};

const validateMoveOrigin = (
  action: Extract<LayoutAction, { type: "move_widget" }>,
  current: WidgetSnapshot,
  actionIndex: number,
): ProposalValidationIssue[] => {
  const issues: ProposalValidationIssue[] = [];

  if (action.from.quadrantId !== current.quadrantId) {
    issues.push({
      code: "invalid_target",
      actionIndex,
      widgetId: action.widgetId,
      quadrantId: action.from.quadrantId,
      path: `actions.${actionIndex}.from.quadrantId`,
      message: `Widget ${action.widgetId} is in ${current.quadrantId}, not ${action.from.quadrantId}.`,
    });
  }

  if (action.from.index !== undefined && action.from.index !== current.index) {
    issues.push({
      code: "invalid_target",
      actionIndex,
      widgetId: action.widgetId,
      quadrantId: action.from.quadrantId,
      path: `actions.${actionIndex}.from.index`,
      message: `Widget ${action.widgetId} is at index ${current.index}, not index ${action.from.index}.`,
    });
  }

  return issues;
};

const validateQuadrantCounts = (
  layout: DashboardLayout,
  actionIndex: number,
): ProposalValidationIssue[] => {
  const issues: ProposalValidationIssue[] = [];

  for (const quadrantId of QUADRANT_IDS) {
    const count = layout.quadrants[quadrantId].widgets.length;
    if (count < QUADRANT_WIDGET_LIMITS.min || count > QUADRANT_WIDGET_LIMITS.max) {
      issues.push({
        code: "quadrant_limit_exceeded",
        actionIndex,
        quadrantId,
        message: `${layout.quadrants[quadrantId].label} would have ${count} widgets; allowed range is ${QUADRANT_WIDGET_LIMITS.min} to ${QUADRANT_WIDGET_LIMITS.max}.`,
      });
    }
  }

  return issues;
};

const validateLayoutCompatibility = (layout: DashboardLayout): ProposalValidationIssue[] => {
  const parsed = DashboardLayoutSchema.safeParse(layout);
  if (parsed.success) return [];
  return issueFromZod("layout_incompatible", parsed.error.issues);
};

const addWidget = (
  layout: DashboardLayout,
  action: Extract<LayoutAction, { type: "add_widget" }>,
  actionIndex: number,
): ActionApplication => {
  if (findWidget(layout, action.widget.id)) {
    return {
      diff: {} as ActionProposalDiffEntry,
      issues: [
        {
          code: "widget_already_exists",
          actionIndex,
          widgetId: action.widget.id,
          message: `Widget ${action.widget.id} already exists in the current layout.`,
        },
      ],
    };
  }

  const indicatorIssues = validateWidgetIndicators(
    action.widget,
    action.target.quadrantId,
    actionIndex,
  );
  if (indicatorIssues.length > 0) {
    return { diff: {} as ActionProposalDiffEntry, issues: indicatorIssues };
  }

  const target = resolveInsertIndex(
    layout,
    action.target,
    actionIndex,
    `actions.${actionIndex}.target.index`,
  );
  if (target.issues.length > 0) {
    return { diff: {} as ActionProposalDiffEntry, issues: target.issues };
  }

  layout.quadrants[action.target.quadrantId].widgets.splice(target.index, 0, clone(action.widget));
  const after = makeSnapshot(layout, action.target.quadrantId, target.index);

  return {
    issues: [],
    diff: {
      actionIndex,
      actionType: action.type,
      widgetId: action.widget.id,
      title: action.widget.title,
      before: null,
      after,
      summary: `Add ${action.widget.title} to ${layout.quadrants[action.target.quadrantId].label}.`,
    },
  };
};

const moveWidget = (
  layout: DashboardLayout,
  action: Extract<LayoutAction, { type: "move_widget" }>,
  actionIndex: number,
): ActionApplication => {
  const current = findWidget(layout, action.widgetId);
  if (!current) {
    return {
      diff: {} as ActionProposalDiffEntry,
      issues: [
        {
          code: "widget_not_found",
          actionIndex,
          widgetId: action.widgetId,
          message: `Widget ${action.widgetId} was not found in the current layout.`,
        },
      ],
    };
  }

  const originIssues = validateMoveOrigin(action, current, actionIndex);
  if (originIssues.length > 0) {
    return { diff: {} as ActionProposalDiffEntry, issues: originIssues };
  }

  const sourceWidgets = layout.quadrants[current.quadrantId].widgets;
  const [widget] = sourceWidgets.splice(current.index, 1);
  const indicatorIssues = validateWidgetIndicators(widget, action.to.quadrantId, actionIndex);
  if (indicatorIssues.length > 0) {
    sourceWidgets.splice(current.index, 0, widget);
    return { diff: {} as ActionProposalDiffEntry, issues: indicatorIssues };
  }

  const target = resolveInsertIndex(
    layout,
    action.to,
    actionIndex,
    `actions.${actionIndex}.to.index`,
  );
  if (target.issues.length > 0) {
    sourceWidgets.splice(current.index, 0, widget);
    return { diff: {} as ActionProposalDiffEntry, issues: target.issues };
  }

  layout.quadrants[action.to.quadrantId].widgets.splice(target.index, 0, widget);
  const after = makeSnapshot(layout, action.to.quadrantId, target.index);

  return {
    issues: [],
    diff: {
      actionIndex,
      actionType: action.type,
      widgetId: action.widgetId,
      title: widget.title,
      before: current,
      after,
      summary: `Move ${widget.title} from ${layout.quadrants[current.quadrantId].label} to ${layout.quadrants[action.to.quadrantId].label}.`,
    },
  };
};

const configureWidget = (
  layout: DashboardLayout,
  action: Extract<LayoutAction, { type: "configure_widget" }>,
  actionIndex: number,
): ActionApplication => {
  const current = findWidget(layout, action.widgetId);
  if (!current) {
    return {
      diff: {} as ActionProposalDiffEntry,
      issues: [
        {
          code: "widget_not_found",
          actionIndex,
          widgetId: action.widgetId,
          message: `Widget ${action.widgetId} was not found in the current layout.`,
        },
      ],
    };
  }

  const updated = {
    ...current.widget,
    ...action.patch,
  };
  const parsed = WidgetConfigSchema.safeParse(updated);
  if (!parsed.success) {
    return {
      diff: {} as ActionProposalDiffEntry,
      issues: issueFromZod("invalid_widget_config", parsed.error.issues).map((issue) => ({
        ...issue,
        actionIndex,
        widgetId: action.widgetId,
      })),
    };
  }

  const indicatorIssues = validateWidgetIndicators(parsed.data, current.quadrantId, actionIndex);
  if (indicatorIssues.length > 0) {
    return { diff: {} as ActionProposalDiffEntry, issues: indicatorIssues };
  }

  layout.quadrants[current.quadrantId].widgets[current.index] = parsed.data;
  const after = makeSnapshot(layout, current.quadrantId, current.index);

  return {
    issues: [],
    diff: {
      actionIndex,
      actionType: action.type,
      widgetId: action.widgetId,
      title: parsed.data.title,
      before: current,
      after,
      summary: `Update ${parsed.data.title} configuration.`,
    },
  };
};

const removeWidget = (
  layout: DashboardLayout,
  action: Extract<LayoutAction, { type: "remove_widget" }>,
  actionIndex: number,
): ActionApplication => {
  const current = findWidget(layout, action.widgetId);
  if (!current) {
    return {
      diff: {} as ActionProposalDiffEntry,
      issues: [
        {
          code: "widget_not_found",
          actionIndex,
          widgetId: action.widgetId,
          message: `Widget ${action.widgetId} was not found in the current layout.`,
        },
      ],
    };
  }

  layout.quadrants[current.quadrantId].widgets.splice(current.index, 1);

  return {
    issues: [],
    diff: {
      actionIndex,
      actionType: action.type,
      widgetId: action.widgetId,
      title: current.widget.title,
      before: current,
      after: null,
      summary: `Remove ${current.widget.title} from ${layout.quadrants[current.quadrantId].label}.`,
    },
  };
};

const applyAction = (
  layout: DashboardLayout,
  action: LayoutAction,
  actionIndex: number,
): ActionApplication => {
  switch (action.type) {
    case "add_widget":
      return addWidget(layout, action, actionIndex);
    case "move_widget":
      return moveWidget(layout, action, actionIndex);
    case "configure_widget":
      return configureWidget(layout, action, actionIndex);
    case "remove_widget":
      return removeWidget(layout, action, actionIndex);
  }
};

const validationSummary = (diff: readonly ActionProposalDiffEntry[]): string => {
  if (diff.length === 1) return diff[0].summary;
  return `${diff.length} dashboard changes validated: ${diff
    .map((entry) => entry.summary)
    .join(" ")}`;
};

export const validateActionProposal = (
  proposalInput: unknown,
  options: ValidateActionProposalOptions = {},
): ActionProposalValidationResult => {
  const layoutInput = options.layout ?? DEFAULT_DASHBOARD_LAYOUT;
  const parsedLayout = DashboardLayoutSchema.safeParse(layoutInput);
  if (!parsedLayout.success) {
    return reject(issueFromZod("layout_schema_invalid", parsedLayout.error.issues));
  }

  const parsedProposal = UIActionProposalSchema.safeParse(proposalInput);
  if (!parsedProposal.success) {
    return reject(issueFromZod("proposal_schema_invalid", parsedProposal.error.issues), {
      dashboardId: parsedLayout.data.id,
    });
  }

  const proposal = parsedProposal.data;
  if (proposal.dashboardId !== parsedLayout.data.id) {
    return reject(
      [
        {
          code: "dashboard_mismatch",
          message: `Proposal ${proposal.id} targets dashboard ${proposal.dashboardId}, but the current layout is ${parsedLayout.data.id}.`,
        },
      ],
      { proposal, dashboardId: parsedLayout.data.id },
    );
  }

  const previewLayout = clone(parsedLayout.data);
  const diff: ActionProposalDiffEntry[] = [];

  for (const [actionIndex, action] of proposal.actions.entries()) {
    const result = applyAction(previewLayout, action, actionIndex);
    if (result.issues.length > 0) {
      return reject(result.issues, { proposal, dashboardId: parsedLayout.data.id });
    }

    const countIssues = validateQuadrantCounts(previewLayout, actionIndex);
    if (countIssues.length > 0) {
      return reject(countIssues, { proposal, dashboardId: parsedLayout.data.id });
    }

    const compatibilityIssues = validateLayoutCompatibility(previewLayout);
    if (compatibilityIssues.length > 0) {
      return reject(compatibilityIssues, { proposal, dashboardId: parsedLayout.data.id });
    }

    diff.push(result.diff);
  }

  return {
    valid: true,
    proposalId: proposal.id,
    dashboardId: proposal.dashboardId,
    summary: validationSummary(diff),
    affectedWidgetIds: unique(diff.map((entry) => entry.widgetId)),
    diff,
    previewLayout,
    reasons: [],
    issues: [],
  };
};
