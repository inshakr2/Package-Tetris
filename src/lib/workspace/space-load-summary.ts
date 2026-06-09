import { PackedSpace } from "./types";

interface PackedSpaceLoadSummaryOptions {
  maxTypes?: number;
  emptyLabel?: string;
}

interface BlockTypeCount {
  blockTemplateId: string;
  name: string;
  quantity: number;
  firstIndex: number;
}

export function createPackedSpaceLoadSummary(
  packedSpace: PackedSpace,
  options: PackedSpaceLoadSummaryOptions = {}
): string {
  const maxTypes = options.maxTypes ?? 2;
  const emptyLabel = options.emptyLabel ?? "적재 박스 없음";

  if (packedSpace.blocks.length === 0) {
    return emptyLabel;
  }

  const typeCounts = new Map<string, BlockTypeCount>();

  packedSpace.blocks.forEach((block, index) => {
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
