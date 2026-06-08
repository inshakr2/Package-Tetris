import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createPackingSceneBlocks,
  createPackingSceneBounds,
  getSceneTemplateColor
} from "./packing-scene";
import { projectPackedBlock } from "./projection-view";
import { PackedBlock } from "./types";

const bounds = {
  widthMm: 1000,
  depthMm: 500,
  heightMm: 800
};

function createBlock(overrides: Partial<PackedBlock> = {}): PackedBlock {
  return {
    blockId: "block-a",
    blockTemplateId: "template-a",
    name: "A 박스",
    fragile: false,
    xMm: 100,
    yMm: 50,
    zMm: 200,
    widthMm: 200,
    depthMm: 100,
    heightMm: 300,
    rotation: "xyz",
    ...overrides
  };
}

describe("packing-scene", () => {
  it("usable size를 가장 긴 축 12 단위 기준의 3D scene bounds로 변환한다", () => {
    // Given / When
    const sceneBounds = createPackingSceneBounds(bounds);

    // Then
    assert.deepEqual(sceneBounds, {
      width: 12,
      depth: 6,
      height: 9.6,
      scale: 0.012
    });
  });

  it("PackedBlock 좌표를 Three.js y-up 중심 좌표와 scale로 변환한다", () => {
    // Given
    const block = createBlock();

    // When
    const [sceneBlock] = createPackingSceneBlocks([block], bounds);

    // Then
    assert.deepEqual(
      {
        blockId: sceneBlock?.blockId,
        blockTemplateId: sceneBlock?.blockTemplateId,
        position: sceneBlock?.position,
        size: sceneBlock?.size
      },
      {
        blockId: "block-a",
        blockTemplateId: "template-a",
        position: {
          x: -3.6,
          y: 4.2,
          z: -1.8
        },
        size: {
          width: 2.4,
          height: 3.6,
          depth: 1.2
        }
      }
    );
  });

  it("블록 유형 색상은 2D 투영과 3D 렌더링에서 같은 값을 사용한다", () => {
    // Given
    const block = createBlock();

    // When
    const projectedBlock = projectPackedBlock(block, "top", bounds);

    // Then
    assert.equal(getSceneTemplateColor("template-a"), projectedBlock.color);
    assert.notEqual(getSceneTemplateColor("template-a"), getSceneTemplateColor("template-b"));
  });
});
