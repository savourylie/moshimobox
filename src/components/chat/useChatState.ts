import { useCallback, useMemo, useRef, useState } from "react";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

const ONBOARDING_TEXT =
  "I can pull macro indicators, compare series across countries, or rearrange your dashboard. Ask a question, or describe a layout change.";

const initialMessages = (): ChatMessage[] => [
  { id: "msg-0", role: "assistant", text: ONBOARDING_TEXT },
];

export interface UseChatStateResult {
  messages: readonly ChatMessage[];
  draft: string;
  setDraft: (next: string) => void;
  send: () => void;
  canSend: boolean;
}

export function useChatState(): UseChatStateResult {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const idCounter = useRef<number>(messages.length);

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

  const send = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    const id = `msg-${idCounter.current++}`;
    setMessages((prev) => [...prev, { id, role: "user", text: trimmed }]);
    setDraft("");
  }, [draft]);

  return { messages, draft, setDraft, send, canSend };
}
