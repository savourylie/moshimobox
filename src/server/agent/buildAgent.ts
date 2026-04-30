import { Agent } from "@openai/agents";
import type { Model } from "@openai/agents";
import { getOpenaiAgentModel } from "@/server/config/env";
import { researchTools } from "./tools";
import { RESEARCH_COPILOT_SYSTEM_PROMPT } from "./systemPrompt";

export interface BuildAgentOptions {
  model?: string | Model;
  instructions?: string;
}

export const buildAgent = ({ model, instructions }: BuildAgentOptions = {}): Agent => {
  return new Agent({
    name: "Moshimo Box research copilot",
    instructions: instructions ?? RESEARCH_COPILOT_SYSTEM_PROMPT,
    model: model ?? getOpenaiAgentModel(),
    tools: researchTools,
  });
};
