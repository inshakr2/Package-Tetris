export const SPACE_SPLIT_FLOOR_SUPPORT_WARNING =
  "부피로는 남아 보여도 안전하게 받칠 바닥이 부족해 공간이 나뉘었습니다.";

interface CreatePackingResultWarningsInput {
  warnings: string[];
  usedSpaceCount: number;
  minimumSpaceCountLowerBound: number;
}

export function createPackingResultWarnings({
  warnings,
  usedSpaceCount,
  minimumSpaceCountLowerBound
}: CreatePackingResultWarningsInput) {
  if (usedSpaceCount <= minimumSpaceCountLowerBound) {
    return warnings;
  }

  if (warnings.includes(SPACE_SPLIT_FLOOR_SUPPORT_WARNING)) {
    return warnings;
  }

  return [...warnings, SPACE_SPLIT_FLOOR_SUPPORT_WARNING];
}
