import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
}

const ONBOARDING_TEXT =
  "I can pull macro indicators, compare series across countries, or rearrange your dashboard. Ask a question, or describe a layout change.";

const PENDING_TEXT = "Looking that up...";

const FALLBACK_TEXT =
  "I couldn't reach the research tools just now. Please try again in a moment.";

const ONBOARDING_ID = "msg-0";

const initialMessages = (): ChatMessage[] => [
  { id: ONBOARDING_ID, role: "assistant", text: ONBOARDING_TEXT },
];

export interface UseChatStateResult {
  messages: readonly ChatMessage[];
  draft: string;
  setDraft: (next: string) => void;
  send: () => void;
  canSend: boolean;
  isSending: boolean;
}

interface ChatApiResponse {
  text: string;
}

const buildHistoryPayload = (messages: readonly ChatMessage[]) =>
  messages
    .filter((entry) => !entry.pending && entry.id !== ONBOARDING_ID)
    .map((entry) => ({ role: entry.role, text: entry.text }));

const sendChatRequest = async (
  message: string,
  history: readonly ChatMessage[],
  signal: AbortSignal,
): Promise<string> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: buildHistoryPayload(history),
    }),
    signal,
  });

  if (!response.ok) {
    let errorMessage = FALLBACK_TEXT;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) errorMessage = body.error.message;
    } catch {
      // fall through to fallback
    }
    throw new Error(errorMessage);
  }

  const body = (await response.json()) as ChatApiResponse;
  return body.text;
};

export function useChatState(): UseChatStateResult {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const idCounter = useRef<number>(messages.length);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !isSending,
    [draft, isSending],
  );

  const send = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || isSending) return;
    const userId = `msg-${idCounter.current++}`;
    const pendingId = `msg-${idCounter.current++}`;
    const userMessage: ChatMessage = { id: userId, role: "user", text: trimmed };
    const pendingMessage: ChatMessage = {
      id: pendingId,
      role: "assistant",
      text: PENDING_TEXT,
      pending: true,
    };

    const historySnapshot = messagesRef.current;
    messagesRef.current = [...messagesRef.current, userMessage, pendingMessage];
    setMessages(messagesRef.current);
    setDraft("");
    setIsSending(true);

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    void (async () => {
      try {
        const replyText = await sendChatRequest(trimmed, historySnapshot, controller.signal);
        setMessages((prev) =>
          prev.map((entry) =>
            entry.id === pendingId
              ? { id: pendingId, role: "assistant", text: replyText }
              : entry,
          ),
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        const message =
          error instanceof Error && error.message ? error.message : FALLBACK_TEXT;
        // Keep `pending: true` so the failure text is rendered but excluded from
        // the history payload of subsequent requests.
        setMessages((prev) =>
          prev.map((entry) =>
            entry.id === pendingId
              ? { id: pendingId, role: "assistant", text: message, pending: true }
              : entry,
          ),
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsSending(false);
      }
    })();
  }, [draft, isSending]);

  return { messages, draft, setDraft, send, canSend, isSending };
}
