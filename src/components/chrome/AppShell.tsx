"use client";

import { useState } from "react";
import type { DashboardLayout } from "@/domain/schemas";
import { LayoutProvider } from "../layout/LayoutProvider";
import { ChatPanelSlot } from "./ChatPanelSlot";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

interface AppShellProps {
  initialLayout: DashboardLayout;
  children: React.ReactNode;
}

export function AppShell({ initialLayout, children }: AppShellProps) {
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <LayoutProvider initialLayout={initialLayout}>
      <div className={styles.shell}>
        <div className={styles.topbarSlot}>
          <TopBar chatOpen={chatOpen} onToggleChat={() => setChatOpen((prev) => !prev)} />
        </div>
        <div className={styles.sidebarSlot}>
          <Sidebar />
        </div>
        <main className={styles.mainSlot}>
          <div className={styles.mainInner}>{children}</div>
        </main>
        <div className={styles.chatSlot}>
          <ChatPanelSlot open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </div>
    </LayoutProvider>
  );
}
