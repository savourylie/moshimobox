import { ChatPanel } from "../chat/ChatPanel";

interface ChatPanelSlotProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanelSlot({ open, onClose }: ChatPanelSlotProps) {
  if (!open) return null;
  return <ChatPanel onClose={onClose} />;
}
