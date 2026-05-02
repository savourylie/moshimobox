import { randomUUID } from "node:crypto";
import { tool } from "@openai/agents";
import { z } from "zod";
import {
  LayoutActionSchema,
  type ActionProposalValidationResult,
  type UIActionProposal,
} from "@/domain/schemas";
import { validateActionProposal } from "@/server/actions";
import { layoutStore } from "@/server/layout";
import { toolErrorMessage } from "./errorMessage";

const ParamsSchema = z
  .object({
    summary: z
      .string()
      .trim()
      .min(1)
      .describe(
        "Short, sentence-case description of the proposed change. Example: 'Add US CPI vs Eurozone HICP comparison to Inflation.'",
      ),
    actions: z
      .array(LayoutActionSchema)
      .min(1)
      .describe(
        "One or more layout actions: add_widget, move_widget, configure_widget, or remove_widget. Use existing widget ids for move/configure/remove.",
      ),
  })
  .strict();

export type ProposeLayoutChangeInput = z.infer<typeof ParamsSchema>;

export interface ProposeLayoutChangeOutput {
  proposal: UIActionProposal;
  validation: ActionProposalValidationResult;
  basedOnVersion: number;
}

export const proposeLayoutChangeHandler = async (
  input: ProposeLayoutChangeInput,
): Promise<ProposeLayoutChangeOutput> => {
  const layout = layoutStore.getCurrent();
  const proposal: UIActionProposal = {
    id: `proposal-${randomUUID()}`,
    summary: input.summary,
    proposedBy: "agent",
    proposedAt: new Date().toISOString(),
    dashboardId: layout.id,
    actions: input.actions,
  };
  const validation = validateActionProposal(proposal, { layout });
  return { proposal, validation, basedOnVersion: layout.version };
};

export const proposeLayoutChangeTool = tool({
  name: "propose_layout_change",
  description:
    "Propose a dashboard layout change for the user to review. The user reviews and decides whether to apply; you cannot apply changes directly. Use only when the user explicitly asks to add, remove, move, or reconfigure a widget. Returns a validation result describing whether the change is allowed; if invalid, decide whether to retry once with a fix or explain the limitation in plain language.",
  parameters: ParamsSchema,
  errorFunction: (_ctx, error) => toolErrorMessage(error),
  execute: proposeLayoutChangeHandler,
});
