import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculatePackedBlocksFootprint,
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

  it("현재 결과의 최대 사용 치수는 블록의 끝 좌표 기준으로 계산한다", () => {
    // Given
    const blocks = [
      createBlock({
        xMm: 80,
        yMm: 40,
        zMm: 0,
        widthMm: 220,
        depthMm: 100,
        heightMm: 180
      }),
      createBlock({
        blockId: "block-b",
        xMm: 360,
        yMm: 260,
        zMm: 220,
        widthMm: 140,
        depthMm: 180,
        heightMm: 90
      })
    ];

    // When
    const footprint = calculatePackedBlocksFootprint(blocks);

    // Then
    assert.deepEqual(footprint, {
      widthMm: 500,
      depthMm: 440,
      heightMm: 310
    });
  });

  it("현재 결과에 블록이 없으면 최대 사용 치수는 0으로 표시한다", () => {
    // Given / When
    const footprint = calculatePackedBlocksFootprint([]);

    // Then
    assert.deepEqual(footprint, {
      widthMm: 0,
      depthMm: 0,
      heightMm: 0
    });
  });

  it("PackedBlock rotation으로 처음 입력한 높이 축의 3D 화살표 방향을 계산한다", () => {
    // Given
    const uprightBlock = createBlock({ rotation: "xyz" });
    const widthSideBlock = createBlock({ rotation: "zxy" });
    const depthSideBlock = createBlock({ rotation: "xzy" });

    // When
    const [uprightSceneBlock, widthSideSceneBlock, depthSideSceneBlock] = createPackingSceneBlocks(
      [uprightBlock, widthSideBlock, depthSideBlock],
      bounds
    );

    // Then
    assert.deepEqual(uprightSceneBlock?.orientation.direction, { x: 0, y: 1, z: 0 });
    assert.equal(uprightSceneBlock?.orientation.label, "입력 높이: 위쪽");

    assert.deepEqual(widthSideSceneBlock?.orientation.direction, { x: 1, y: 0, z: 0 });
    assert.equal(widthSideSceneBlock?.orientation.label, "입력 높이: 가로 방향");

    assert.deepEqual(depthSideSceneBlock?.orientation.direction, { x: 0, y: 0, z: 1 });
    assert.equal(depthSideSceneBlock?.orientation.label, "입력 높이: 세로 방향");
  });

  it("방향 화살표는 블록 크기에 맞는 양수 길이를 가진다", () => {
    // Given
    const block = createBlock({
      widthMm: 100,
      depthMm: 80,
      heightMm: 60
    });

    // When
    const [sceneBlock] = createPackingSceneBlocks([block], bounds);

    // Then
    assert.equal(sceneBlock?.orientation.length, 0.468);
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
