import { BlockDefinition, Dimensions } from "./types";

export function hasPositiveDimensions(dimensions: Dimensions) {
  return (
    Number.isFinite(dimensions.widthMm) &&
    Number.isFinite(dimensions.depthMm) &&
    Number.isFinite(dimensions.heightMm) &&
    dimensions.widthMm > 0 &&
    dimensions.depthMm > 0 &&
    dimensions.heightMm > 0
  );
}

export function hasPositiveBlockQuantity(quantity: number) {
  return Number.isFinite(quantity) && Number.isInteger(quantity) && quantity > 0;
}

export function isValidBlockMeasurementInput(block: BlockDefinition) {
  return hasPositiveBlockQuantity(block.quantity) && hasPositiveDimensions(block.dimensions);
}

export function calculateBlockVolumeM3(block: BlockDefinition) {
  if (!isValidBlockMeasurementInput(block)) {
    return 0;
  }

  return dimensionsVolumeM3(block.dimensions) * block.quantity;
}

export function dimensionsVolumeM3(dimensions: Dimensions) {
  return (dimensions.widthMm * dimensions.depthMm * dimensions.heightMm) / 1_000_000_000;
}
