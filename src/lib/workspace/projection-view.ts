import { PackedBlock } from "./types";
import { getTemplateColor } from "./block-colors";

export type ProjectionView = "top" | "front" | "side";

export interface ProjectionBounds {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

export interface ProjectedBlock {
  blockId: string;
  blockTemplateId: string;
  name: string;
  fragile: boolean;
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
  depthOrder: number;
  color: string;
}

export interface ProjectionLegendItem {
  blockTemplateId: string;
  name: string;
  fragile: boolean;
  quantity: number;
  color: string;
}

export function createProjectedBlocks(
  blocks: PackedBlock[],
  view: ProjectionView,
  bounds: ProjectionBounds
): ProjectedBlock[] {
  return blocks
    .map((block) => projectPackedBlock(block, view, bounds))
    .sort((left, right) => left.depthOrder - right.depthOrder || left.blockId.localeCompare(right.blockId));
}

export function projectPackedBlock(
  block: PackedBlock,
  view: ProjectionView,
  bounds: ProjectionBounds
): ProjectedBlock {
  const rect = createProjectionRect(block, view, bounds);

  return {
    blockId: block.blockId,
    blockTemplateId: block.blockTemplateId,
    name: block.name,
    fragile: block.fragile,
    color: getTemplateColor(block.blockTemplateId),
    ...rect
  };
}

export function createProjectionLegendItems(blocks: ProjectedBlock[]): ProjectionLegendItem[] {
  const groupMap = new Map<string, ProjectionLegendItem>();

  blocks.forEach((block) => {
    const existing = groupMap.get(block.blockTemplateId);

    if (existing) {
      existing.quantity += 1;
      existing.fragile = existing.fragile || block.fragile;
      return;
    }

    groupMap.set(block.blockTemplateId, {
      blockTemplateId: block.blockTemplateId,
      name: block.name,
      fragile: block.fragile,
      quantity: 1,
      color: block.color
    });
  });

  return Array.from(groupMap.values());
}

export function getProjectionViewLabel(view: ProjectionView) {
  if (view === "front") {
    return "앞";
  }

  if (view === "side") {
    return "옆";
  }

  return "위";
}

function createProjectionRect(block: PackedBlock, view: ProjectionView, bounds: ProjectionBounds) {
  if (view === "front") {
    return {
      leftPercent: toPercent(block.xMm, bounds.widthMm),
      topPercent: toInvertedPercent(block.zMm, block.heightMm, bounds.heightMm),
      widthPercent: toPercent(block.widthMm, bounds.widthMm),
      heightPercent: toPercent(block.heightMm, bounds.heightMm),
      depthOrder: block.yMm + block.depthMm
    };
  }

  if (view === "side") {
    return {
      leftPercent: toPercent(block.yMm, bounds.depthMm),
      topPercent: toInvertedPercent(block.zMm, block.heightMm, bounds.heightMm),
      widthPercent: toPercent(block.depthMm, bounds.depthMm),
      heightPercent: toPercent(block.heightMm, bounds.heightMm),
      depthOrder: block.xMm + block.widthMm
    };
  }

  return {
    leftPercent: toPercent(block.xMm, bounds.widthMm),
    topPercent: toPercent(block.yMm, bounds.depthMm),
    widthPercent: toPercent(block.widthMm, bounds.widthMm),
    heightPercent: toPercent(block.depthMm, bounds.depthMm),
    depthOrder: block.zMm + block.heightMm
  };
}

function toInvertedPercent(offsetMm: number, sizeMm: number, axisMm: number) {
  return roundPercent(100 - toPercent(offsetMm + sizeMm, axisMm));
}

function toPercent(valueMm: number, axisMm: number) {
  if (axisMm <= 0) {
    return 0;
  }

  return roundPercent((valueMm / axisMm) * 100);
}

function roundPercent(value: number) {
  return Math.round(value * 1000) / 1000;
}
