import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  Usage,
  type AgentOutputItem,
  type Model,
  type ModelRequest,
  type ModelResponse,
  type StreamEvent,
} from "@openai/agents";
import { buildAgent } from "./buildAgent";
import { runResearchAgent } from "./runAgent";

class FakeModel implements Model {
  name = "fake";
  public requests: ModelRequest[] = [];
  private readonly script: ModelResponse[];

  constructor(script: ModelResponse[]) {
    this.script = [...script];
  }

  async getResponse(request: ModelRequest): Promise<ModelResponse> {
    this.requests.push(request);
    const next = this.script.shift();
    if (!next) throw new Error("FakeModel: no more scripted responses");
    return next;
  }

  getStreamedResponse(): AsyncIterable<StreamEvent> {
    throw new Error("FakeModel does not support streaming");
  }
}

const emptyUsage = (): Usage =>
  new Usage({ input_tokens: 0, output_tokens: 0, total_tokens: 0 });

const functionCallTurn = (
  callId: string,
  name: string,
  args: Record<string, unknown>,
): ModelResponse => ({
  usage: emptyUsage(),
  output: [
    {
      type: "function_call",
      callId,
      name,
      arguments: JSON.stringify(args),
      status: "completed",
    } satisfies AgentOutputItem,
  ],
});

const assistantTextTurn = (text: string): ModelResponse => ({
  usage: emptyUsage(),
  output: [
    {
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text }],
    } satisfies AgentOutputItem,
  ],
});

describe("runResearchAgent (FakeModel)", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = "";
    vi.restoreAllMocks();
  });

  it("invokes the search_indicators tool and returns the assistant's final text", async () => {
    const fake = new FakeModel([
      functionCallTurn("call-1", "search_indicators", { q: "CPI" }),
      assistantTextTurn(
        "US headline CPI is the FRED CPIAUCSL series. Use search_indicators with quadrant 'inflation' for similar indicators. (as of Mar 2026)",
      ),
    ]);
    const agent = buildAgent({ model: fake });

    const result = await runResearchAgent(
      { message: "Find CPI indicators." },
      { agent, requireApiKey: false },
    );

    expect(result.text).toContain("CPI");
    expect(result.text).toMatch(/Mar 2026/);
    expect(result.toolInvocations.length).toBe(1);
    expect(result.toolInvocations[0].name).toBe("search_indicators");
    expect(result.toolInvocations[0].arguments).toEqual({ q: "CPI" });
    expect(result.toolInvocations[0].output).toBeDefined();

    const firstRequest = fake.requests[0];
    expect(firstRequest.systemInstructions).toContain("research copilot");
  });

  it("recovers from a tool error by surfacing errorFunction text to the model", async () => {
    const fake = new FakeModel([
      functionCallTurn("call-2", "get_widget_data", { widgetId: "widget.unknown" }),
      assistantTextTurn(
        "I could not find that widget. The dashboard does not currently include widget.unknown.",
      ),
    ]);
    const agent = buildAgent({ model: fake });

    const result = await runResearchAgent(
      { message: "Get the unknown widget." },
      { agent, requireApiKey: false },
    );

    expect(result.text).toContain("could not find");
    expect(result.toolInvocations.length).toBe(1);
    expect(result.toolInvocations[0].name).toBe("get_widget_data");
    expect(typeof result.toolInvocations[0].output).toBe("string");
    expect(result.toolInvocations[0].output as string).toMatch(/widget_not_found/);
  });

  it("handles a no-result search by passing the calm message to the model", async () => {
    const fake = new FakeModel([
      functionCallTurn("call-3", "search_indicators", { q: "definitely-not-an-indicator-xyz" }),
      assistantTextTurn(
        "No indicators match that query in the catalog. Consider 'CPI' or 'unemployment'.",
      ),
    ]);
    const agent = buildAgent({ model: fake });

    const result = await runResearchAgent(
      { message: "Search for something that does not exist." },
      { agent, requireApiKey: false },
    );

    expect(result.text).toContain("No indicators");
    expect(result.toolInvocations.length).toBe(1);
    const output = result.toolInvocations[0].output;
    expect(output).toBeDefined();
    expect(JSON.stringify(output)).toContain("No indicators");
  });

  it("threads conversation history into the model request", async () => {
    const fake = new FakeModel([
      assistantTextTurn("Headline CPI is computed monthly by the BLS, sourced from FRED."),
    ]);
    const agent = buildAgent({ model: fake });

    await runResearchAgent(
      {
        message: "What is its release schedule?",
        history: [
          { role: "user", text: "What is CPI?" },
          { role: "assistant", text: "CPI is the consumer price index." },
        ],
      },
      { agent, requireApiKey: false },
    );

    const firstRequest = fake.requests[0];
    expect(Array.isArray(firstRequest.input)).toBe(true);
    const inputs = firstRequest.input as Array<{ role?: string }>;
    expect(inputs.length).toBe(3);
    expect(inputs[0].role).toBe("user");
    expect(inputs[1].role).toBe("assistant");
    expect(inputs[2].role).toBe("user");
  });

  it("throws provider_error when OPENAI_API_KEY is missing", async () => {
    process.env.OPENAI_API_KEY = "";
    await expect(runResearchAgent({ message: "hi" })).rejects.toMatchObject({
      code: "provider_error",
    });
  });
});
