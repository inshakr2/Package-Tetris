import type { Dimensions, PackedBlock, PackedSpace } from "./types";

const volumeFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 3
});

export function calculateResultRemainingVolumeM3(
  spaces: PackedSpace[],
  usableSize: Dimensions
) {
  const usableVolumeM3 = calculateDimensionsVolumeM3(usableSize);

  if (usableVolumeM3 <= 0 || spaces.length === 0) {
    return 0;
  }

  const totalCapacityM3 = usableVolumeM3 * spaces.length;
  const usedVolumeM3 = spaces.reduce((sum, space) => {
    return sum + space.blocks.reduce((spaceSum, block) => spaceSum + calculatePackedBlockVolumeM3(block), 0);
  }, 0);

  return roundVolumeM3(Math.max(0, totalCapacityM3 - usedVolumeM3));
}

export function formatVolumeM3(value: number) {
  return `${volumeFormatter.format(Math.max(0, value))}m³`;
}

function calculatePackedBlockVolumeM3(block: PackedBlock) {
  return calculateDimensionsVolumeM3({
    widthMm: block.widthMm,
    depthMm: block.depthMm,
    heightMm: block.heightMm
  });
}

function calculateDimensionsVolumeM3(dimensions: Dimensions) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}

function roundVolumeM3(value: number) {
  return Math.round(value * 1000) / 1000;
}
