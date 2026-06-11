import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_MULTI_CHAIN_ADDED_BLOCKS, runMultiChainSimulationV0 } from "./multi-chain-simulation";
import { runPackingEngineV0 } from "./packing-engine";
import { validatePackedResult } from "./packed-result-validation";
import { DEFAULT_PALLET_SPACE_ID, PRESET_SPACES } from "./presets";
import { BlockDefinition, BlockTemplate, PackedBlock, ResultSummary, SpaceDefinition } from "./types";

const TIMESTAMP = "2026-06-11T00:00:00.000Z";
const DEFAULT_POLICY = {
  fragileStackOnFragileAllowed: true,
  nonFragileOnFragileAllowed: false as const,
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

  it("선택 순서 우선순위 점수가 있으면 선택 순서 결과 variant를 추가한다", () => {
    // Given
    const firstTemplate = createTemplate({
      blockTemplateId: "template-first",
      name: "먼저 추가 박스",
      dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 }
    });
    const topTemplate = createTemplate({
      blockTemplateId: "template-top",
      name: "가장 먼저 박스",
      dimensions: { widthMm: 200, depthMm: 200, heightMm: 200 }
    });

    // When
    const output = runMultiChainSimulationV0({
      result: createResult(),
      blockTemplates: [firstTemplate, topTemplate],
      runId: "multi-run-custom-priority",
      policy: DEFAULT_POLICY,
      priorityByTemplateId: {
        [firstTemplate.blockTemplateId]: 5,
        [topTemplate.blockTemplateId]: 10
      }
    });
    const customPriority = output.variants.find((variant) => variant.mode === "custom-priority");

    // Then
    assert.equal(customPriority?.variantId, "multi-run-custom-priority-custom-priority");
    assert.equal(customPriority?.label, "선택 순서 결과");
    assert.deepEqual(customPriority?.orderBlockTemplateIds, ["template-top", "template-first"]);
    assert.equal(output.variants.filter((variant) => variant.mode === "custom-priority").length, 1);
  });

  it("선택 순서 우선순위 점수가 같으면 박스명 정렬이 아니라 사용자가 선택한 순서를 유지한다", () => {
    // Given
    const ampTemplate = createTemplate({
      blockTemplateId: "template-b",
      name: "A 우선 박스",
      dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 }
    });
    const speakerTemplate = createTemplate({
      blockTemplateId: "template-a",
      name: "B 우선 박스",
      dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 }
    });
    const priorityByTemplateId = {
      [ampTemplate.blockTemplateId]: 5,
      [speakerTemplate.blockTemplateId]: 5
    };

    // When
    const firstOutput = runMultiChainSimulationV0({
      result: createResult(),
      blockTemplates: [speakerTemplate, ampTemplate],
      runId: "multi-run-same-priority-a",
      policy: DEFAULT_POLICY,
      priorityByTemplateId
    });
    const secondOutput = runMultiChainSimulationV0({
      result: createResult(),
      blockTemplates: [ampTemplate, speakerTemplate],
      runId: "multi-run-same-priority-b",
      policy: DEFAULT_POLICY,
      priorityByTemplateId
    });
    const firstCustomPriority = firstOutput.variants.find((variant) => variant.mode === "custom-priority");
    const secondCustomPriority = secondOutput.variants.find((variant) => variant.mode === "custom-priority");

    // Then
    assert.deepEqual(firstCustomPriority?.orderBlockTemplateIds, ["template-a", "template-b"]);
    assert.deepEqual(secondCustomPriority?.orderBlockTemplateIds, ["template-b", "template-a"]);
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

  it("박스별 지정 수량은 해당 박스만 상한으로 제한하고 나머지 박스는 최대 수량으로 계산한다", () => {
    // Given
    const fixedTemplate = createTemplate({
      blockTemplateId: "template-fixed",
      name: "고정 수량 박스",
      dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 }
    });
    const maxTemplate = createTemplate({
      blockTemplateId: "template-max",
      name: "최대 계산 박스",
      dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 }
    });

    // When
    const output = runMultiChainSimulationV0({
      result: createResult(),
      blockTemplates: [fixedTemplate, maxTemplate],
      runId: "multi-run-template-limits",
      policy: DEFAULT_POLICY,
      requestedQuantitiesByTemplateId: {
        [fixedTemplate.blockTemplateId]: 10
      }
    });
    const recommended = output.variants.find((variant) => variant.mode === "recommended");
    const fixedQuantity = recommended?.addedQuantities.find(
      (item) => item.blockTemplateId === fixedTemplate.blockTemplateId
    );
    const maxQuantity = recommended?.addedQuantities.find(
      (item) => item.blockTemplateId === maxTemplate.blockTemplateId
    );

    // Then
    assert.equal(output.warnings.length, 0);
    assert.equal(fixedQuantity?.addedQuantity, 10);
    assert.ok((maxQuantity?.addedQuantity ?? 0) > 10, "unlimited template should keep filling the remaining capacity");
    assert.equal(recommended?.totalAddedQuantity, MAX_MULTI_CHAIN_ADDED_BLOCKS);
  });

  it("박스별 지정 수량이 1개 미만이면 계산하지 않고 현장 안내를 반환한다", () => {
    // Given
    const template = createTemplate({
      blockTemplateId: "template-invalid",
      name: "잘못된 수량 박스"
    });

    // When
    const output = runMultiChainSimulationV0({
      result: createResult(),
      blockTemplates: [template],
      runId: "multi-run-invalid-template-limit",
      policy: DEFAULT_POLICY,
      requestedQuantitiesByTemplateId: {
        [template.blockTemplateId]: 0
      }
    });

    // Then
    assert.deepEqual(output.variants, []);
    assert.deepEqual(output.warnings, ["박스별 지정 수량은 1개 이상 정수로 입력하세요."]);
  });

  it("부분 지지 허용 ON이면 추가 시뮬레이션도 55% 이상 받침면에 박스를 더 쌓는다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "support-block",
        widthMm: 600,
        depthMm: 1000,
        heightMm: 500
      })
    ]);
    const template = createTemplate({
      blockTemplateId: "template-partial",
      name: "부분 지지 박스",
      dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 500 }
    });

    // When
    const offOutput = runMultiChainSimulationV0({
      result,
      blockTemplates: [template],
      runId: "multi-run-partial-off",
      policy: DEFAULT_POLICY
    });
    const onOutput = runMultiChainSimulationV0({
      result,
      blockTemplates: [template],
      runId: "multi-run-partial-on",
      policy: {
        ...DEFAULT_POLICY,
        partialSupportEnabled: true,
        minimumSupportRatio: 0.55
      }
    });
    const offRecommended = offOutput.variants.find((variant) => variant.mode === "recommended");
    const onRecommended = onOutput.variants.find((variant) => variant.mode === "recommended");

    // Then
    assert.equal(offRecommended?.totalAddedQuantity, 0);
    assert.equal(onRecommended?.totalAddedQuantity, 1);
    assert.equal(onRecommended?.spaces[0]?.blocks.at(-1)?.zMm, 500);
  });

  it("깨짐주의 받침 정책은 추가 시뮬레이션 variant 계산에서도 유지된다", () => {
    // Given
    const result = createResult([
      createPackedBlock({
        blockId: "fragile-support",
        fragile: true,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      })
    ]);
    const template = createTemplate({
      blockTemplateId: "template-heavy",
      name: "일반 추가 박스",
      dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 500 },
      fragile: false
    });

    // When
    const output = runMultiChainSimulationV0({
      result,
      blockTemplates: [template],
      runId: "multi-run-fragile-policy",
      policy: DEFAULT_POLICY
    });
    const recommended = output.variants.find((variant) => variant.mode === "recommended");

    // Then
    assert.equal(recommended?.totalAddedQuantity, 0);
    assert.equal(recommended?.spaces[0]?.blocks.length, 1);
  });

  it("현장 피드백 혼합 파레트 결과에 선택 순서와 지정 수량으로 추가 적재를 계산한다", () => {
    // Given
    const space = findPresetSpace(DEFAULT_PALLET_SPACE_ID);
    const inputBlocks = [
      createBlockDefinition("field-small", "소형 박스", { widthMm: 200, depthMm: 150, heightMm: 200 }, 60),
      createBlockDefinition("field-large", "대형 박스", { widthMm: 1000, depthMm: 800, heightMm: 400 }, 5),
      createBlockDefinition("field-long", "장척 박스", { widthMm: 965, depthMm: 300, heightMm: 200 }, 10),
      createBlockDefinition("field-mid", "중형 박스", { widthMm: 600, depthMm: 250, heightMm: 150 }, 10)
    ];
    const policy = DEFAULT_POLICY;
    const baseOutput = runPackingEngineV0({
      runId: "field-feedback-base",
      space,
      blocks: inputBlocks,
      policy: {
        fragileStackOnFragileAllowed: policy.fragileStackOnFragileAllowed,
        nonFragileOnFragileAllowed: policy.nonFragileOnFragileAllowed,
        partialSupportEnabled: policy.partialSupportEnabled,
        minimumSupportRatio: policy.minimumSupportRatio,
        rotation: "orthogonal-90deg"
      }
    });
    const result: ResultSummary = {
      resultId: "field-feedback-result",
      runId: baseOutput.runId,
      createdAt: TIMESTAMP,
      spaceSnapshot: space,
      usedSpaceCount: baseOutput.usedSpaceCount,
      averageUtilizationRate: baseOutput.averageUtilizationRate,
      unloadedBlockCount: baseOutput.unloadedBlockCount,
      spaces: baseOutput.spaces,
      warnings: baseOutput.warnings
    };
    const largeTemplate = createTemplate({
      blockTemplateId: "template-field-large",
      name: "대형 추가 박스",
      dimensions: { widthMm: 1000, depthMm: 800, heightMm: 400 }
    });
    const longTemplate = createTemplate({
      blockTemplateId: "template-field-long",
      name: "장척 추가 박스",
      dimensions: { widthMm: 965, depthMm: 300, heightMm: 200 }
    });
    const midTemplate = createTemplate({
      blockTemplateId: "template-field-mid",
      name: "중형 추가 박스",
      dimensions: { widthMm: 600, depthMm: 250, heightMm: 150 }
    });

    // When
    const output = runMultiChainSimulationV0({
      result,
      blockTemplates: [largeTemplate, longTemplate, midTemplate],
      runId: "field-feedback-chain",
      policy,
      requestedQuantitiesByTemplateId: {
        [largeTemplate.blockTemplateId]: 6
      },
      priorityByTemplateId: {
        [largeTemplate.blockTemplateId]: 3,
        [longTemplate.blockTemplateId]: 2,
        [midTemplate.blockTemplateId]: 1
      }
    });
    const customPriority = output.variants.find((variant) => variant.mode === "custom-priority");

    // Then
    assert.equal(baseOutput.usedSpaceCount, 3);
    assert.equal(baseOutput.unloadedBlockCount, 0);
    assert.equal(validatePackedResult(result, policy).isValid, true);
    assert.deepEqual(
      customPriority?.addedQuantities.map((item) => item.blockTemplateId),
      ["template-field-large", "template-field-long", "template-field-mid"]
    );
    assert.ok(
      (customPriority?.remainingVolumeM3 ?? Number.POSITIVE_INFINITY) <= 1.084,
      "field feedback chain simulation should not regress below the current remaining-volume result"
    );
    assert.ok(
      (customPriority?.addedQuantities.find((item) => item.blockTemplateId === largeTemplate.blockTemplateId)
        ?.addedQuantity ?? 0) >= 2,
      "large-box priority should keep at least the currently observed 2 additional boxes"
    );
    assert.equal(
      validatePackedResult(
        {
          ...result,
          spaces: customPriority?.spaces ?? []
        },
        policy
      ).isValid,
      true
    );
  });

  it("선택 순서와 박스 우선 variant는 이미 계산한 순열 결과를 재사용한다", () => {
    // Given
    const templates = ["a", "b", "c"].map((suffix) =>
      createTemplate({
        blockTemplateId: `template-${suffix}`,
        name: `${suffix.toUpperCase()} 박스`,
        dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 }
      })
    );
    const chainRunIds: string[] = [];

    // When
    const output = runMultiChainSimulationV0({
      result: createResult([
        createPackedBlock({
          widthMm: 1000,
          depthMm: 1000,
          heightMm: 1000
        })
      ]),
      blockTemplates: templates,
      runId: "multi-run-reuse-orders",
      policy: DEFAULT_POLICY,
      priorityByTemplateId: {
        [templates[0]?.blockTemplateId ?? ""]: 3,
        [templates[1]?.blockTemplateId ?? ""]: 2,
        [templates[2]?.blockTemplateId ?? ""]: 1
      },
      chainRunner: (input) => {
        chainRunIds.push(input.runId);

        return {
          runId: input.runId,
          blockTemplateId: input.blockTemplate.blockTemplateId,
          blockName: input.blockTemplate.name,
          addedQuantity: 0,
          spaces: input.result.spaces ?? [],
          averageUtilizationRate: input.result.averageUtilizationRate,
          warnings: []
        };
      }
    });

    // Then
    assert.equal(output.variants.length, 5);
    assert.equal(chainRunIds.length, 18);
  });
});

function createBlockDefinition(
  blockId: string,
  name: string,
  dimensions: BlockDefinition["dimensions"],
  quantity: number
): BlockDefinition {
  return {
    blockId,
    blockTemplateId: `template-${blockId}`,
    draftBlockItemId: `draft-${blockId}`,
    entityVersion: 1,
    name,
    dimensions,
    quantity,
    fragile: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function findPresetSpace(spaceId: string) {
  const space = PRESET_SPACES.find((candidate) => candidate.spaceId === spaceId);

  if (!space) {
    throw new Error(`테스트 preset 공간을 찾을 수 없습니다: ${spaceId}`);
  }

  return space;
}
