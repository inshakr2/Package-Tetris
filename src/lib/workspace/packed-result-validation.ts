import { canPlaceAt, type PlacementBounds, type PlacementPolicy } from "./packing-placement";
import { calculateUsableSize } from "./presets";
import { PackedSpace, ResultSummary } from "./types";

export const INVALID_CHAIN_BASE_RESULT_WARNING =
  "기존 결과의 배치가 안전 기준에 맞지 않아 추가 적재를 계산할 수 없습니다. 결과를 다시 생성하세요.";

export interface PackedResultValidation {
  isValid: boolean;
  reasons: string[];
}

export function validatePackedResult(
  result: Pick<ResultSummary, "spaceSnapshot" | "spaces">,
  policy: PlacementPolicy
): PackedResultValidation {
  if (!result.spaceSnapshot || !result.spaces?.length) {
    return {
      isValid: false,
      reasons: [INVALID_CHAIN_BASE_RESULT_WARNING]
    };
  }

  const usableSize = calculateUsableSize(result.spaceSnapshot);

  for (const space of result.spaces) {
    const validation = validatePackedSpace(space, usableSize, policy);

    if (!validation.isValid) {
      return validation;
    }
  }

  return {
    isValid: true,
    reasons: []
  };
}

export function validatePackedSpace(
  space: PackedSpace,
  usableSize: PlacementBounds,
  policy: PlacementPolicy
): PackedResultValidation {
  for (const [index, block] of space.blocks.entries()) {
    const siblingBlocks = space.blocks.filter((_, candidateIndex) => candidateIndex !== index);

    if (!canPlaceAt(siblingBlocks, block.fragile, block, usableSize, policy)) {
      return {
        isValid: false,
        reasons: [INVALID_CHAIN_BASE_RESULT_WARNING]
      };
    }
  }

  return {
    isValid: true,
    reasons: []
  };
}
