export type LoadPriorityValue = 0 | 5 | 10;

export function normalizeLoadPriority(value: unknown): LoadPriorityValue | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 5) {
    return null;
  }

  return value >= 10 ? 10 : 5;
}

export function normalizeLoadPriorityScore(value: unknown): LoadPriorityValue {
  return normalizeLoadPriority(value) ?? 0;
}
