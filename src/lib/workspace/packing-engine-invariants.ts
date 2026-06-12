import type { OptimizationInput, OptimizationOutput } from "./engine-contract";
import { type PlacementPolicy } from "./packing-placement";
import { validatePackedSpace } from "./packed-result-validation";
import { calculateUsableSize } from "./presets";
import type { PackedBlock, PackedSpace, SpaceDefinition } from "./types";

export interface PackingInvariantValidation {
  isValid: boolean;
  reasons: string[];
}

export interface PackedSpacesInvariantInput {
  space: SpaceDefinition;
  spaces: PackedSpace[];
  policy: PlacementPolicy;
  usedSpaceCount?: number;
  averageUtilizationRate?: number;
  unloadedBlockCount?: number;
  expectedInputQuantity?: number;
}

export function validateOptimizationOutputInvariants(
  input: OptimizationInput,
  output: OptimizationOutput
): PackingInvariantValidation {
  return validatePackedSpacesInvariants({
    space: input.space,
    spaces: output.spaces,
    policy: {
      fragileStackOnFragileAllowed: input.policy.fragileStackOnFragileAllowed,
      nonFragileOnFragileAllowed: input.policy.nonFragileOnFragileAllowed,
      partialSupportEnabled: input.policy.partialSupportEnabled,
      minimumSupportRatio: input.policy.minimumSupportRatio
    },
    usedSpaceCount: output.usedSpaceCount,
    averageUtilizationRate: output.averageUtilizationRate,
    unloadedBlockCount: output.unloadedBlockCount,
    expectedInputQuantity: input.blocks.reduce((sum, block) => sum + Math.max(0, block.quantity), 0)
  });
}

export function validatePackedSpacesInvariants(input: PackedSpacesInvariantInput): PackingInvariantValidation {
  const reasons = [
    ...validateUsedSpaceCount(input),
    ...validateBlockIdUniqueness(input.spaces),
    ...validateQuantityPreservation(input),
    ...validateUtilizationRates(input),
    ...validatePlacementSafety(input)
  ];

  return {
    isValid: reasons.length === 0,
    reasons
  };
}

function validateUsedSpaceCount(input: PackedSpacesInvariantInput) {
  if (input.usedSpaceCount === undefined || input.usedSpaceCount === input.spaces.length) {
    return [];
  }

  return [`사용 공간 수가 실제 공간 목록과 다릅니다. 표시 ${input.usedSpaceCount}개, 실제 ${input.spaces.length}개`];
}

function validateBlockIdUniqueness(spaces: PackedSpace[]) {
  const blockIds = spaces.flatMap((space) => space.blocks.map((block) => block.blockId));
  const duplicatedBlockIds = blockIds.filter((blockId, index) => blockIds.indexOf(blockId) !== index);

  if (duplicatedBlockIds.length === 0) {
    return [];
  }

  return [`같은 박스 ID가 중복 배치되었습니다. ${Array.from(new Set(duplicatedBlockIds)).join(", ")}`];
}

function validateQuantityPreservation(input: PackedSpacesInvariantInput) {
  if (input.expectedInputQuantity === undefined || input.unloadedBlockCount === undefined) {
    return [];
  }

  const packedBlockCount = input.spaces.reduce((sum, space) => sum + space.blocks.length, 0);
  const handledBlockCount = packedBlockCount + input.unloadedBlockCount;

  if (handledBlockCount === input.expectedInputQuantity) {
    return [];
  }

  return [
    `입력 수량과 처리 수량이 다릅니다. 입력 ${input.expectedInputQuantity}개, 적재 ${packedBlockCount}개, 미적재 ${input.unloadedBlockCount}개`
  ];
}

function validateUtilizationRates(input: PackedSpacesInvariantInput) {
  const usableSize = calculateUsableSize(input.space);
  const usableVolumeM3 = dimensionsVolumeM3(usableSize);
  const reasons = input.spaces.flatMap((space) => {
    const expectedUtilizationRate = usableVolumeM3 > 0 ? roundRate(totalBlockVolumeM3(space.blocks) / usableVolumeM3) : 0;

    if (space.utilizationRate === expectedUtilizationRate) {
      return [];
    }

    return [
      `${space.spaceInstanceId}의 적재율이 실제 부피와 다릅니다. 표시 ${space.utilizationRate}, 실제 ${expectedUtilizationRate}`
    ];
  });

  if (input.averageUtilizationRate !== undefined) {
    const expectedAverageUtilizationRate =
      input.spaces.length > 0
        ? roundRate(input.spaces.reduce((sum, space) => sum + space.utilizationRate, 0) / input.spaces.length)
        : 0;

    if (input.averageUtilizationRate !== expectedAverageUtilizationRate) {
      reasons.push(
        `평균 적재율이 공간 적재율 평균과 다릅니다. 표시 ${input.averageUtilizationRate}, 실제 ${expectedAverageUtilizationRate}`
      );
    }
  }

  return reasons;
}

function validatePlacementSafety(input: PackedSpacesInvariantInput) {
  const usableSize = calculateUsableSize(input.space);

  return input.spaces.flatMap((space) => {
    const validation = validatePackedSpace(space, usableSize, input.policy);

    if (validation.isValid) {
      return [];
    }

    return validation.reasons;
  });
}

function totalBlockVolumeM3(blocks: PackedBlock[]) {
  return blocks.reduce(
    (sum, block) => sum + dimensionsVolumeM3({ widthMm: block.widthMm, depthMm: block.depthMm, heightMm: block.heightMm }),
    0
  );
}

function dimensionsVolumeM3(dimensions: { widthMm: number; depthMm: number; heightMm: number }) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}

function roundRate(value: number) {
  return Number(value.toFixed(3));
}
