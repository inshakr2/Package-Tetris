import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculatePackedBlocksFootprint,
  createPackingSceneBlocks,
  createPackingSceneBounds,
  createPackingSceneOrientationArrowLayout,
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

  it("방향 화살표 레이아웃은 얇은 면형 꼬리와 head/shaft/thickness 상한을 순수 유틸 계약으로 고정한다", () => {
    // Given
    const block = createBlock({
      widthMm: 100,
      depthMm: 80,
      heightMm: 60
    });
    const [sceneBlock] = createPackingSceneBlocks([block], bounds);

    // When
    const layout = createPackingSceneOrientationArrowLayout(sceneBlock!.size);
    const shortestSide = Math.min(sceneBlock!.size.width, sceneBlock!.size.height, sceneBlock!.size.depth);

    // Then
    assert.equal(layout.length, sceneBlock!.orientation.length);
    assert.equal(layout.outline.length, 8);
    assert.ok(layout.shaftWidth > 0);
    assert.ok(layout.headWidth > layout.shaftWidth);
    assert.ok(layout.headWidth >= layout.shaftWidth * 1.8);
    assert.ok(layout.headWidth <= shortestSide * 0.35);
    assert.ok(layout.headLength > 0);
    assert.ok(layout.thickness > 0);
    assert.ok(layout.thickness <= layout.headWidth * 0.16);
    assert.deepEqual(layout.outline.at(0), layout.outline.at(-1));
    assertClose(layout.outline[0]!.x, -layout.outline[1]!.x);
    assertClose(layout.outline[3]!.x, -layout.outline[5]!.x);
    assert.equal(layout.outline[4]?.x, 0);
  });

  it("방향 화살표 레이아웃은 작은 블록에서도 꼬리 폭과 두께를 블록 단축 기준 상한 안에 둔다", () => {
    // Given / When
    const layout = createPackingSceneOrientationArrowLayout({
      width: 0.08,
      height: 0.07,
      depth: 0.05
    });

    // Then
    assert.equal(layout.length, 0.18);
    assert.ok(layout.shaftWidth > 0);
    assert.ok(layout.headWidth > 0);
    assert.ok(layout.headWidth <= 0.05 * 0.35 + 0.001);
    assert.equal(layout.headLength, 0.08);
    assert.equal(layout.thickness, 0.003);
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

function assertClose(actual: number, expected: number, epsilon = 0.002) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}`
  );
}
