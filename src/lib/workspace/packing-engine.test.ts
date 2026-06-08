import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPackingEngineV0 } from "./packing-engine";
import { OptimizationInput } from "./engine-contract";

function createInput(overrides: Partial<OptimizationInput> = {}): OptimizationInput {
  return {
    runId: "run-a",
    space: {
      spaceId: "space-a",
      entityVersion: 1,
      name: "테스트 공간",
      type: "custom",
      dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
      offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
      createdAt: "2026-06-08T00:00:00.000Z",
      updatedAt: "2026-06-08T00:00:00.000Z"
    },
    blocks: [
      {
        blockId: "block-a",
        blockTemplateId: "template-a",
        draftBlockItemId: "item-a",
        entityVersion: 1,
        name: "A 박스",
        dimensions: { widthMm: 500, depthMm: 500, heightMm: 500 },
        quantity: 4,
        fragile: false,
        createdAt: "2026-06-08T00:00:00.000Z",
        updatedAt: "2026-06-08T00:00:00.000Z"
      }
    ],
    policy: {
      fragileStackOnFragileAllowed: true,
      nonFragileOnFragileAllowed: false,
      rotation: "orthogonal-90deg"
    },
    ...overrides
  };
}

describe("packing-engine v0", () => {
  it("같은 입력은 같은 좌표를 가진 결정론적 배치 결과를 만든다", () => {
    // Given
    const input = createInput();

    // When
    const firstOutput = runPackingEngineV0(input);
    const secondOutput = runPackingEngineV0(input);

    // Then
    assert.deepEqual(firstOutput, secondOutput);
    assert.equal(firstOutput.usedSpaceCount, 1);
    assert.equal(firstOutput.unloadedBlockCount, 0);
    assert.equal(firstOutput.spaces[0]?.blocks.length, 4);
    assert.deepEqual(
      firstOutput.spaces[0]?.blocks.map((block) => [block.xMm, block.yMm, block.zMm]),
      [
        [0, 0, 0],
        [500, 0, 0],
        [0, 500, 0],
        [500, 500, 0]
      ]
    );
  });

  it("블록 수량이 단일 공간을 넘으면 다음 공간 인스턴스를 사용한다", () => {
    // Given
    const input = createInput({
      blocks: [
        {
          ...createInput().blocks[0],
          quantity: 9
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);

    // Then
    assert.equal(output.usedSpaceCount, 2);
    assert.equal(output.spaces[0]?.blocks.length, 8);
    assert.equal(output.spaces[1]?.blocks.length, 1);
    assert.equal(output.averageUtilizationRate, 0.563);
  });

  it("fragile 위에 non-fragile이 올라가지 않도록 non-fragile을 먼저 배치한다", () => {
    // Given
    const input = createInput({
      blocks: [
        {
          ...createInput().blocks[0],
          blockId: "block-fragile",
          blockTemplateId: "template-fragile",
          name: "취급주의 박스",
          fragile: true,
          quantity: 1
        },
        {
          ...createInput().blocks[0],
          blockId: "block-normal",
          blockTemplateId: "template-normal",
          name: "일반 박스",
          fragile: false,
          quantity: 1
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);

    // Then
    assert.equal(output.spaces[0]?.blocks[0]?.blockTemplateId, "template-normal");
    assert.equal(output.spaces[0]?.blocks[1]?.blockTemplateId, "template-fragile");
  });

  it("90도 직교 회전을 적용해 들어갈 수 있는 방향을 선택한다", () => {
    // Given
    const input = createInput({
      space: {
        ...createInput().space,
        dimensions: { widthMm: 700, depthMm: 500, heightMm: 300 }
      },
      blocks: [
        {
          ...createInput().blocks[0],
          dimensions: { widthMm: 500, depthMm: 700, heightMm: 300 },
          quantity: 1
        }
      ]
    });

    // When
    const output = runPackingEngineV0(input);

    // Then
    assert.equal(output.unloadedBlockCount, 0);
    assert.equal(output.spaces[0]?.blocks[0]?.widthMm, 700);
    assert.equal(output.spaces[0]?.blocks[0]?.depthMm, 500);
    assert.equal(output.spaces[0]?.blocks[0]?.rotation, "yxz");
  });
});
