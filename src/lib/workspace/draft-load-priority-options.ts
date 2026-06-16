import { normalizeLoadPriorityScore } from "./load-priority";
import type { BlockDefinition } from "./types";

export const DRAFT_LOAD_PRIORITY_OPTIONS = [
  { value: 0, label: "기본" },
  { value: 5, label: "아래 우선" }
] as const;

export type DraftLoadPriorityOptionValue = (typeof DRAFT_LOAD_PRIORITY_OPTIONS)[number]["value"];

export function normalizeDraftLoadPriorityOptionValue(
  value: number | null | undefined
): DraftLoadPriorityOptionValue {
  return normalizeLoadPriorityScore(value) > 0 ? 5 : 0;
}

export function createDraftLoadPrioritySummary(block: BlockDefinition) {
  const priority = normalizeDraftLoadPriorityOptionValue(block.loadPriority);

  if (priority <= 0) {
    return null;
  }

  return `${block.name} ${block.quantity}개 · ${getDraftLoadPriorityLabel(priority)}`;
}

export function getDraftLoadPriorityLabel(priority: DraftLoadPriorityOptionValue) {
  return DRAFT_LOAD_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? "기본";
}
