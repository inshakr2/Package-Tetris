import { calculateUsableSize } from "./presets";
import { BlockTemplate, PackedBlock, PackedSpace, ResultSummary } from "./types";

type RotationKey = PackedBlock["rotation"];

export interface ChainSimulationInput {
  result: ResultSummary;
  blockTemplate: BlockTemplate;
  runId: string;
}

export interface ChainSimulationOutput {
  runId: string;
  blockTemplateId: string;
  blockName: string;
  addedQuantity: number;
  spaces: PackedSpace[];
  averageUtilizationRate: number;
  warnings: string[];
}

interface RotationCandidate {
  rotation: RotationKey;
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

interface PositionCandidate extends RotationCandidate {
  xMm: number;
  yMm: number;
  zMm: number;
}

interface Bounds {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

const ROTATION_CANDIDATES: ReadonlyArray<{
  rotation: RotationKey;
  dimensions: ReadonlyArray<keyof BlockTemplate["dimensions"]>;
}> = [
  { rotation: "xyz", dimensions: ["widthMm", "depthMm", "heightMm"] },
  { rotation: "xzy", dimensions: ["widthMm", "heightMm", "depthMm"] },
  { rotation: "yxz", dimensions: ["depthMm", "widthMm", "heightMm"] },
  { rotation: "yzx", dimensions: ["depthMm", "heightMm", "widthMm"] },
  { rotation: "zxy", dimensions: ["heightMm", "widthMm", "depthMm"] },
  { rotation: "zyx", dimensions: ["heightMm", "depthMm", "widthMm"] }
];

export function runChainSimulationV0(input: ChainSimulationInput): ChainSimulationOutput {
  const warnings: string[] = [];

  if (!input.result.spaceSnapshot || !input.result.spaces?.length) {
    return {
      runId: input.runId,
      blockTemplateId: input.blockTemplate.blockTemplateId,
      blockName: input.blockTemplate.name,
      addedQuantity: 0,
      spaces: input.result.spaces ?? [],
      averageUtilizationRate: input.result.averageUtilizationRate,
      warnings: ["결과 공간 정보가 없어 추가 적재를 계산할 수 없습니다."]
    };
  }

  const usableSize = calculateUsableSize(input.result.spaceSnapshot);
  const usableVolumeM3 = dimensionsVolumeM3(usableSize);
  const templateVolumeM3 = dimensionsVolumeM3(input.blockTemplate.dimensions);
  const spaces = clonePackedSpaces(input.result.spaces);
  let addedQuantity = 0;
  const maxAdditionalByVolume = calculateMaxAdditionalByVolume(spaces, usableVolumeM3, templateVolumeM3);

  for (let index = 0; index < maxAdditionalByVolume; index += 1) {
    const placement = findNextPlacement(spaces, input.blockTemplate, usableSize);

    if (!placement) {
      break;
    }

    placement.space.blocks.push({
      blockId: `${input.runId}-block-${addedQuantity + 1}`,
      blockTemplateId: input.blockTemplate.blockTemplateId,
      name: input.blockTemplate.name,
      fragile: input.blockTemplate.fragile,
      xMm: placement.position.xMm,
      yMm: placement.position.yMm,
      zMm: placement.position.zMm,
      widthMm: placement.position.widthMm,
      depthMm: placement.position.depthMm,
      heightMm: placement.position.heightMm,
      rotation: placement.position.rotation
    });
    addedQuantity += 1;
  }

  const outputSpaces = spaces.map((space) => ({
    ...space,
    utilizationRate: usableVolumeM3 > 0 ? roundRate(totalBlockVolumeM3(space.blocks) / usableVolumeM3) : 0
  }));

  return {
    runId: input.runId,
    blockTemplateId: input.blockTemplate.blockTemplateId,
    blockName: input.blockTemplate.name,
    addedQuantity,
    spaces: outputSpaces,
    averageUtilizationRate: calculateAverageUtilization(outputSpaces),
    warnings
  };
}

function findNextPlacement(
  spaces: PackedSpace[],
  blockTemplate: BlockTemplate,
  usableSize: Bounds
): { space: PackedSpace; position: PositionCandidate } | null {
  for (const space of spaces) {
    const position = findPositionInSpace(space.blocks, blockTemplate, usableSize);

    if (position) {
      return { space, position };
    }
  }

  return null;
}

function findPositionInSpace(
  blocks: PackedBlock[],
  blockTemplate: BlockTemplate,
  usableSize: Bounds
): PositionCandidate | null {
  const rotations = createRotationCandidates(blockTemplate, usableSize);
  const xCandidates = createAxisCandidates(blocks, "xMm", "widthMm");
  const yCandidates = createAxisCandidates(blocks, "yMm", "depthMm");
  const zCandidates = createAxisCandidates(blocks, "zMm", "heightMm");

  const candidates = rotations.flatMap((rotation) =>
    zCandidates.flatMap((zMm) =>
      yCandidates.flatMap((yMm) =>
        xCandidates.map((xMm) => ({
          ...rotation,
          xMm,
          yMm,
          zMm
        }))
      )
    )
  );

  return (
    candidates
      .filter((candidate) => canPlaceAt(blocks, blockTemplate, candidate, usableSize))
      .sort((left, right) => {
        if (left.zMm !== right.zMm) {
          return left.zMm - right.zMm;
        }

        if (left.yMm !== right.yMm) {
          return left.yMm - right.yMm;
        }

        if (left.xMm !== right.xMm) {
          return left.xMm - right.xMm;
        }

        return left.rotation.localeCompare(right.rotation);
      })[0] ?? null
  );
}

function createRotationCandidates(blockTemplate: BlockTemplate, usableSize: Bounds): RotationCandidate[] {
  const unique = new Map<string, RotationCandidate>();

  ROTATION_CANDIDATES.forEach(({ rotation, dimensions }) => {
    const candidate = {
      rotation,
      widthMm: blockTemplate.dimensions[dimensions[0]],
      depthMm: blockTemplate.dimensions[dimensions[1]],
      heightMm: blockTemplate.dimensions[dimensions[2]]
    };

    if (
      candidate.widthMm <= usableSize.widthMm &&
      candidate.depthMm <= usableSize.depthMm &&
      candidate.heightMm <= usableSize.heightMm
    ) {
      unique.set(`${candidate.widthMm}:${candidate.depthMm}:${candidate.heightMm}`, candidate);
    }
  });

  return Array.from(unique.values()).sort((left, right) => {
    const baseAreaDiff = right.widthMm * right.depthMm - left.widthMm * left.depthMm;

    if (baseAreaDiff !== 0) {
      return baseAreaDiff;
    }

    return left.heightMm - right.heightMm;
  });
}

function createAxisCandidates(
  blocks: PackedBlock[],
  offsetKey: "xMm" | "yMm" | "zMm",
  sizeKey: "widthMm" | "depthMm" | "heightMm"
) {
  return Array.from(new Set([0, ...blocks.flatMap((block) => [block[offsetKey], block[offsetKey] + block[sizeKey]])]))
    .filter((value) => value >= 0)
    .sort((left, right) => left - right);
}

function canPlaceAt(
  blocks: PackedBlock[],
  blockTemplate: BlockTemplate,
  candidate: PositionCandidate,
  usableSize: Bounds
) {
  if (!fitsWithinUsableSize(candidate, usableSize)) {
    return false;
  }

  if (blocks.some((block) => overlaps3d(block, candidate))) {
    return false;
  }

  return hasStableSupport(blocks, blockTemplate, candidate);
}

function fitsWithinUsableSize(candidate: PositionCandidate, usableSize: Bounds) {
  return (
    candidate.xMm + candidate.widthMm <= usableSize.widthMm &&
    candidate.yMm + candidate.depthMm <= usableSize.depthMm &&
    candidate.zMm + candidate.heightMm <= usableSize.heightMm
  );
}

function overlaps3d(block: PackedBlock, candidate: PositionCandidate) {
  return (
    rangesOverlap(block.xMm, block.xMm + block.widthMm, candidate.xMm, candidate.xMm + candidate.widthMm) &&
    rangesOverlap(block.yMm, block.yMm + block.depthMm, candidate.yMm, candidate.yMm + candidate.depthMm) &&
    rangesOverlap(block.zMm, block.zMm + block.heightMm, candidate.zMm, candidate.zMm + candidate.heightMm)
  );
}

function hasStableSupport(blocks: PackedBlock[], blockTemplate: BlockTemplate, candidate: PositionCandidate) {
  if (candidate.zMm === 0) {
    return true;
  }

  const supportBlocks = blocks.filter((block) => {
    return (
      block.zMm + block.heightMm === candidate.zMm &&
      rangesOverlap(block.xMm, block.xMm + block.widthMm, candidate.xMm, candidate.xMm + candidate.widthMm) &&
      rangesOverlap(block.yMm, block.yMm + block.depthMm, candidate.yMm, candidate.yMm + candidate.depthMm)
    );
  });

  if (supportBlocks.length === 0) {
    return false;
  }

  if (!blockTemplate.fragile && supportBlocks.some((block) => block.fragile)) {
    return false;
  }

  const supportedArea = supportBlocks.reduce((sum, block) => {
    return sum + intersectionArea2d(block, candidate);
  }, 0);

  return supportedArea >= candidate.widthMm * candidate.depthMm;
}

function intersectionArea2d(block: PackedBlock, candidate: PositionCandidate) {
  const width =
    Math.min(block.xMm + block.widthMm, candidate.xMm + candidate.widthMm) - Math.max(block.xMm, candidate.xMm);
  const depth =
    Math.min(block.yMm + block.depthMm, candidate.yMm + candidate.depthMm) - Math.max(block.yMm, candidate.yMm);

  return Math.max(0, width) * Math.max(0, depth);
}

function rangesOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function calculateMaxAdditionalByVolume(
  spaces: PackedSpace[],
  usableVolumeM3: number,
  templateVolumeM3: number
) {
  if (usableVolumeM3 <= 0 || templateVolumeM3 <= 0) {
    return 0;
  }

  const remainingVolume = spaces.reduce((sum, space) => {
    return sum + Math.max(0, usableVolumeM3 - totalBlockVolumeM3(space.blocks));
  }, 0);

  return Math.floor(remainingVolume / templateVolumeM3);
}

function calculateAverageUtilization(spaces: PackedSpace[]) {
  if (spaces.length === 0) {
    return 0;
  }

  return roundRate(spaces.reduce((sum, space) => sum + space.utilizationRate, 0) / spaces.length);
}

function totalBlockVolumeM3(blocks: PackedBlock[]) {
  return blocks.reduce(
    (sum, block) => sum + dimensionsVolumeM3({ widthMm: block.widthMm, depthMm: block.depthMm, heightMm: block.heightMm }),
    0
  );
}

function dimensionsVolumeM3(dimensions: Bounds) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}

function roundRate(value: number) {
  return Math.round(value * 1000) / 1000;
}

function clonePackedSpaces(spaces: PackedSpace[]): PackedSpace[] {
  return spaces.map((space) => ({
    ...space,
    blocks: space.blocks.map((block) => ({ ...block }))
  }));
}
