import type { DashboardLayout } from "@/domain/schemas";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";

export interface LayoutHistoryEntry {
  layout: DashboardLayout;
  appliedAt: string;
  proposalId?: string;
}

export interface CommitMeta {
  proposalId?: string;
}

export interface RollbackResult {
  restored: DashboardLayout;
  replaced: DashboardLayout;
  replacedEntry: LayoutHistoryEntry;
}

export interface LayoutStoreDeps {
  initialLayout?: DashboardLayout;
  historyCapacity?: number;
  now?: () => Date;
}

const DEFAULT_HISTORY_CAPACITY = 5;

const clone = <T>(value: T): T => structuredClone(value);

export const createLayoutStore = ({
  initialLayout = DEFAULT_DASHBOARD_LAYOUT,
  historyCapacity = DEFAULT_HISTORY_CAPACITY,
  now = () => new Date(),
}: LayoutStoreDeps = {}) => {
  const seed = clone(initialLayout);
  let current: DashboardLayout = clone(seed);
  let history: LayoutHistoryEntry[] = [];

  const trim = () => {
    if (history.length > historyCapacity) {
      history = history.slice(history.length - historyCapacity);
    }
  };

  return {
    getCurrent(): DashboardLayout {
      return clone(current);
    },
    getHistory(): readonly LayoutHistoryEntry[] {
      return history.map((entry) => ({
        layout: clone(entry.layout),
        appliedAt: entry.appliedAt,
        ...(entry.proposalId ? { proposalId: entry.proposalId } : {}),
      }));
    },
    commit(next: DashboardLayout, meta: CommitMeta = {}): DashboardLayout {
      const priorEntry: LayoutHistoryEntry = {
        layout: clone(current),
        appliedAt: now().toISOString(),
        ...(meta.proposalId ? { proposalId: meta.proposalId } : {}),
      };
      history.push(priorEntry);
      trim();
      current = clone(next);
      return clone(current);
    },
    rollback(): RollbackResult | null {
      const entry = history.pop();
      if (!entry) return null;
      const replaced = clone(current);
      current = clone(entry.layout);
      return {
        restored: clone(current),
        replaced,
        replacedEntry: {
          layout: clone(entry.layout),
          appliedAt: entry.appliedAt,
          ...(entry.proposalId ? { proposalId: entry.proposalId } : {}),
        },
      };
    },
    reset(): void {
      current = clone(seed);
      history = [];
    },
  };
};

export type LayoutStore = ReturnType<typeof createLayoutStore>;

export const layoutStore: LayoutStore = createLayoutStore();
