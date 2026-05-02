import type { ActionLogEntry } from "@/domain/schemas";

export interface ActionLogQuery {
  proposalId?: string;
  dashboardId?: string;
  limit?: number;
}

export interface ActionLogRepositoryDeps {
  capacity?: number;
  now?: () => Date;
  newId?: () => string;
}

const DEFAULT_CAPACITY = 200;

const clone = <T>(value: T): T => structuredClone(value);

export type ActionLogAppendInput = Omit<ActionLogEntry, "id" | "timestamp">;

export const createActionLogRepository = ({
  capacity = DEFAULT_CAPACITY,
  now = () => new Date(),
  newId = () => crypto.randomUUID(),
}: ActionLogRepositoryDeps = {}) => {
  let entries: ActionLogEntry[] = [];

  const trim = () => {
    if (entries.length > capacity) {
      entries = entries.slice(entries.length - capacity);
    }
  };

  return {
    append(input: ActionLogAppendInput): ActionLogEntry {
      const entry: ActionLogEntry = {
        ...input,
        id: newId(),
        timestamp: now().toISOString(),
      };
      entries.push(entry);
      trim();
      return clone(entry);
    },
    list(query: ActionLogQuery = {}): ActionLogEntry[] {
      let result = entries;
      if (query.proposalId !== undefined) {
        result = result.filter((entry) => entry.proposalId === query.proposalId);
      }
      if (query.dashboardId !== undefined) {
        result = result.filter((entry) => entry.dashboardId === query.dashboardId);
      }
      const ordered = [...result].reverse();
      const limited = query.limit !== undefined ? ordered.slice(0, query.limit) : ordered;
      return limited.map(clone);
    },
    reset(): void {
      entries = [];
    },
  };
};

export type ActionLogRepository = ReturnType<typeof createActionLogRepository>;

export const actionLogRepository: ActionLogRepository = createActionLogRepository();
