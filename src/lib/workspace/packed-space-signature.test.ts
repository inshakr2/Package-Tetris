import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPackedSpaceSignature } from "./packed-space-signature";
import { PackedBlock, PackedSpace } from "./types";

describe("packed-space-signature", () => {
  it("PackedSpace 블록을 z, y, x, 회전, 치수 순서로 정렬해 signature를 만든다", () => {
    // Given
    const space: PackedSpace = {
      spaceInstanceId: "space-a",
      utilizationRate: 0.5,
      blocks: [
        createBlock({ blockId: "later", xMm: 690, yMm: 0, zMm: 0, rotation: "yxz", widthMm: 370, depthMm: 690 }),
        createBlock({ blockId: "upper", xMm: 0, yMm: 0, zMm: 580 }),
        createBlock({ blockId: "first", xMm: 0, yMm: 0, zMm: 0 })
      ]
    };

    // When
    const signature = createPackedSpaceSignature(space);

    // Then
    assert.deepEqual(signature, [
      "z=0|y=0|x=0|rotation=xyz|w=690|d=370|h=580",
      "z=0|y=0|x=690|rotation=yxz|w=370|d=690|h=580",
      "z=580|y=0|x=0|rotation=xyz|w=690|d=370|h=580"
    ]);
  });
});

function createBlock(overrides: Partial<PackedBlock> = {}): PackedBlock {
  return {
    blockId: "block-a",
    blockTemplateId: "template-a",
    name: "검증 박스",
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 690,
    depthMm: 370,
    heightMm: 580,
    rotation: "xyz",
    ...overrides
  };
}
