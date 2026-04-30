import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";

const renderPanel = () => {
  const onClose = vi.fn();
  const utils = render(<ChatPanel onClose={onClose} />);
  const textarea = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
  const sendButton = screen.getByRole("button", { name: "Send message" });
  const list = screen.getByTestId("chat-message-list");
  return { ...utils, onClose, textarea, sendButton, list };
};

describe("ChatPanel", () => {
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

  it("appends a user message and clears the textarea when Enter is pressed", () => {
    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "Is US inflation up?" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const messages = within(list).getAllByText(/.+/);
    const userMessage = messages.find((node) => node.textContent === "Is US inflation up?");
    expect(userMessage).toBeDefined();
    expect(textarea.value).toBe("");
    expect(textarea).toHaveFocus();
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

  it("sends when the Send button is clicked", () => {
    const { textarea, sendButton, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "compare US and EU CPI" } });
    expect(sendButton).not.toBeDisabled();
    fireEvent.click(sendButton);
    expect(within(list).getByText("compare US and EU CPI")).toBeInTheDocument();
    expect(textarea.value).toBe("");
  });

  it("calls onClose when the close button is clicked", () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Close chat panel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("scrolls the message list to the bottom after sending", () => {
    const { textarea, list } = renderPanel();
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 1234 });
    list.scrollTop = 0;

    fireEvent.change(textarea, { target: { value: "next message" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(list.scrollTop).toBe(1234);
  });

  it("trims whitespace from sent messages", () => {
    const { textarea, list } = renderPanel();
    fireEvent.change(textarea, { target: { value: "  hello  " } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(within(list).getByText("hello")).toBeInTheDocument();
  });
});
