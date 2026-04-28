import Link from "next/link";
import { Search, Settings, Sparkles } from "lucide-react";
import { IconButton } from "./IconButton";
import styles from "./TopBar.module.css";

interface TopBarProps {
  chatOpen: boolean;
  onToggleChat: () => void;
}

export function TopBar({ chatOpen, onToggleChat }: TopBarProps) {
  const copilotClass = chatOpen
    ? `${styles.copilot} ${styles.copilotActive}`
    : styles.copilot;
  return (
    <header role="banner" className={styles.bar}>
      <Link href="/" className={styles.logo} aria-label="Moshimo Box home">
        {/* eslint-disable-next-line @next/next/no-img-element -- brand chrome, fixed-size static asset; next/image adds runtime overhead */}
        <img
          src="/brand/logo-lockup.svg"
          alt="Moshimo Box"
          className={styles.logoImg}
        />
      </Link>
      <button
        type="button"
        className={styles.search}
        aria-label="Search indicators, sources, or layouts"
      >
        <Search size={15} strokeWidth={1.5} aria-hidden="true" />
        <span className={styles.searchHint}>
          Search indicators, sources, or layouts
        </span>
        <span className={styles.searchKbd} aria-hidden="true">
          ⌘K
        </span>
      </button>
      <div className={styles.right}>
        <IconButton aria-label="Settings">
          <Settings size={16} strokeWidth={1.5} aria-hidden="true" />
        </IconButton>
        <button
          type="button"
          className={copilotClass}
          aria-pressed={chatOpen}
          onClick={onToggleChat}
        >
          <Sparkles size={15} strokeWidth={1.5} aria-hidden="true" />
          Copilot
        </button>
      </div>
    </header>
  );
}
