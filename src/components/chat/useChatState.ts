import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActionProposalDiffEntry,
  ActionProposalValidationResult,
  DashboardLayout,
  ProposalValidationIssue,
  UIActionProposal,
} from "@/domain/schemas";
import { useLayout } from "@/components/layout/LayoutProvider";

export type ChatRole = "user" | "assistant";

export type ProposalStatus =
  | "idle"
  | "applying"
  | "applied"
  | "rejected"
  | "stale"
  | "error";

export interface PendingProposalState {
  proposal: UIActionProposal;
  validation: ActionProposalValidationResult;
  basedOnVersion: number;
  chatTurnId: string;
  status: ProposalStatus;
  appliedDiff?: ActionProposalDiffEntry[];
  reasons?: string[];
  issues?: ProposalValidationIssue[];
  errorMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
  proposal?: PendingProposalState;
}

const ONBOARDING_TEXT =
  "I can pull macro indicators, compare series across countries, or rearrange your dashboard. Ask a question, or describe a layout change.";

const PENDING_TEXT = "Looking that up...";

const FALLBACK_TEXT =
  "I couldn't reach the research tools just now. Please try again in a moment.";

const APPLY_FALLBACK_TEXT =
  "Could not apply this change. Please try again in a moment.";

const ONBOARDING_ID = "msg-0";

const initialMessages = (): ChatMessage[] => [
  { id: ONBOARDING_ID, role: "assistant", text: ONBOARDING_TEXT },
];

export interface UseChatStateResult {
  messages: readonly ChatMessage[];
  draft: string;
  setDraft: (next: string) => void;
  send: () => void;
  applyProposal: (messageId: string) => void;
  dismissProposal: (messageId: string) => void;
  canSend: boolean;
  isSending: boolean;
}

interface ChatApiProposalPayload {
  proposal: UIActionProposal;
  validation: ActionProposalValidationResult;
  basedOnVersion: number;
}

interface ChatApiResponse {
  text: string;
  proposal?: ChatApiProposalPayload;
}

interface ApplyResponseSuccess {
  valid: true;
  layout: DashboardLayout;
  version: number;
  diff: ActionProposalDiffEntry[];
  affectedWidgetIds: string[];
  summary: string;
}

interface ApplyResponseRejected {
  valid: false;
  proposalId?: string;
  summary: string;
  reasons: string[];
  issues: ProposalValidationIssue[];
}

const buildHistoryPayload = (messages: readonly ChatMessage[]) =>
  messages
    .filter((entry) => !entry.pending && entry.id !== ONBOARDING_ID)
    .map((entry) => ({ role: entry.role, text: entry.text }));

const sendChatRequest = async (
  message: string,
  history: readonly ChatMessage[],
  signal: AbortSignal,
): Promise<ChatApiResponse> => {
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

  return (await response.json()) as ChatApiResponse;
};

const generateTurnId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `turn-${crypto.randomUUID()}`;
  }
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const buildProposalState = (
  payload: ChatApiProposalPayload,
  chatTurnId: string,
): PendingProposalState => ({
  proposal: payload.proposal,
  validation: payload.validation,
  basedOnVersion: payload.basedOnVersion,
  chatTurnId,
  status: payload.validation.valid ? "idle" : "rejected",
  ...(payload.validation.valid
    ? {}
    : {
        reasons: payload.validation.reasons,
        issues: payload.validation.issues,
      }),
});

interface ApplyProposalRequestBody {
  proposal: UIActionProposal;
  basedOnVersion: number;
  actor: "user";
  chatTurnId: string;
}

interface ApplyOutcome {
  kind: "applied" | "rejected" | "stale" | "error";
  body?: ApplyResponseSuccess | ApplyResponseRejected;
  errorMessage?: string;
}

const applyProposalRequest = async (
  request: ApplyProposalRequestBody,
  signal: AbortSignal,
): Promise<ApplyOutcome> => {
  const response = await fetch("/api/layout/proposals/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (response.status === 200) {
    const body = (await response.json()) as ApplyResponseSuccess | ApplyResponseRejected;
    if (body.valid) {
      return { kind: "applied", body };
    }
    return { kind: "rejected", body };
  }

  let parsedError: { error?: { code?: string; message?: string } } = {};
  try {
    parsedError = (await response.json()) as { error?: { code?: string; message?: string } };
  } catch {
    // fall through to generic
  }

  if (response.status === 400 && parsedError.error?.code === "proposal_stale") {
    return {
      kind: "stale",
      errorMessage: parsedError.error.message ?? "The dashboard layout has changed.",
    };
  }

  return {
    kind: "error",
    errorMessage: parsedError.error?.message ?? APPLY_FALLBACK_TEXT,
  };
};

export function useChatState(): UseChatStateResult {
  const { setLayout } = useLayout();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const idCounter = useRef<number>(messages.length);
  const abortControllerRef = useRef<AbortController | null>(null);
  const applyControllersRef = useRef<Map<string, AbortController>>(new Map());
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const controllers = applyControllersRef.current;
    return () => {
      for (const controller of controllers.values()) controller.abort();
      controllers.clear();
    };
  }, []);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !isSending,
    [draft, isSending],
  );

  const send = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || isSending) return;
    const userId = `msg-${idCounter.current++}`;
    const pendingId = `msg-${idCounter.current++}`;
    const chatTurnId = generateTurnId();
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
        const reply = await sendChatRequest(trimmed, historySnapshot, controller.signal);
        const proposalState = reply.proposal
          ? buildProposalState(reply.proposal, chatTurnId)
          : undefined;
        setMessages((prev) =>
          prev.map((entry) =>
            entry.id === pendingId
              ? {
                  id: pendingId,
                  role: "assistant",
                  text: reply.text,
                  ...(proposalState ? { proposal: proposalState } : {}),
                }
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

  const applyProposal = useCallback(
    (messageId: string) => {
      const target = messagesRef.current.find((entry) => entry.id === messageId);
      if (!target?.proposal) return;
      if (target.proposal.status !== "idle" && target.proposal.status !== "error") return;
      const proposalState = target.proposal;

      const controller = new AbortController();
      const previous = applyControllersRef.current.get(messageId);
      previous?.abort();
      applyControllersRef.current.set(messageId, controller);

      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === messageId && entry.proposal
            ? {
                ...entry,
                proposal: { ...entry.proposal, status: "applying", errorMessage: undefined },
              }
            : entry,
        ),
      );

      void (async () => {
        try {
          const outcome = await applyProposalRequest(
            {
              proposal: proposalState.proposal,
              basedOnVersion: proposalState.basedOnVersion,
              actor: "user",
              chatTurnId: proposalState.chatTurnId,
            },
            controller.signal,
          );

          if (outcome.kind === "applied" && outcome.body && outcome.body.valid) {
            const success = outcome.body;
            setLayout(success.layout);
            setMessages((prev) =>
              prev.map((entry) => {
                if (entry.id === messageId && entry.proposal) {
                  return {
                    ...entry,
                    proposal: {
                      ...entry.proposal,
                      status: "applied",
                      appliedDiff: success.diff,
                      errorMessage: undefined,
                    },
                  };
                }
                if (entry.proposal && entry.proposal.status === "idle") {
                  return {
                    ...entry,
                    proposal: {
                      ...entry.proposal,
                      status: "stale",
                      errorMessage: "The dashboard layout has changed since this was proposed.",
                    },
                  };
                }
                return entry;
              }),
            );
            return;
          }

          if (outcome.kind === "rejected" && outcome.body && !outcome.body.valid) {
            const rejected = outcome.body;
            setMessages((prev) =>
              prev.map((entry) =>
                entry.id === messageId && entry.proposal
                  ? {
                      ...entry,
                      proposal: {
                        ...entry.proposal,
                        status: "rejected",
                        reasons: rejected.reasons,
                        issues: rejected.issues,
                        errorMessage: undefined,
                      },
                    }
                  : entry,
              ),
            );
            return;
          }

          if (outcome.kind === "stale") {
            setMessages((prev) =>
              prev.map((entry) =>
                entry.id === messageId && entry.proposal
                  ? {
                      ...entry,
                      proposal: {
                        ...entry.proposal,
                        status: "stale",
                        errorMessage:
                          outcome.errorMessage ??
                          "The dashboard layout has changed since this was proposed.",
                      },
                    }
                  : entry,
              ),
            );
            return;
          }

          setMessages((prev) =>
            prev.map((entry) =>
              entry.id === messageId && entry.proposal
                ? {
                    ...entry,
                    proposal: {
                      ...entry.proposal,
                      status: "error",
                      errorMessage: outcome.errorMessage ?? APPLY_FALLBACK_TEXT,
                    },
                  }
                : entry,
            ),
          );
        } catch (error) {
          if ((error as Error).name === "AbortError") return;
          setMessages((prev) =>
            prev.map((entry) =>
              entry.id === messageId && entry.proposal
                ? {
                    ...entry,
                    proposal: {
                      ...entry.proposal,
                      status: "error",
                      errorMessage:
                        error instanceof Error && error.message
                          ? error.message
                          : APPLY_FALLBACK_TEXT,
                    },
                  }
                : entry,
            ),
          );
        } finally {
          if (applyControllersRef.current.get(messageId) === controller) {
            applyControllersRef.current.delete(messageId);
          }
        }
      })();
    },
    [setLayout],
  );

  const dismissProposal = useCallback((messageId: string) => {
    const controller = applyControllersRef.current.get(messageId);
    controller?.abort();
    applyControllersRef.current.delete(messageId);
    setMessages((prev) =>
      prev.map((entry) => {
        if (entry.id !== messageId || !entry.proposal) return entry;
        const next: ChatMessage = {
          id: entry.id,
          role: entry.role,
          text: entry.text,
          ...(entry.pending ? { pending: entry.pending } : {}),
        };
        return next;
      }),
    );
  }, []);

  return {
    messages,
    draft,
    setDraft,
    send,
    applyProposal,
    dismissProposal,
    canSend,
    isSending,
  };
}
