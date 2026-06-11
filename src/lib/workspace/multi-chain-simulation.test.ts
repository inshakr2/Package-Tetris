import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_MULTI_CHAIN_ADDED_BLOCKS, runMultiChainSimulationV0 } from "./multi-chain-simulation";
import { BlockTemplate, PackedBlock, ResultSummary, SpaceDefinition } from "./types";

const TIMESTAMP = "2026-06-11T00:00:00.000Z";
const DEFAULT_POLICY = {
  fragileStackOnFragileAllowed: true,
  nonFragileOnFragileAllowed: false,
  partialSupportEnabled: false,
  minimumSupportRatio: 1
};

function createSpace(): SpaceDefinition {
  return {
    spaceId: "space-a",
    entityVersion: 1,
    name: "멀티 시뮬레이션 공간",
    type: "custom",
    dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
    offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function createTemplate(overrides: Partial<BlockTemplate> = {}): BlockTemplate {
  return {
    blockTemplateId: "template-a",
    entityVersion: 1,
    name: "A 박스",
    dimensions: { widthMm: 600, depthMm: 600, heightMm: 500 },
    fragile: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides
  };
}

function createPackedBlock(overrides: Partial<PackedBlock> = {}): PackedBlock {
  return {
    blockId: "base-block",
    blockTemplateId: "base-template",
    name: "기존 박스",
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 100,
    depthMm: 100,
    heightMm: 100,
    rotation: "xyz",
    ...overrides
  };
}

function createResult(blocks: PackedBlock[] = []): ResultSummary {
  return {
    resultId: "result-a",
    runId: "run-a",
    createdAt: TIMESTAMP,
    spaceSnapshot: createSpace(),
    usedSpaceCount: 1,
    averageUtilizationRate: 0,
    unloadedBlockCount: 0,
    spaces: [
      {
        spaceInstanceId: "space-instance-a",
        utilizationRate: 0,
        blocks
      }
    ]
  };
}

describe("multi-chain-simulation v0", () => {
  it("추가 시뮬레이션 박스는 최대 3개까지만 선택할 수 있다", () => {
    // Given
    const templates = ["a", "b", "c", "d"].map((suffix) =>
      createTemplate({
        blockTemplateId: `template-${suffix}`,
        name: `${suffix.toUpperCase()} 박스`
      })
    );

    // When
    const output = runMultiChainSimulationV0({
      result: createResult(),
      blockTemplates: templates,
      runId: "multi-run-too-many",
      policy: DEFAULT_POLICY
    });

    // Then
    assert.deepEqual(output.variants, []);
    assert.deepEqual(output.warnings, ["추가 시뮬레이션 박스는 최대 3개까지 선택할 수 있습니다."]);
  });

  it("추천 결과는 선택 박스 순서 후보 중 남은 부피가 가장 적은 variant를 선택한다", () => {
    // Given
    const squareBox = createTemplate({
      blockTemplateId: "template-square",
      name: "정사각 박스",
      dimensions: { widthMm: 600, depthMm: 600, heightMm: 500 }
    });
    const longBox = createTemplate({
      blockTemplateId: "template-long",
      name: "긴 박스",
      dimensions: { widthMm: 400, depthMm: 1000, heightMm: 500 }
    });

    // When
    const output = runMultiChainSimulationV0({
      result: createResult(),
      blockTemplates: [squareBox, longBox],
      runId: "multi-run-best",
      policy: DEFAULT_POLICY
    });
    const recommended = output.variants.find((variant) => variant.mode === "recommended");
    const longPriority = output.variants.find(
      (variant) => variant.mode === "template-priority" && variant.priorityBlockTemplateId === "template-long"
    );

    // Then
    assert.equal(output.recommendedVariantId, "multi-run-best-recommended");
    assert.deepEqual(recommended?.orderBlockTemplateIds, ["template-square", "template-long"]);
    assert.equal(recommended?.totalAddedQuantity, 5);
    assert.equal(recommended?.remainingVolumeM3, 0.04);
    assert.equal(longPriority?.remainingVolumeM3, 0.2);
    assert.ok(
      recommended && longPriority && recommended.remainingVolumeM3 < longPriority.remainingVolumeM3,
      "recommended variant should leave less volume than long-first priority"
    );
  });

  it("각 박스 우선 variant는 기존 배치 좌표를 바꾸지 않고 추가 박스만 뒤에 붙인다", () => {
    // Given
    const baseBlock = createPackedBlock();
    const result = createResult([baseBlock]);
    const template = createTemplate({
      blockTemplateId: "template-extra",
      name: "추가 박스",
      dimensions: { widthMm: 200, depthMm: 200, heightMm: 200 }
    });

    // When
    const output = runMultiChainSimulationV0({
      result,
      blockTemplates: [template],
      runId: "multi-run-locked",
      policy: DEFAULT_POLICY
    });
    const priority = output.variants.find((variant) => variant.mode === "template-priority");

    // Then
    assert.deepEqual(result.spaces?.[0]?.blocks, [baseBlock]);
    assert.deepEqual(priority?.spaces[0]?.blocks[0], baseBlock);
    assert.equal(priority?.spaces[0]?.blocks.some((block) => block.blockId.startsWith("multi-run-locked")), true);
  });

  it("variant별 추가 계산량은 상한을 넘지 않고 현장 안내 문구를 남긴다", () => {
    // Given
    const template = createTemplate({
      blockTemplateId: "template-small",
      name: "소형 박스",
      dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 }
    });

    // When
    const output = runMultiChainSimulationV0({
      result: createResult(),
      blockTemplates: [template],
      runId: "multi-run-capped",
      policy: DEFAULT_POLICY
    });
    const recommended = output.variants.find((variant) => variant.mode === "recommended");

    // Then
    assert.equal(recommended?.totalAddedQuantity, MAX_MULTI_CHAIN_ADDED_BLOCKS);
    assert.equal(recommended?.warnings.includes("계산량을 줄이기 위해 결과별 최대 300개까지만 계산했습니다."), true);
  });
});
