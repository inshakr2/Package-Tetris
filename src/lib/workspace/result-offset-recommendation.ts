import type { OptimizationInput, OptimizationOutput } from "./engine-contract";
import { calculateUsableSize } from "./presets";
import type { BlockDefinition, Offset, PackedBlock, PackedSpace, SpaceDefinition } from "./types";

export const OFFSET_RECOMMENDATION_REDUCTION_CANDIDATES_MM = [10, 20, 50] as const;

export interface OffsetAdjustmentRecommendation {
  reductionMm: number;
  originalOffset: Offset;
  suggestedOffset: Offset;
  originalUsedSpaceCount: number;
  improvedUsedSpaceCount: number;
  improvedAverageUtilizationRate: number;
  usableSizeBefore: SpaceDefinition["dimensions"];
  usableSizeAfter: SpaceDefinition["dimensions"];
}

interface OffsetAdjustmentRecommendationInput {
  space: SpaceDefinition;
  spaces: PackedSpace[];
  policy: OptimizationInput["policy"];
  runPackingEngine: (input: OptimizationInput) => OptimizationOutput | Promise<OptimizationOutput>;
}

const TIMESTAMP = "2026-06-09T00:00:00.000Z";

export async function createOffsetAdjustmentRecommendation({
  space,
  spaces,
  policy,
  runPackingEngine
}: OffsetAdjustmentRecommendationInput): Promise<OffsetAdjustmentRecommendation | null> {
  if (spaces.length <= 1 || !hasReducibleOffset(space.offset)) {
    return null;
  }

  const blocks = createBlocksFromPackedSpaces(spaces);

  if (blocks.length === 0) {
    return null;
  }

  for (const reductionMm of OFFSET_RECOMMENDATION_REDUCTION_CANDIDATES_MM) {
    const candidateSpace = createReducedOffsetSpace(space, reductionMm);

    if (!candidateSpace) {
      continue;
    }

    const output = await runPackingEngine({
      runId: `offset-recommendation-${reductionMm}`,
      space: candidateSpace,
      blocks,
      policy
    });

    if (output.unloadedBlockCount > 0) {
      continue;
    }

    if (output.usedSpaceCount < spaces.length) {
      return {
        reductionMm,
        originalOffset: space.offset,
        suggestedOffset: candidateSpace.offset,
        originalUsedSpaceCount: spaces.length,
        improvedUsedSpaceCount: output.usedSpaceCount,
        improvedAverageUtilizationRate: output.averageUtilizationRate,
        usableSizeBefore: calculateUsableSize(space),
        usableSizeAfter: calculateUsableSize(candidateSpace)
      };
    }
  }

  return null;
}

function hasReducibleOffset(offset: Offset) {
  return offset.widthMm > 0 || offset.depthMm > 0 || offset.heightMm > 0;
}

function createReducedOffsetSpace(space: SpaceDefinition, reductionMm: number): SpaceDefinition | null {
  const offset = {
    widthMm: Math.max(0, space.offset.widthMm - reductionMm),
    depthMm: Math.max(0, space.offset.depthMm - reductionMm),
    heightMm: Math.max(0, space.offset.heightMm - reductionMm)
  };

  if (
    offset.widthMm === space.offset.widthMm &&
    offset.depthMm === space.offset.depthMm &&
    offset.heightMm === space.offset.heightMm
  ) {
    return null;
  }

  return {
    ...space,
    offset
  };
}

function createBlocksFromPackedSpaces(spaces: PackedSpace[]): BlockDefinition[] {
  const blockMap = new Map<string, BlockDefinition>();

  spaces.flatMap((space) => space.blocks).forEach((block) => {
    const key = createPackedBlockKey(block);
    const existingBlock = blockMap.get(key);

    if (existingBlock) {
      existingBlock.quantity += 1;
      return;
    }

    blockMap.set(key, {
      blockId: `offset-${block.blockTemplateId}-${blockMap.size + 1}`,
      blockTemplateId: block.blockTemplateId,
      draftBlockItemId: `offset-item-${block.blockTemplateId}-${blockMap.size + 1}`,
      entityVersion: 1,
      name: block.name,
      dimensions: {
        widthMm: block.widthMm,
        depthMm: block.depthMm,
        heightMm: block.heightMm
      },
      quantity: 1,
      fragile: block.fragile,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP
    });
  });

  return Array.from(blockMap.values());
}

function createPackedBlockKey(block: PackedBlock) {
  return JSON.stringify({
    blockTemplateId: block.blockTemplateId,
    name: block.name,
    fragile: block.fragile,
    dimensions: {
      widthMm: block.widthMm,
      depthMm: block.depthMm,
      heightMm: block.heightMm
    }
  });
}
