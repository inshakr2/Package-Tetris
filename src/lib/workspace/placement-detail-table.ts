import type { PackedSpace } from "./types";

export interface PlacementDetailRow {
  rowIndex: number;
  sequenceLabel: string;
  blockId: string;
  name: string;
  handlingLabel: string;
  positionLabel: string;
  sizeLabel: string;
  directionLabel: string;
}

export function createPlacementDetailRows(packedSpace: PackedSpace): PlacementDetailRow[] {
  return [...packedSpace.blocks]
    .sort(comparePackedBlocksForLoading)
    .map((block, index) => ({
      rowIndex: index + 1,
      sequenceLabel: `${index + 1}번`,
      blockId: block.blockId,
      name: block.name,
      handlingLabel: block.fragile ? "깨짐주의" : "일반",
      positionLabel: `왼쪽 ${block.xMm}mm · 앞 ${block.yMm}mm · 바닥 ${block.zMm}mm`,
      sizeLabel: `${block.widthMm} x ${block.depthMm} x ${block.heightMm}mm`,
      directionLabel: block.rotation === "xyz" ? "기본 방향" : "회전 배치"
    }));
}

function comparePackedBlocksForLoading(left: PackedSpace["blocks"][number], right: PackedSpace["blocks"][number]) {
  const zDiff = left.zMm - right.zMm;

  if (zDiff !== 0) {
    return zDiff;
  }

  const yDiff = left.yMm - right.yMm;

  if (yDiff !== 0) {
    return yDiff;
  }

  const xDiff = left.xMm - right.xMm;

  if (xDiff !== 0) {
    return xDiff;
  }

  return left.blockId.localeCompare(right.blockId);
}
