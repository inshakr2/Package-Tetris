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
  orientation: PackingSceneBlockOrientation;
  source: PackedBlock;
}

export interface PackingSceneBlockOrientation {
  direction: {
    x: number;
    y: number;
    z: number;
  };
  label: string;
  length: number;
  layout: PackingSceneOrientationArrowLayout;
}

export interface PackingSceneOrientationArrowLayoutPoint {
  x: number;
  y: number;
}

export interface PackingSceneOrientationArrowLayout {
  length: number;
  shaftWidth: number;
  headWidth: number;
  headLength: number;
  thickness: number;
  outline: PackingSceneOrientationArrowLayoutPoint[];
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

  return blocks.map((block) => {
    const size = {
      width: roundSceneUnit(block.widthMm * sceneBounds.scale),
      height: roundSceneUnit(block.heightMm * sceneBounds.scale),
      depth: roundSceneUnit(block.depthMm * sceneBounds.scale)
    };

    return {
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
      size,
      orientation: createPackingSceneBlockOrientation(block.rotation, size),
      source: block
    };
  });
}

export function calculatePackedBlocksFootprint(blocks: PackedBlock[]): PackingSceneBoundsInput {
  if (blocks.length === 0) {
    return {
      widthMm: 0,
      depthMm: 0,
      heightMm: 0
    };
  }

  return blocks.reduce(
    (footprint, block) => ({
      widthMm: Math.max(footprint.widthMm, block.xMm + block.widthMm),
      depthMm: Math.max(footprint.depthMm, block.yMm + block.depthMm),
      heightMm: Math.max(footprint.heightMm, block.zMm + block.heightMm)
    }),
    {
      widthMm: 0,
      depthMm: 0,
      heightMm: 0
    }
  );
}

export function getSceneTemplateColor(blockTemplateId: string) {
  return getTemplateColor(blockTemplateId);
}

export function createPackingSceneOrientationArrowLayout(
  size: PackingSceneBlock["size"]
): PackingSceneOrientationArrowLayout {
  const shortestSide = Math.max(Math.min(size.width, size.height, size.depth), 0);
  const length = roundSceneUnit(Math.max(shortestSide * 0.65, 0.18));
  const maxArrowWidth = Math.max(shortestSide * 0.35, 0.001);
  const shaftWidth = roundSceneUnit(Math.min(Math.max(length * 0.22, 0.055), maxArrowWidth));
  const headWidth = roundSceneUnit(
    Math.max(shaftWidth, Math.min(Math.max(length * 0.44, shaftWidth * 1.8), maxArrowWidth))
  );
  const headLength = roundSceneUnit(Math.min(Math.max(length * 0.28, 0.08), length * 0.45));
  const thickness = roundSceneUnit(Math.min(Math.max(shortestSide * 0.035, 0.012), maxArrowWidth * 0.16));
  const halfLength = length / 2;
  const neckY = halfLength - headLength;

  return {
    length,
    shaftWidth,
    headWidth,
    headLength,
    thickness,
    outline: [
      {
        x: roundSceneUnit(-shaftWidth / 2),
        y: roundSceneUnit(-halfLength)
      },
      {
        x: roundSceneUnit(shaftWidth / 2),
        y: roundSceneUnit(-halfLength)
      },
      {
        x: roundSceneUnit(shaftWidth / 2),
        y: roundSceneUnit(neckY)
      },
      {
        x: roundSceneUnit(headWidth / 2),
        y: roundSceneUnit(neckY)
      },
      {
        x: 0,
        y: roundSceneUnit(halfLength)
      },
      {
        x: roundSceneUnit(-headWidth / 2),
        y: roundSceneUnit(neckY)
      },
      {
        x: roundSceneUnit(-shaftWidth / 2),
        y: roundSceneUnit(neckY)
      },
      {
        x: roundSceneUnit(-shaftWidth / 2),
        y: roundSceneUnit(-halfLength)
      }
    ]
  };
}

function roundSceneUnit(value: number) {
  return Math.round(value * 1000) / 1000;
}

function createPackingSceneBlockOrientation(
  rotation: PackedBlock["rotation"],
  size: PackingSceneBlock["size"]
): PackingSceneBlockOrientation {
  const heightAxisIndex = rotation.indexOf("z");
  const layout = createPackingSceneOrientationArrowLayout(size);

  if (heightAxisIndex === 0) {
    return {
      direction: { x: 1, y: 0, z: 0 },
      label: "입력 높이: 가로 방향",
      length: layout.length,
      layout
    };
  }

  if (heightAxisIndex === 1) {
    return {
      direction: { x: 0, y: 0, z: 1 },
      label: "입력 높이: 세로 방향",
      length: layout.length,
      layout
    };
  }

  return {
    direction: { x: 0, y: 1, z: 0 },
    label: "입력 높이: 위쪽",
    length: layout.length,
    layout
  };
}
