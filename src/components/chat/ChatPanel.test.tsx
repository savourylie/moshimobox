import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardLayout } from "@/domain/schemas";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";
import { LayoutProvider } from "@/components/layout/LayoutProvider";
import { ChatPanel } from "./ChatPanel";

const renderPanel = () => {
  const onClose = vi.fn();
  const utils = render(
    <LayoutProvider initialLayout={DEFAULT_DASHBOARD_LAYOUT}>
      <ChatPanel onClose={onClose} />
    </LayoutProvider>,
  );
  const textarea = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
  const sendButton = screen.getByRole("button", { name: "Send message" });
  const list = screen.getByTestId("chat-message-list");
  return { ...utils, onClose, textarea, sendButton, list };
};

const mockFetch = (impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(impl as typeof fetch);

const jsonResponse = (body: unknown, init: { status?: number } = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });

const baseProposal = () => ({
  id: "proposal-1",
  summary: "Add Breakeven extra to Inflation",
  proposedBy: "agent" as const,
  proposedAt: "2026-05-02T10:00:00.000Z",
  dashboardId: "main" as const,
  actions: [
    {
      type: "add_widget" as const,
      target: { quadrantId: "inflation" as const },
      widget: {
        id: "widget.line.us_5y_breakeven_extra",
        type: "line_chart" as const,
        title: "Breakeven extra",
        description: "Additional view of 5-year breakeven inflation.",
        indicatorId: "us_5y_breakeven_inflation",
        transform: "level" as const,
      },
    },
  ],
});

const baseDiffEntry = () => ({
  actionIndex: 0,
  actionType: "add_widget" as const,
  widgetId: "widget.line.us_5y_breakeven_extra",
  title: "Breakeven extra",
  before: null,
  after: {
    quadrantId: "inflation" as const,
    index: 3,
    widget: {
      id: "widget.line.us_5y_breakeven_extra",
      type: "line_chart" as const,
      title: "Breakeven extra",
      description: "Additional view.",
      indicatorId: "us_5y_breakeven_inflation",
      transform: "level" as const,
    },
  },
  summary: "Add Breakeven extra to Inflation.",
});

const validValidation = () => ({
  valid: true as const,
  proposalId: "proposal-1",
  dashboardId: "main" as const,
  summary: "Add Breakeven extra to Inflation.",
  affectedWidgetIds: ["widget.line.us_5y_breakeven_extra"],
  diff: [baseDiffEntry()],
  previewLayout: DEFAULT_DASHBOARD_LAYOUT,
  reasons: [] as string[],
  issues: [] as never[],
});

const chatResponseWithProposal = () => ({
  text: "I propose adding a second breakeven view.",
  toolInvocations: [],
  proposal: {
    proposal: baseProposal(),
    validation: validValidation(),
    basedOnVersion: 1,
  },
  requestId: "rid",
});

const chatResponseNoProposal = (text = "Sample reply.") => ({
  text,
  toolInvocations: [],
  requestId: "rid",
});

describe("ChatPanel", () => {
  beforeEach(() => {
    mockFetch(async () => jsonResponse(chatResponseNoProposal()));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the onboarding copy explaining data lookup, comparison, and layout actions", () => {
    renderPanel();
    const log = screen.getByRole("log");
    const text = log.textContent ?? "";
    expect(text).toMatch(/macro indicators/i);
    expect(text).toMatch(/compare series/i);
    expect(text).toMatch(/rearrange your dashboard/i);
  });

  it("disables the send button when the draft is empty", () => {
    const { sendButton } = renderPanel();
    expect(sendButton).toBeDisabled();
    expect(sendButton).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the send button disabled for whitespace-only input", () => {
    const { textarea, sendButton } = renderPanel();
    fireEvent.change(textarea, { target: { value: "   \n  \t  " } });
    expect(sendButton).toBeDisabled();
    expect(sendButton).toHaveAttribute("aria-disabled", "true");
  });

  it("appends a user message and clears the textarea when Enter is pressed", async () => {
    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "Is US inflation up?" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(within(list).getByText("Is US inflation up?")).toBeInTheDocument();
    expect(textarea.value).toBe("");
    expect(textarea).toHaveFocus();

    await waitFor(() => {
      expect(within(list).getByText("Sample reply.")).toBeInTheDocument();
    });
  });

  it("does not send when Shift + Enter is pressed", () => {
    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "draft text" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(within(list).queryByText("draft text")).toBeNull();
  });

  it("does not send when the IME is composing", () => {
    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "ㄓㄨㄥ" } });
    fireEvent.keyDown(textarea, { key: "Enter", keyCode: 229 });
    expect(within(list).queryByText("ㄓㄨㄥ")).toBeNull();
  });

  it("sends when the Send button is clicked", async () => {
    const { textarea, sendButton, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "compare US and EU CPI" } });
    expect(sendButton).not.toBeDisabled();
    fireEvent.click(sendButton);
    expect(within(list).getByText("compare US and EU CPI")).toBeInTheDocument();
    expect(textarea.value).toBe("");
    await waitFor(() => {
      expect(within(list).getByText("Sample reply.")).toBeInTheDocument();
    });
  });

  it("calls onClose when the close button is clicked", () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Close chat panel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("scrolls the message list to the bottom after sending", async () => {
    const { textarea, list } = renderPanel();
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 1234 });
    list.scrollTop = 0;

    fireEvent.change(textarea, { target: { value: "next message" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(list.scrollTop).toBe(1234);

    await waitFor(() => {
      expect(within(list).getByText("Sample reply.")).toBeInTheDocument();
    });
  });

  it("trims whitespace from sent messages", async () => {
    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "  hello  " } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(within(list).getByText("hello")).toBeInTheDocument();
    await waitFor(() => {
      expect(within(list).getByText("Sample reply.")).toBeInTheDocument();
    });
  });

  it("shows a pending placeholder while the agent responds", async () => {
    let resolve: ((value: Response) => void) | undefined;
    mockFetch(
      () =>
        new Promise<Response>((resolveFetch) => {
          resolve = resolveFetch;
        }),
    );

    const { textarea, list, sendButton } = renderPanel();
    fireEvent.change(textarea, { target: { value: "what about M2?" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(within(list).getByText("what about M2?")).toBeInTheDocument();
    expect(within(list).getByText(/Looking that up/i)).toBeInTheDocument();
    expect(sendButton).toBeDisabled();

    resolve?.(jsonResponse(chatResponseNoProposal("M2 is the broad money supply.")));

    await waitFor(() => {
      expect(within(list).getByText("M2 is the broad money supply.")).toBeInTheDocument();
    });
    expect(within(list).queryByText(/Looking that up/i)).toBeNull();
  });

  it("shows a calm fallback message when the agent endpoint fails", async () => {
    mockFetch(async () =>
      jsonResponse(
        {
          error: {
            code: "provider_error",
            message: "Upstream is down. Try again in a moment.",
          },
          requestId: "rid-1",
        },
        { status: 502 },
      ),
    );

    const { textarea, list, sendButton } = renderPanel();
    fireEvent.change(textarea, { target: { value: "what is CPI?" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(within(list).getByText(/Upstream is down/i)).toBeInTheDocument();
    });
    expect(within(list).queryByText(/Looking that up/i)).toBeNull();
    expect(sendButton).toBeDisabled();
  });

  it("forwards prior user and assistant messages as history", async () => {
    const fetchMock = mockFetch(async () => jsonResponse(chatResponseNoProposal("Reply.")));

    const { textarea } = renderPanel();
    fireEvent.change(textarea, { target: { value: "first" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByText("Reply.")).toBeInTheDocument();
    });

    fetchMock.mockClear();
    fireEvent.change(textarea, { target: { value: "second" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const lastCall = fetchMock.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const init = lastCall![1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      message: string;
      history: { role: string; text: string }[];
    };
    expect(body.message).toBe("second");
    expect(body.history).toEqual([
      { role: "user", text: "first" },
      { role: "assistant", text: "Reply." },
    ]);
  });

  it("renders a proposal card when the chat response includes a proposal", async () => {
    mockFetch(async () => jsonResponse(chatResponseWithProposal()));
    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "Add a breakeven chart." } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(within(list).getByText(/Proposed action · Inflation/i)).toBeInTheDocument();
    });
    expect(within(list).getByText("Add Breakeven extra to Inflation")).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: /Apply: /i })).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: /Dismiss: /i })).toBeInTheDocument();
  });

  it("applies a proposal and updates the layout context on success", async () => {
    const nextLayout: DashboardLayout = {
      ...DEFAULT_DASHBOARD_LAYOUT,
      version: 2,
    };
    const fetchMock = mockFetch(async (input) => {
      const url = input.toString();
      if (url === "/api/chat") return jsonResponse(chatResponseWithProposal());
      if (url === "/api/layout/proposals/apply") {
        return jsonResponse({
          valid: true,
          layout: nextLayout,
          version: 2,
          diff: [baseDiffEntry()],
          affectedWidgetIds: ["widget.line.us_5y_breakeven_extra"],
          summary: "Add Breakeven extra to Inflation.",
          logEntries: [],
          requestId: "rid-apply",
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });

    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "Add a breakeven chart." } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const apply = await within(list).findByRole("button", { name: /Apply: /i });
    fireEvent.click(apply);

    await waitFor(() => {
      expect(within(list).getByText(/Applied · Inflation/i)).toBeInTheDocument();
    });
    expect(within(list).queryByRole("button", { name: /Apply: /i })).toBeNull();

    const applyCall = fetchMock.mock.calls.find(
      (call) => call[0]?.toString() === "/api/layout/proposals/apply",
    );
    expect(applyCall).toBeDefined();
    const init = applyCall![1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      basedOnVersion: number;
      actor: string;
      chatTurnId: string;
    };
    expect(body.basedOnVersion).toBe(1);
    expect(body.actor).toBe("user");
    expect(body.chatTurnId).toMatch(/^turn-/);
  });

  it("shows a stale state when the apply endpoint returns proposal_stale", async () => {
    mockFetch(async (input) => {
      const url = input.toString();
      if (url === "/api/chat") return jsonResponse(chatResponseWithProposal());
      if (url === "/api/layout/proposals/apply") {
        return jsonResponse(
          {
            error: {
              code: "proposal_stale",
              message: "Layout version mismatch.",
              fields: [{ path: "basedOnVersion", message: "Current is 2." }],
            },
            requestId: "rid-stale",
          },
          { status: 400 },
        );
      }
      throw new Error(`Unexpected fetch ${url}`);
    });

    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "Add a breakeven chart." } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const apply = await within(list).findByRole("button", { name: /Apply: /i });
    fireEvent.click(apply);

    await waitFor(() => {
      expect(within(list).getByText("Layout has changed")).toBeInTheDocument();
    });
    expect(within(list).getByText(/Layout version mismatch/i)).toBeInTheDocument();
    expect(within(list).queryByRole("button", { name: /Apply: /i })).toBeNull();
  });

  it("shows rejected reasons when the apply endpoint returns valid: false", async () => {
    mockFetch(async (input) => {
      const url = input.toString();
      if (url === "/api/chat") return jsonResponse(chatResponseWithProposal());
      if (url === "/api/layout/proposals/apply") {
        return jsonResponse({
          valid: false,
          proposalId: "proposal-1",
          summary: "Action proposal was rejected.",
          reasons: ["Inflation would have 5 widgets; allowed range is 2 to 4."],
          issues: [
            {
              code: "quadrant_limit_exceeded",
              message: "Inflation would have 5 widgets; allowed range is 2 to 4.",
              actionIndex: 0,
              quadrantId: "inflation",
            },
          ],
          requestId: "rid-reject",
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });

    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "Add a breakeven chart." } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const apply = await within(list).findByRole("button", { name: /Apply: /i });
    fireEvent.click(apply);

    await waitFor(() => {
      expect(within(list).getByText("Cannot apply")).toBeInTheDocument();
    });
    expect(
      within(list).getByText("That quadrant is full (max 4 widgets)."),
    ).toBeInTheDocument();
    expect(within(list).queryByRole("button", { name: /Apply: /i })).toBeNull();
  });

  it("removes the proposal card when Dismiss is clicked and does not call apply", async () => {
    const fetchMock = mockFetch(async () => jsonResponse(chatResponseWithProposal()));
    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "Add a breakeven chart." } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const dismiss = await within(list).findByRole("button", { name: /Dismiss: /i });
    fireEvent.click(dismiss);

    await waitFor(() => {
      expect(
        within(list).queryByText("Add Breakeven extra to Inflation"),
      ).not.toBeInTheDocument();
    });
    const applyCalls = fetchMock.mock.calls.filter(
      (call) => call[0]?.toString() === "/api/layout/proposals/apply",
    );
    expect(applyCalls).toHaveLength(0);
  });

  it("retries apply from the error state when the user clicks Retry", async () => {
    const nextLayout: DashboardLayout = {
      ...DEFAULT_DASHBOARD_LAYOUT,
      version: 2,
    };
    let applyCallCount = 0;
    mockFetch(async (input) => {
      const url = input.toString();
      if (url === "/api/chat") return jsonResponse(chatResponseWithProposal());
      if (url === "/api/layout/proposals/apply") {
        applyCallCount += 1;
        if (applyCallCount === 1) {
          return jsonResponse(
            {
              error: { code: "unexpected_error", message: "Network glitch." },
              requestId: "rid-error",
            },
            { status: 500 },
          );
        }
        return jsonResponse({
          valid: true,
          layout: nextLayout,
          version: 2,
          diff: [baseDiffEntry()],
          affectedWidgetIds: ["widget.line.us_5y_breakeven_extra"],
          summary: "Add Breakeven extra to Inflation.",
          logEntries: [],
          requestId: "rid-apply",
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });

    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "Add a breakeven chart." } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const apply = await within(list).findByRole("button", { name: /Apply: /i });
    fireEvent.click(apply);

    const retry = await within(list).findByRole("button", { name: /Apply: /i });
    expect(retry).toHaveTextContent(/Retry/i);
    fireEvent.click(retry);

    await waitFor(() => {
      expect(within(list).getByText(/Applied · Inflation/i)).toBeInTheDocument();
    });
    expect(applyCallCount).toBe(2);
  });

  it("marks other idle proposals stale after a successful apply", async () => {
    const nextLayout: DashboardLayout = {
      ...DEFAULT_DASHBOARD_LAYOUT,
      version: 2,
    };
    let chatCallCount = 0;
    mockFetch(async (input) => {
      const url = input.toString();
      if (url === "/api/chat") {
        chatCallCount += 1;
        const payload = chatResponseWithProposal();
        // Distinguish proposal-2 by id so React keys differ.
        if (chatCallCount === 2) {
          payload.proposal.proposal = {
            ...payload.proposal.proposal,
            id: "proposal-2",
            summary: "Add Yield curve extra to Market",
          };
        }
        return jsonResponse(payload);
      }
      if (url === "/api/layout/proposals/apply") {
        return jsonResponse({
          valid: true,
          layout: nextLayout,
          version: 2,
          diff: [baseDiffEntry()],
          affectedWidgetIds: ["widget.line.us_5y_breakeven_extra"],
          summary: "Add Breakeven extra to Inflation.",
          logEntries: [],
          requestId: "rid-apply",
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });

    const { textarea, list } = renderPanel();

    fireEvent.change(textarea, { target: { value: "Add breakeven chart." } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    await within(list).findByText("Add Breakeven extra to Inflation");

    fireEvent.change(textarea, { target: { value: "Add yield-curve extra." } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    await within(list).findByText("Add Yield curve extra to Market");

    const applyButtons = within(list).getAllByRole("button", { name: /Apply: /i });
    expect(applyButtons).toHaveLength(2);
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(within(list).getByText(/Applied · Inflation/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(within(list).getByText("Layout has changed")).toBeInTheDocument();
    });
    expect(within(list).queryByRole("button", { name: /Apply: /i })).toBeNull();
  });
});
