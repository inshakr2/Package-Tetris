import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createProjectedBlocks,
  createProjectionLegendItems,
  projectPackedBlock,
  ProjectionBounds
} from "./projection-view";
import { PackedBlock } from "./types";

const bounds: ProjectionBounds = {
  widthMm: 1000,
  depthMm: 500,
  heightMm: 600
};

function createBlock(overrides: Partial<PackedBlock> = {}): PackedBlock {
  return {
    blockId: "block-a",
    blockTemplateId: "template-a",
    name: "A 박스",
    fragile: false,
    xMm: 100,
    yMm: 200,
    zMm: 300,
    widthMm: 200,
    depthMm: 100,
    heightMm: 150,
    rotation: "xyz",
    ...overrides
  };
}

describe("projection-view", () => {
  it("상면 투영은 x/y 좌표와 가로/세로 치수를 평면 비율로 변환한다", () => {
    // Given
    const block = createBlock();

    // When
    const rect = projectPackedBlock(block, "top", bounds);

    // Then
    assert.deepEqual(
      {
        leftPercent: rect.leftPercent,
        topPercent: rect.topPercent,
        widthPercent: rect.widthPercent,
        heightPercent: rect.heightPercent,
        depthOrder: rect.depthOrder
      },
      {
        leftPercent: 10,
        topPercent: 40,
        widthPercent: 20,
        heightPercent: 20,
        depthOrder: 450
      }
    );
  });

  it("정면 투영은 z축을 화면 위쪽으로 반전해 높이 배치를 보여준다", () => {
    // Given
    const block = createBlock();

    // When
    const rect = projectPackedBlock(block, "front", bounds);

    // Then
    assert.deepEqual(
      {
        leftPercent: rect.leftPercent,
        topPercent: rect.topPercent,
        widthPercent: rect.widthPercent,
        heightPercent: rect.heightPercent,
        depthOrder: rect.depthOrder
      },
      {
        leftPercent: 10,
        topPercent: 25,
        widthPercent: 20,
        heightPercent: 25,
        depthOrder: 300
      }
    );
  });

  it("측면 투영은 y/z 좌표를 사용하고 x축 깊이 순서를 보존한다", () => {
    // Given
    const block = createBlock();

    // When
    const rect = projectPackedBlock(block, "side", bounds);

    // Then
    assert.deepEqual(
      {
        leftPercent: rect.leftPercent,
        topPercent: rect.topPercent,
        widthPercent: rect.widthPercent,
        heightPercent: rect.heightPercent,
        depthOrder: rect.depthOrder
      },
      {
        leftPercent: 40,
        topPercent: 25,
        widthPercent: 20,
        heightPercent: 25,
        depthOrder: 300
      }
    );
  });

  it("투영 블록과 범례는 블록 유형별 색상과 수량을 안정적으로 만든다", () => {
    // Given
    const blocks = [
      createBlock({ blockId: "block-a-1", blockTemplateId: "template-a", name: "A 박스" }),
      createBlock({ blockId: "block-a-2", blockTemplateId: "template-a", name: "A 박스" }),
      createBlock({ blockId: "block-b-1", blockTemplateId: "template-b", name: "B 박스", fragile: true })
    ];

    // When
    const projectedBlocks = createProjectedBlocks(blocks, "top", bounds);
    const legendItems = createProjectionLegendItems(projectedBlocks);

    // Then
    assert.equal(projectedBlocks[0]?.color, projectedBlocks[1]?.color);
    assert.notEqual(projectedBlocks[0]?.color, projectedBlocks[2]?.color);
    assert.deepEqual(
      legendItems.map((item) => ({
        blockTemplateId: item.blockTemplateId,
        name: item.name,
        quantity: item.quantity,
        fragile: item.fragile
      })),
      [
        { blockTemplateId: "template-a", name: "A 박스", quantity: 2, fragile: false },
        { blockTemplateId: "template-b", name: "B 박스", quantity: 1, fragile: true }
      ]
    );
  });
});
