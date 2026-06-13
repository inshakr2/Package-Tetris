import { PackedSpace } from "./types";

export function createPackedSpaceSignature(space: PackedSpace) {
  return space.blocks
    .slice()
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

      if (left.rotation !== right.rotation) {
        return left.rotation.localeCompare(right.rotation);
      }

      if (left.widthMm !== right.widthMm) {
        return left.widthMm - right.widthMm;
      }

      if (left.depthMm !== right.depthMm) {
        return left.depthMm - right.depthMm;
      }

      if (left.heightMm !== right.heightMm) {
        return left.heightMm - right.heightMm;
      }

      return left.blockId.localeCompare(right.blockId);
    })
    .map((block) => {
      return [
        `z=${block.zMm}`,
        `y=${block.yMm}`,
        `x=${block.xMm}`,
        `rotation=${block.rotation}`,
        `w=${block.widthMm}`,
        `d=${block.depthMm}`,
        `h=${block.heightMm}`
      ].join("|");
    });
}
