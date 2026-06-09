import { PackedSpace } from "./types";

interface StackingLayerSummaryOptions {
  maxTypes?: number;
}

export interface StackingLayerSummary {
  layerIndex: number;
  zMm: number;
  heightLabel: string;
  blockCount: number;
  loadSummary: string;
}

interface LayerGroup {
  zMm: number;
  blocks: PackedSpace["blocks"];
  firstIndex: number;
}

interface BlockTypeCount {
  blockTemplateId: string;
  name: string;
  quantity: number;
  firstIndex: number;
}

export function createStackingLayerSummaries(
  packedSpace: PackedSpace,
  options: StackingLayerSummaryOptions = {}
): StackingLayerSummary[] {
  if (packedSpace.blocks.length === 0) {
    return [];
  }

  const maxTypes = options.maxTypes ?? 2;
  const layerGroups = new Map<number, LayerGroup>();

  packedSpace.blocks.forEach((block, index) => {
    const existing = layerGroups.get(block.zMm);

    if (existing) {
      existing.blocks.push(block);
      return;
    }

    layerGroups.set(block.zMm, {
      zMm: block.zMm,
      blocks: [block],
      firstIndex: index
    });
  });

  return [...layerGroups.values()]
    .sort((left, right) => {
      if (left.zMm !== right.zMm) {
        return left.zMm - right.zMm;
      }

      return left.firstIndex - right.firstIndex;
    })
    .map((layer, index) => ({
      layerIndex: index + 1,
      zMm: layer.zMm,
      heightLabel: createHeightLabel(layer.zMm),
      blockCount: layer.blocks.length,
      loadSummary: createLayerLoadSummary(layer.blocks, maxTypes)
    }));
}

function createHeightLabel(zMm: number): string {
  if (zMm === 0) {
    return "바닥층";
  }

  return `${zMm}mm 높이`;
}

function createLayerLoadSummary(blocks: PackedSpace["blocks"], maxTypes: number): string {
  const typeCounts = new Map<string, BlockTypeCount>();

  blocks.forEach((block, index) => {
    const groupKey = `${block.blockTemplateId}:${block.name}`;
    const existing = typeCounts.get(groupKey);

    if (existing) {
      existing.quantity += 1;
      return;
    }

    typeCounts.set(groupKey, {
      blockTemplateId: block.blockTemplateId,
      name: block.name,
      quantity: 1,
      firstIndex: index
    });
  });

  const sortedTypes = [...typeCounts.values()].sort((left, right) => {
    if (right.quantity !== left.quantity) {
      return right.quantity - left.quantity;
    }

    return left.firstIndex - right.firstIndex;
  });
  const visibleTypes = sortedTypes.slice(0, maxTypes).map((type) => `${type.name} ${type.quantity}개`);
  const hiddenTypeCount = sortedTypes.length - visibleTypes.length;

  if (hiddenTypeCount > 0) {
    visibleTypes.push(`외 ${hiddenTypeCount}종`);
  }

  return visibleTypes.join(" · ");
}
