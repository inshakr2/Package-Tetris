import { getTemplateColor } from "./block-colors";
import { PackedBlock } from "./types";

const TARGET_LONGEST_AXIS_UNITS = 12;

export interface PackingSceneBoundsInput {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

export interface PackingSceneBounds {
  width: number;
  depth: number;
  height: number;
  scale: number;
}

export interface PackingSceneBlock {
  blockId: string;
  blockTemplateId: string;
  name: string;
  fragile: boolean;
  rotation: PackedBlock["rotation"];
  color: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  size: {
    width: number;
    height: number;
    depth: number;
  };
  source: PackedBlock;
}

export function createPackingSceneBounds(bounds: PackingSceneBoundsInput): PackingSceneBounds {
  const longestAxis = Math.max(bounds.widthMm, bounds.depthMm, bounds.heightMm, 1);
  const scale = TARGET_LONGEST_AXIS_UNITS / longestAxis;

  return {
    width: roundSceneUnit(bounds.widthMm * scale),
    depth: roundSceneUnit(bounds.depthMm * scale),
    height: roundSceneUnit(bounds.heightMm * scale),
    scale: roundSceneUnit(scale)
  };
}

export function createPackingSceneBlocks(
  blocks: PackedBlock[],
  bounds: PackingSceneBoundsInput
): PackingSceneBlock[] {
  const sceneBounds = createPackingSceneBounds(bounds);

  return blocks.map((block) => ({
    blockId: block.blockId,
    blockTemplateId: block.blockTemplateId,
    name: block.name,
    fragile: block.fragile,
    rotation: block.rotation,
    color: getTemplateColor(block.blockTemplateId),
    position: {
      x: roundSceneUnit((block.xMm + block.widthMm / 2) * sceneBounds.scale - sceneBounds.width / 2),
      y: roundSceneUnit((block.zMm + block.heightMm / 2) * sceneBounds.scale),
      z: roundSceneUnit((block.yMm + block.depthMm / 2) * sceneBounds.scale - sceneBounds.depth / 2)
    },
    size: {
      width: roundSceneUnit(block.widthMm * sceneBounds.scale),
      height: roundSceneUnit(block.heightMm * sceneBounds.scale),
      depth: roundSceneUnit(block.depthMm * sceneBounds.scale)
    },
    source: block
  }));
}

export function getSceneTemplateColor(blockTemplateId: string) {
  return getTemplateColor(blockTemplateId);
}

function roundSceneUnit(value: number) {
  return Math.round(value * 1000) / 1000;
}
