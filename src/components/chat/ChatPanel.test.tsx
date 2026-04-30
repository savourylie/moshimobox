import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";

const renderPanel = () => {
  const onClose = vi.fn();
  const utils = render(<ChatPanel onClose={onClose} />);
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

describe("ChatPanel", () => {
  beforeEach(() => {
    mockFetch(async () =>
      jsonResponse({ text: "Sample reply.", toolInvocations: [], requestId: "rid" }),
    );
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

    resolve?.(jsonResponse({ text: "M2 is the broad money supply.", toolInvocations: [] }));

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
    expect(sendButton).toBeDisabled(); // because draft is empty after clearing
  });

  it("forwards prior user and assistant messages as history", async () => {
    const fetchMock = mockFetch(async () =>
      jsonResponse({ text: "Reply.", toolInvocations: [] }),
    );

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
});
