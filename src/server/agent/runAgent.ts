import {
  assistant as assistantMessage,
  user as userMessage,
  run as runAgentRun,
  type AgentInputItem,
  type RunItem,
} from "@openai/agents";
import type { Agent, Model } from "@openai/agents";
import { ApiError } from "@/server/api/errors";
import { getOpenaiApiKey } from "@/server/config/env";
import { buildAgent } from "./buildAgent";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  text: string;
}

export interface ToolInvocation {
  name: string;
  arguments: unknown;
  output: unknown;
}

export interface RunAgentInput {
  message: string;
  history?: readonly ChatHistoryItem[];
}

export interface RunAgentResult {
  text: string;
  toolInvocations: ToolInvocation[];
}

export interface RunAgentOptions {
  agent?: Agent;
  model?: string | Model;
  requireApiKey?: boolean;
}

const buildInput = (input: RunAgentInput): AgentInputItem[] => {
  const items: AgentInputItem[] = [];
  for (const entry of input.history ?? []) {
    if (entry.role === "user") {
      items.push(userMessage(entry.text));
    } else {
      items.push(assistantMessage(entry.text));
    }
  }
  items.push(userMessage(input.message));
  return items;
};

const parseJsonArguments = (raw: string): unknown => {
  if (raw === "") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const extractToolInvocations = (newItems: RunItem[]): ToolInvocation[] => {
  const calls = new Map<string, { name: string; arguments: unknown }>();
  const invocations: ToolInvocation[] = [];

  for (const item of newItems) {
    if (item.type === "tool_call_item" && item.rawItem.type === "function_call") {
      calls.set(item.rawItem.callId, {
        name: item.rawItem.name,
        arguments: parseJsonArguments(item.rawItem.arguments),
      });
    }
  }

  for (const item of newItems) {
    if (
      item.type === "tool_call_output_item" &&
      item.rawItem.type === "function_call_result"
    ) {
      const call = calls.get(item.rawItem.callId);
      const output = item.output;
      invocations.push({
        name: call?.name ?? item.rawItem.name,
        arguments: call?.arguments ?? null,
        output,
      });
    }
  }

  return invocations;
};

const extractText = (newItems: RunItem[], finalOutput: unknown): string => {
  if (typeof finalOutput === "string" && finalOutput.length > 0) {
    return finalOutput;
  }
  for (let i = newItems.length - 1; i >= 0; i--) {
    const item = newItems[i];
    if (item.type !== "message_output_item") continue;
    const raw = item.rawItem;
    if (raw.role !== "assistant") continue;
    const text = raw.content
      .map((entry) => {
        if (entry.type === "output_text") return entry.text;
        if (entry.type === "refusal") return entry.refusal;
        return "";
      })
      .filter((value) => value.length > 0)
      .join("\n");
    if (text.length > 0) return text;
  }
  return "";
};

export const runResearchAgent = async (
  input: RunAgentInput,
  options: RunAgentOptions = {},
): Promise<RunAgentResult> => {
  const requireApiKey = options.requireApiKey ?? true;
  if (requireApiKey && !options.agent && !options.model && !getOpenaiApiKey()) {
    throw new ApiError(
      "provider_error",
      "The research agent is unavailable because OPENAI_API_KEY is not set.",
    );
  }

  const agent =
    options.agent ?? buildAgent(options.model ? { model: options.model } : {});
  const items = buildInput(input);

  const result = await runAgentRun(agent, items);

  const text = extractText(result.newItems, result.finalOutput);
  if (text.length === 0) {
    throw new ApiError(
      "unexpected_error",
      "The research agent returned an empty response.",
    );
  }

  return {
    text,
    toolInvocations: extractToolInvocations(result.newItems),
  };
};
