import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runChainSimulationV0 } from "./chain-simulation";
import { BlockTemplate, PackedBlock, ResultSummary, SpaceDefinition } from "./types";

const TIMESTAMP = "2026-06-08T00:00:00.000Z";

function createSpace(): SpaceDefinition {
  return {
    spaceId: "space-a",
    entityVersion: 1,
    name: "테스트 공간",
    type: "custom",
    dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
    offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function createTemplate(overrides: Partial<BlockTemplate> = {}): BlockTemplate {
  return {
    blockTemplateId: "template-extra",
    entityVersion: 1,
    name: "추가 박스",
    dimensions: { widthMm: 500, depthMm: 500, heightMm: 500 },
    fragile: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides
  };
}

function createPackedBlock(overrides: Partial<PackedBlock> = {}): PackedBlock {
  return {
    blockId: "packed-a",
    blockTemplateId: "template-base",
    name: "기존 박스",
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 500,
    depthMm: 1000,
    heightMm: 1000,
    rotation: "xyz",
    ...overrides
  };
}

function createResult(blocks: PackedBlock[]): ResultSummary {
  return {
    resultId: "result-a",
    runId: "run-a",
    createdAt: TIMESTAMP,
    spaceSnapshot: createSpace(),
    usedSpaceCount: 1,
    averageUtilizationRate: 0.5,
    unloadedBlockCount: 0,
    spaces: [
      {
        spaceInstanceId: "space-instance-a",
        utilizationRate: 0.5,
        blocks
      }
    ]
  };
}

describe("chain-simulation v0", () => {
  it("기존 배치를 유지한 채 남은 공간에 선택 블록을 최대 수량까지 추가한다", () => {
    // Given
    const result = createResult([createPackedBlock()]);
    const template = createTemplate();

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: template,
      runId: "chain-run-a"
    });

    // Then
    assert.equal(output.addedQuantity, 4);
    assert.equal(output.spaces[0]?.blocks.length, 5);
    assert.deepEqual(
      output.spaces[0]?.blocks.slice(1).map((block) => [block.xMm, block.yMm, block.zMm]),
      [
        [500, 0, 0],
        [500, 500, 0],
        [500, 0, 500],
        [500, 500, 500]
      ]
    );
    assert.equal(output.averageUtilizationRate, 1);
  });

  it("기존 결과 공간이 꽉 차 있으면 추가 가능 수량 0을 반환한다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 1000
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate(),
      runId: "chain-run-full"
    });

    // Then
    assert.equal(output.addedQuantity, 0);
    assert.equal(output.spaces[0]?.blocks.length, 1);
  });

  it("non-fragile 추가 블록은 fragile 지지면 위에 배치하지 않는다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        fragile: true,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate({ fragile: false }),
      runId: "chain-run-fragile-support"
    });

    // Then
    assert.equal(output.addedQuantity, 0);
  });

  it("fragile 추가 블록은 fragile 지지면 위에도 배치할 수 있다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        fragile: true,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      })
    ]);

    // When
    const output = runChainSimulationV0({
      result,
      blockTemplate: createTemplate({ fragile: true }),
      runId: "chain-run-fragile-on-fragile"
    });

    // Then
    assert.equal(output.addedQuantity, 4);
    assert.equal(output.spaces[0]?.blocks.at(-1)?.zMm, 500);
  });
});
