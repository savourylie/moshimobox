import { beforeEach, describe, expect, it } from "vitest";
import { ActionLogEntrySchema } from "@/domain/schemas";
import {
  type ActionLogAppendInput,
  actionLogRepository,
  createActionLogRepository,
} from "./actionLogRepository";

const baseEntry = (overrides: Partial<ActionLogAppendInput> = {}): ActionLogAppendInput => ({
  proposalId: "proposal_test",
  actionType: "add_widget",
  result: "applied",
  actor: "agent",
  dashboardId: "main",
  affectedWidgetIds: ["widget_us_core_cpi_metric"],
  summary: "Add Core CPI quick read.",
  reasons: [],
  chatTurnId: "turn_test",
  ...overrides,
});

describe("actionLogRepository", () => {
  beforeEach(() => {
    actionLogRepository.reset();
  });

  it("append returns the entry with auto id and ISO timestamp", () => {
    const entry = actionLogRepository.append(baseEntry());
    expect(typeof entry.id).toBe("string");
    expect(entry.id.length).toBeGreaterThan(0);
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(ActionLogEntrySchema.safeParse(entry).success).toBe(true);
  });

  it("list returns newest entries first", () => {
    const fixedNow = new Date("2026-05-02T00:00:00.000Z");
    let tick = 0;
    const repo = createActionLogRepository({
      now: () => new Date(fixedNow.getTime() + tick++ * 1000),
      newId: () => `log_${tick}`,
    });

    repo.append(baseEntry({ summary: "first" }));
    repo.append(baseEntry({ summary: "second" }));
    repo.append(baseEntry({ summary: "third" }));

    const summaries = repo.list().map((entry) => entry.summary);
    expect(summaries).toEqual(["third", "second", "first"]);
  });

  it("capacity drops oldest entries", () => {
    const repo = createActionLogRepository({ capacity: 2 });
    repo.append(baseEntry({ summary: "first" }));
    repo.append(baseEntry({ summary: "second" }));
    repo.append(baseEntry({ summary: "third" }));

    const summaries = repo.list().map((entry) => entry.summary);
    expect(summaries).toEqual(["third", "second"]);
  });

  it("filter by proposalId returns matching entries", () => {
    actionLogRepository.append(baseEntry({ proposalId: "proposal_a", summary: "A" }));
    actionLogRepository.append(baseEntry({ proposalId: "proposal_b", summary: "B" }));
    actionLogRepository.append(baseEntry({ proposalId: "proposal_a", summary: "A2" }));

    const matches = actionLogRepository.list({ proposalId: "proposal_a" });
    expect(matches.map((entry) => entry.summary)).toEqual(["A2", "A"]);
  });

  it("filter by dashboardId returns matching entries", () => {
    actionLogRepository.append(baseEntry({ summary: "main entry" }));
    const matches = actionLogRepository.list({ dashboardId: "main" });
    expect(matches).toHaveLength(1);
  });

  it("limit caps the list size", () => {
    actionLogRepository.append(baseEntry({ summary: "first" }));
    actionLogRepository.append(baseEntry({ summary: "second" }));
    expect(actionLogRepository.list({ limit: 1 })).toHaveLength(1);
  });

  it("list returns clones — mutating the result does not affect the store", () => {
    actionLogRepository.append(baseEntry());
    const entries = actionLogRepository.list();
    entries[0].summary = "mutated";
    expect(actionLogRepository.list()[0].summary).toBe("Add Core CPI quick read.");
  });

  it("reset clears the log", () => {
    actionLogRepository.append(baseEntry());
    actionLogRepository.reset();
    expect(actionLogRepository.list()).toHaveLength(0);
  });

  it("appended entries always satisfy ActionLogEntrySchema", () => {
    const entries = [
      baseEntry(),
      baseEntry({ result: "rejected", reasons: ["something failed"], chatTurnId: undefined }),
      baseEntry({ proposalId: undefined, actionType: "remove_widget" }),
    ];
    for (const input of entries) {
      const entry = actionLogRepository.append(input);
      expect(ActionLogEntrySchema.safeParse(entry).success).toBe(true);
    }
  });
});
