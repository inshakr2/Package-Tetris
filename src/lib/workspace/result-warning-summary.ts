export interface ResultWarningSummaryItem {
  message: string;
  count: number;
}

export function createResultWarningSummary(warnings: string[]): ResultWarningSummaryItem[] {
  const summaryMap = new Map<string, ResultWarningSummaryItem>();

  warnings.forEach((warning) => {
    const normalizedWarning = warning.trim();

    if (!normalizedWarning) {
      return;
    }

    const existing = summaryMap.get(normalizedWarning);

    if (existing) {
      existing.count += 1;
      return;
    }

    summaryMap.set(normalizedWarning, {
      message: normalizedWarning,
      count: 1
    });
  });

  return Array.from(summaryMap.values());
}
