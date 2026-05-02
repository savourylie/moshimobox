"use client";

import { Fragment, useLayoutEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { IconButton } from "../chrome/IconButton";
import { ProposalCard } from "./ProposalCard";
import { useChatState } from "./useChatState";
import type { ChatMessage } from "./useChatState";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const {
    messages,
    draft,
    setDraft,
    send,
    applyProposal,
    dismissProposal,
    canSend,
  } = useChatState();
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;
    send();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;
    // Skip submission while an IME is composing CJK input.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <aside aria-label="Chat panel" className={styles.panel}>
      <div className={styles.header}>
        <span aria-hidden="true" className={styles.headerIcon}>
          <Sparkles size={16} strokeWidth={1.5} />
        </span>
        <h2 className={styles.headerTitle}>Research copilot</h2>
        <span className={styles.headerSpacer} aria-hidden="true" />
        <IconButton aria-label="Close chat panel" onClick={onClose}>
          <X aria-hidden="true" size={16} strokeWidth={1.5} />
        </IconButton>
      </div>

      <div
        aria-label="Conversation"
        aria-live="polite"
        className={styles.list}
        data-testid="chat-message-list"
        ref={listRef}
        role="log"
      >
        {messages.map((message) => (
          <Fragment key={message.id}>
            <MessageBubble message={message} />
            {message.proposal ? (
              <ProposalCard
                onApply={() => applyProposal(message.id)}
                onDismiss={() => dismissProposal(message.id)}
                state={message.proposal}
              />
            ) : null}
          </Fragment>
        ))}
      </div>

      <form className={styles.composerForm} onSubmit={handleSubmit} ref={formRef}>
        <div className={styles.composerInner}>
          <textarea
            aria-label="Message"
            className={styles.textarea}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about an indicator, or describe a layout change."
            ref={textareaRef}
            rows={1}
            value={draft}
          />
          <div className={styles.composerFooter}>
            <span className={styles.composerHint}>
              Enter to send · Shift + Enter for newline
            </span>
            <button
              aria-disabled={!canSend}
              aria-label="Send message"
              className={styles.sendButton}
              disabled={!canSend}
              type="submit"
            >
              <Send aria-hidden="true" size={12} strokeWidth={1.5} />
              Send
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const className =
    message.role === "user"
      ? `${styles.message} ${styles.messageUser}`
      : `${styles.message} ${styles.messageAssistant}`;
  return <div className={className}>{message.text}</div>;
}
