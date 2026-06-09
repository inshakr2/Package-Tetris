import { calculateUsableSize } from "./presets";
import {
  createRotationCandidates,
  findFirstStablePlacement,
  type PlacementBounds,
  type PlacementPolicy,
  type PositionCandidate
} from "./packing-placement";
import { ensureSafeOptimizationOutput } from "./packing-output-safety";
import { BlockDefinition, PackedBlock, PackedSpace } from "./types";
import { OptimizationInput, OptimizationOutput } from "./engine-contract";

interface MutablePackedSpace {
  spaceInstanceId: string;
  blocks: PackedBlock[];
  usedVolumeM3: number;
}

interface SortableBlockUnit {
  block: BlockDefinition;
  maxBaseAreaMm2: number;
  volumeM3: number;
}

export function runPackingEngineV0(input: OptimizationInput): OptimizationOutput {
  const usableSize = calculateUsableSize(input.space);
  const usableVolumeM3 = dimensionsVolumeM3(usableSize);
  const placementPolicy: PlacementPolicy = {
    fragileStackOnFragileAllowed: input.policy.fragileStackOnFragileAllowed,
    nonFragileOnFragileAllowed: input.policy.nonFragileOnFragileAllowed
  };
  const spaces: MutablePackedSpace[] = [];
  const warnings: string[] = [];
  let unloadedBlockCount = 0;

  const blockUnits = expandBlockUnits(input.blocks, usableSize);

  blockUnits.forEach((block) => {
    const packedBlock = placeBlock(input.runId, spaces, block, usableSize, placementPolicy);

    if (!packedBlock) {
      unloadedBlockCount += 1;
      warnings.push(
        `${block.name}은(는) 안전하게 올릴 자리가 없어 미적재 처리했습니다. 박스 수량을 줄이거나 더 큰 공간을 선택하세요.`
      );
    }
  });

  const packedSpaces: PackedSpace[] = spaces.map((space) => ({
    spaceInstanceId: space.spaceInstanceId,
    utilizationRate: usableVolumeM3 > 0 ? roundRate(space.usedVolumeM3 / usableVolumeM3) : 0,
    blocks: space.blocks
  }));

  const totalUtilizationRate = packedSpaces.reduce((sum, space) => sum + space.utilizationRate, 0);

  const output = {
    runId: input.runId,
    usedSpaceCount: packedSpaces.length,
    averageUtilizationRate:
      packedSpaces.length > 0 ? roundRate(totalUtilizationRate / packedSpaces.length) : 0,
    unloadedBlockCount,
    spaces: packedSpaces,
    warnings
  };

  return ensureSafeOptimizationOutput(input, output);
}

function expandBlockUnits(blocks: BlockDefinition[], usableSize: PlacementBounds): BlockDefinition[] {
  return blocks
    .flatMap((block) =>
      Array.from({ length: Math.max(0, block.quantity) }, (_, index) => ({
        ...block,
        blockId: `${block.blockId}-unit-${index + 1}`,
        quantity: 1
      }))
    )
    .map((block) => ({
      block,
      maxBaseAreaMm2: getMaxStableBaseArea(block, usableSize),
      volumeM3: dimensionsVolumeM3(block.dimensions)
    }))
    .sort(compareBlockUnits)
    .map(({ block }) => block);
}

function compareBlockUnits(left: SortableBlockUnit, right: SortableBlockUnit) {
  if (left.block.fragile !== right.block.fragile) {
    return left.block.fragile ? 1 : -1;
  }

  const baseAreaDiff = right.maxBaseAreaMm2 - left.maxBaseAreaMm2;

  if (baseAreaDiff !== 0) {
    return baseAreaDiff;
  }

  const volumeDiff = right.volumeM3 - left.volumeM3;

  if (volumeDiff !== 0) {
    return volumeDiff;
  }

  return left.block.blockId.localeCompare(right.block.blockId);
}

function getMaxStableBaseArea(block: BlockDefinition, usableSize: PlacementBounds) {
  const candidates = createRotationCandidates(block.dimensions, usableSize);

  if (candidates.length === 0) {
    return block.dimensions.widthMm * block.dimensions.depthMm;
  }

  return candidates.reduce((maxArea, candidate) => {
    return Math.max(maxArea, candidate.widthMm * candidate.depthMm);
  }, 0);
}

function placeBlock(
  runId: string,
  spaces: MutablePackedSpace[],
  block: BlockDefinition,
  usableSize: PlacementBounds,
  placementPolicy: PlacementPolicy
) {
  const existingPlacement = findPlacementInSpaces(spaces, block, usableSize, placementPolicy);

  if (existingPlacement) {
    return createPackedBlock(existingPlacement.space, block, existingPlacement.position);
  }

  const nextSpace = createPackedSpace(runId, spaces.length + 1);
  const position = findFirstStablePlacement(
    nextSpace.blocks,
    block.dimensions,
    block.fragile,
    usableSize,
    placementPolicy
  );

  if (!position) {
    return null;
  }

  spaces.push(nextSpace);
  return createPackedBlock(nextSpace, block, position);
}

function findPlacementInSpaces(
  spaces: MutablePackedSpace[],
  block: BlockDefinition,
  usableSize: PlacementBounds,
  placementPolicy: PlacementPolicy
) {
  for (const space of spaces) {
    const position = findFirstStablePlacement(space.blocks, block.dimensions, block.fragile, usableSize, placementPolicy);

    if (position) {
      return { space, position };
    }
  }

  return null;
}

function createPackedBlock(space: MutablePackedSpace, block: BlockDefinition, position: PositionCandidate) {
  const packedBlock: PackedBlock = {
    blockId: block.blockId,
    blockTemplateId: block.blockTemplateId,
    name: block.name,
    fragile: block.fragile,
    xMm: position.xMm,
    yMm: position.yMm,
    zMm: position.zMm,
    widthMm: position.widthMm,
    depthMm: position.depthMm,
    heightMm: position.heightMm,
    rotation: position.rotation
  };

  space.blocks.push(packedBlock);
  space.usedVolumeM3 += dimensionsVolumeM3(position);
  return packedBlock;
}

function createPackedSpace(runId: string, index: number): MutablePackedSpace {
  return {
    spaceInstanceId: `${runId}-space-${index}`,
    blocks: [],
    usedVolumeM3: 0
  };
}

function dimensionsVolumeM3(dimensions: PlacementBounds) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}

function roundRate(value: number) {
  return Number(value.toFixed(3));
}
