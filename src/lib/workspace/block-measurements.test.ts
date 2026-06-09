import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateBlockVolumeM3,
  hasPositiveBlockQuantity,
  hasPositiveDimensions,
  isValidBlockMeasurementInput
} from "./block-measurements";
import { BlockDefinition } from "./types";

function createBlock(overrides: Partial<BlockDefinition> = {}): BlockDefinition {
  return {
    blockId: "block-a",
    blockTemplateId: "template-a",
    draftBlockItemId: "item-a",
    entityVersion: 1,
    name: "기본 블록",
    dimensions: { widthMm: 300, depthMm: 220, heightMm: 180 },
    quantity: 10,
    fragile: false,
    createdAt: "2026-06-09T00:00:00.000Z",
    updatedAt: "2026-06-09T00:00:00.000Z",
    ...overrides
  };
}

describe("block-measurements", () => {
  it("정상 블록의 총 부피를 m3로 계산한다", () => {
    // Given
    const block = createBlock();

    // When
    const volumeM3 = calculateBlockVolumeM3(block);

    // Then
    assert.equal(volumeM3, 0.1188);
    assert.equal(isValidBlockMeasurementInput(block), true);
  });

  it("수량 또는 치수가 비정상 숫자이면 안전한 부피 0을 반환한다", () => {
    // Given
    const invalidQuantityBlock = createBlock({ quantity: Number.NaN });
    const invalidDimensionBlock = createBlock({
      dimensions: { widthMm: Number.POSITIVE_INFINITY, depthMm: 220, heightMm: 180 }
    });

    // When / Then
    assert.equal(calculateBlockVolumeM3(invalidQuantityBlock), 0);
    assert.equal(calculateBlockVolumeM3(invalidDimensionBlock), 0);
    assert.equal(isValidBlockMeasurementInput(invalidQuantityBlock), false);
    assert.equal(isValidBlockMeasurementInput(invalidDimensionBlock), false);
  });

  it("수량은 양의 정수, 치수는 유한한 양수만 유효하다", () => {
    // Given / When / Then
    assert.equal(hasPositiveBlockQuantity(3), true);
    assert.equal(hasPositiveBlockQuantity(3.5), false);
    assert.equal(hasPositiveBlockQuantity(Number.POSITIVE_INFINITY), false);
    assert.equal(hasPositiveDimensions({ widthMm: 1, depthMm: 1, heightMm: 1 }), true);
    assert.equal(hasPositiveDimensions({ widthMm: 0, depthMm: 1, heightMm: 1 }), false);
    assert.equal(hasPositiveDimensions({ widthMm: Number.NaN, depthMm: 1, heightMm: 1 }), false);
  });
});
