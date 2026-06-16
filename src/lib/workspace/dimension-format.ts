import { hasPositiveDimensions } from "./block-measurements";
import type { Dimensions } from "./types";

export function formatDimensions(dimensions: Dimensions) {
  if (!hasPositiveDimensions(dimensions)) {
    return "입력 확인 필요";
  }

  return `${dimensions.widthMm} / ${dimensions.depthMm} / ${dimensions.heightMm}mm`;
}
