import { calculateUsableSize } from "./presets";
import { BlockDefinition, PackedBlock, PackedSpace } from "./types";
import { OptimizationInput, OptimizationOutput } from "./engine-contract";

type RotationKey = PackedBlock["rotation"];

interface RotationCandidate {
  rotation: RotationKey;
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

interface PackingCursor {
  xMm: number;
  yMm: number;
  zMm: number;
  rowDepthMm: number;
  layerHeightMm: number;
}

interface MutablePackedSpace {
  spaceInstanceId: string;
  blocks: PackedBlock[];
  cursor: PackingCursor;
  usedVolumeM3: number;
}

const ROTATION_CANDIDATES: ReadonlyArray<{
  rotation: RotationKey;
  keys: ReadonlyArray<keyof BlockDefinition["dimensions"]>;
}> = [
  { rotation: "xyz", keys: ["widthMm", "depthMm", "heightMm"] },
  { rotation: "xzy", keys: ["widthMm", "heightMm", "depthMm"] },
  { rotation: "yxz", keys: ["depthMm", "widthMm", "heightMm"] },
  { rotation: "yzx", keys: ["depthMm", "heightMm", "widthMm"] },
  { rotation: "zxy", keys: ["heightMm", "widthMm", "depthMm"] },
  { rotation: "zyx", keys: ["heightMm", "depthMm", "widthMm"] }
];

export function runPackingEngineV0(input: OptimizationInput): OptimizationOutput {
  const usableSize = calculateUsableSize(input.space);
  const usableVolumeM3 = dimensionsVolumeM3(usableSize);
  const spaces: MutablePackedSpace[] = [];
  const warnings: string[] = [];
  let unloadedBlockCount = 0;

  const blockUnits = expandBlockUnits(input.blocks);

  blockUnits.forEach((block) => {
    const rotation = chooseRotation(block, usableSize);

    if (!rotation) {
      unloadedBlockCount += 1;
      warnings.push(`${block.name}은(는) 적재 가능 크기에 들어가지 않아 미적재 처리했습니다.`);
      return;
    }

    const packedBlock = placeBlock(input.runId, spaces, block, rotation, usableSize);

    if (!packedBlock) {
      unloadedBlockCount += 1;
      warnings.push(`${block.name}은(는) 계산 중 배치하지 못해 미적재 처리했습니다.`);
    }
  });

  const packedSpaces: PackedSpace[] = spaces.map((space) => ({
    spaceInstanceId: space.spaceInstanceId,
    utilizationRate: usableVolumeM3 > 0 ? roundRate(space.usedVolumeM3 / usableVolumeM3) : 0,
    blocks: space.blocks
  }));

  const totalUtilizationRate = packedSpaces.reduce((sum, space) => sum + space.utilizationRate, 0);

  return {
    runId: input.runId,
    usedSpaceCount: packedSpaces.length,
    averageUtilizationRate:
      packedSpaces.length > 0 ? roundRate(totalUtilizationRate / packedSpaces.length) : 0,
    unloadedBlockCount,
    spaces: packedSpaces,
    warnings
  };
}

function expandBlockUnits(blocks: BlockDefinition[]): BlockDefinition[] {
  return blocks
    .flatMap((block) =>
      Array.from({ length: Math.max(0, block.quantity) }, (_, index) => ({
        ...block,
        blockId: `${block.blockId}-unit-${index + 1}`,
        quantity: 1
      }))
    )
    .sort((left, right) => {
      if (left.fragile !== right.fragile) {
        return left.fragile ? 1 : -1;
      }

      return dimensionsVolumeM3(right.dimensions) - dimensionsVolumeM3(left.dimensions);
    });
}

function chooseRotation(
  block: BlockDefinition,
  usableSize: { widthMm: number; depthMm: number; heightMm: number }
): RotationCandidate | null {
  const candidates = ROTATION_CANDIDATES.map(({ rotation, keys }) => ({
    rotation,
    widthMm: block.dimensions[keys[0]],
    depthMm: block.dimensions[keys[1]],
    heightMm: block.dimensions[keys[2]]
  })).filter((candidate) => {
    return (
      candidate.widthMm <= usableSize.widthMm &&
      candidate.depthMm <= usableSize.depthMm &&
      candidate.heightMm <= usableSize.heightMm
    );
  });

  return candidates.sort((left, right) => {
    const baseAreaDiff = right.widthMm * right.depthMm - left.widthMm * left.depthMm;

    if (baseAreaDiff !== 0) {
      return baseAreaDiff;
    }

    return left.heightMm - right.heightMm;
  })[0] ?? null;
}

function placeBlock(
  runId: string,
  spaces: MutablePackedSpace[],
  block: BlockDefinition,
  rotation: RotationCandidate,
  usableSize: { widthMm: number; depthMm: number; heightMm: number }
) {
  let activeSpace = spaces[spaces.length - 1] ?? createPackedSpace(runId, spaces.length + 1);

  if (spaces.length === 0) {
    spaces.push(activeSpace);
  }

  let position = findPosition(activeSpace.cursor, rotation, usableSize);

  if (!position) {
    activeSpace = createPackedSpace(runId, spaces.length + 1);
    spaces.push(activeSpace);
    position = findPosition(activeSpace.cursor, rotation, usableSize);
  }

  if (!position) {
    return null;
  }

  activeSpace.cursor = position.nextCursor;
  activeSpace.usedVolumeM3 += dimensionsVolumeM3(rotation);

  const packedBlock: PackedBlock = {
    blockId: block.blockId,
    blockTemplateId: block.blockTemplateId,
    name: block.name,
    fragile: block.fragile,
    xMm: position.xMm,
    yMm: position.yMm,
    zMm: position.zMm,
    widthMm: rotation.widthMm,
    depthMm: rotation.depthMm,
    heightMm: rotation.heightMm,
    rotation: rotation.rotation
  };

  activeSpace.blocks.push(packedBlock);
  return packedBlock;
}

function findPosition(
  cursor: PackingCursor,
  rotation: RotationCandidate,
  usableSize: { widthMm: number; depthMm: number; heightMm: number }
) {
  if (fitsAt(cursor.xMm, cursor.yMm, cursor.zMm, rotation, usableSize)) {
    return {
      xMm: cursor.xMm,
      yMm: cursor.yMm,
      zMm: cursor.zMm,
      nextCursor: advanceCursor(cursor, rotation)
    };
  }

  const rowCursor = {
    ...cursor,
    xMm: 0,
    yMm: cursor.yMm + cursor.rowDepthMm
  };

  if (fitsAt(rowCursor.xMm, rowCursor.yMm, rowCursor.zMm, rotation, usableSize)) {
    return {
      xMm: rowCursor.xMm,
      yMm: rowCursor.yMm,
      zMm: rowCursor.zMm,
      nextCursor: advanceCursor(
        {
          ...rowCursor,
          rowDepthMm: 0
        },
        rotation
      )
    };
  }

  const layerCursor = {
    xMm: 0,
    yMm: 0,
    zMm: cursor.zMm + cursor.layerHeightMm,
    rowDepthMm: 0,
    layerHeightMm: 0
  };

  if (fitsAt(layerCursor.xMm, layerCursor.yMm, layerCursor.zMm, rotation, usableSize)) {
    return {
      xMm: layerCursor.xMm,
      yMm: layerCursor.yMm,
      zMm: layerCursor.zMm,
      nextCursor: advanceCursor(layerCursor, rotation)
    };
  }

  return null;
}

function advanceCursor(cursor: PackingCursor, rotation: RotationCandidate): PackingCursor {
  return {
    xMm: cursor.xMm + rotation.widthMm,
    yMm: cursor.yMm,
    zMm: cursor.zMm,
    rowDepthMm: Math.max(cursor.rowDepthMm, rotation.depthMm),
    layerHeightMm: Math.max(cursor.layerHeightMm, rotation.heightMm)
  };
}

function fitsAt(
  xMm: number,
  yMm: number,
  zMm: number,
  rotation: RotationCandidate,
  usableSize: { widthMm: number; depthMm: number; heightMm: number }
) {
  return (
    xMm + rotation.widthMm <= usableSize.widthMm &&
    yMm + rotation.depthMm <= usableSize.depthMm &&
    zMm + rotation.heightMm <= usableSize.heightMm
  );
}

function createPackedSpace(runId: string, index: number): MutablePackedSpace {
  return {
    spaceInstanceId: `${runId}-space-${index}`,
    blocks: [],
    cursor: {
      xMm: 0,
      yMm: 0,
      zMm: 0,
      rowDepthMm: 0,
      layerHeightMm: 0
    },
    usedVolumeM3: 0
  };
}

function dimensionsVolumeM3(dimensions: { widthMm: number; depthMm: number; heightMm: number }) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}

function roundRate(value: number) {
  return Number(value.toFixed(3));
}
