import styles from "./ChatPanelSlot.module.css";

interface ChatPanelSlotProps {
  open: boolean;
}

export function ChatPanelSlot({ open }: ChatPanelSlotProps) {
  if (!open) return null;
  return (
    <aside aria-label="Chat panel" className={styles.chat}>
      <span className={styles.placeholder}>Chat panel</span>
    </aside>
  );
}
