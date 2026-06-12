import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runMultiChainSimulationV0 } from "./multi-chain-simulation";
import { runPackingEngineV0 } from "./packing-engine";
import { validateOptimizationOutputInvariants, validatePackedSpacesInvariants } from "./packing-engine-invariants";
import { DEFAULT_PALLET_SPACE_ID, findPresetSpaceById } from "./presets";
import type { OptimizationInput, OptimizationOutput } from "./engine-contract";
import type { BlockDefinition, BlockTemplate, ResultSummary } from "./types";

const TIMESTAMP = "2026-06-12T00:00:00.000Z";

describe("packing-engine field regression", () => {
  it("바람개비 기본 8개와 치수 순서 변형은 기본 파레트 1공간에 적재한다", () => {
    // Given
    const cases = [
      ["690x370x580", { widthMm: 690, depthMm: 370, heightMm: 580 }],
      ["370x690x580", { widthMm: 370, depthMm: 690, heightMm: 580 }],
      ["580x370x690", { widthMm: 580, depthMm: 370, heightMm: 690 }],
      ["690x580x370", { widthMm: 690, depthMm: 580, heightMm: 370 }]
    ] as const;

    cases.forEach(([label, dimensions]) => {
      // When
      const input = createInput(label, [createBlock(label, dimensions, 8)]);
      const output = runPackingEngineV0(input);

      // Then
      assertPinwheelOutput(input, output, { expectedUsedSpaceCount: 1, expectedPackedBlockCount: 8 });
    });
  });

  it("바람개비 9개 경계와 주변 치수는 미적재 없이 invariant를 통과한다", () => {
    // Given
    const cases = [
      ["690x370x580-9개", { widthMm: 690, depthMm: 370, heightMm: 580 }, 9, 2],
      ["691x370x580", { widthMm: 691, depthMm: 370, heightMm: 580 }, 8, 1],
      ["690x371x580", { widthMm: 690, depthMm: 371, heightMm: 580 }, 8, 1],
      ["690x370x581", { widthMm: 690, depthMm: 370, heightMm: 581 }, 8, 1]
    ] as const;

    cases.forEach(([label, dimensions, quantity, expectedUsedSpaceCount]) => {
      // When
      const input = createInput(label, [createBlock(label, dimensions, quantity)]);
      const output = runPackingEngineV0(input);

      // Then
      assertPinwheelOutput(input, output, {
        expectedUsedSpaceCount,
        expectedPackedBlockCount: quantity
      });
    });
  });

  it("현장 혼합 추가 시뮬레이션은 recommended/custom/template-priority 전체 variant가 invariant를 통과한다", () => {
    // Given
    const space = getDefaultPallet();
    const policy = createPolicy();
    const baseInput = createInput("field-feedback-base", [
      createBlock("field-feedback-small", { widthMm: 200, depthMm: 150, heightMm: 200 }, 60),
      createBlock("field-feedback-large", { widthMm: 1000, depthMm: 800, heightMm: 400 }, 5),
      createBlock("field-feedback-long", { widthMm: 965, depthMm: 300, heightMm: 200 }, 10),
      createBlock("field-feedback-mid", { widthMm: 600, depthMm: 250, heightMm: 150 }, 10)
    ]);
    const baseOutput = runPackingEngineV0(baseInput);
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
    const largeTemplate = createTemplate("field-feedback-chain-large", { widthMm: 1000, depthMm: 800, heightMm: 400 });
    const longTemplate = createTemplate("field-feedback-chain-long", { widthMm: 965, depthMm: 300, heightMm: 200 });
    const midTemplate = createTemplate("field-feedback-chain-mid", { widthMm: 600, depthMm: 250, heightMm: 150 });

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

    // Then
    assert.deepEqual(
      output.variants.map((variant) => variant.mode),
      ["recommended", "custom-priority", "template-priority", "template-priority", "template-priority"]
    );
    output.variants.forEach((variant) => {
      const validation = validatePackedSpacesInvariants({
        space,
        spaces: variant.spaces,
        policy,
        averageUtilizationRate: variant.averageUtilizationRate
      });

      assert.equal(validation.isValid, true, `${variant.label}: ${validation.reasons.join(", ")}`);
    });
  });
});

function assertPinwheelOutput(
  input: OptimizationInput,
  output: OptimizationOutput,
  {
    expectedUsedSpaceCount,
    expectedPackedBlockCount
  }: {
    expectedUsedSpaceCount: number;
    expectedPackedBlockCount: number;
  }
) {
  const validation = validateOptimizationOutputInvariants(input, output);
  const packedBlockCount = output.spaces.reduce((sum, space) => sum + space.blocks.length, 0);

  assert.equal(validation.isValid, true, validation.reasons.join(", "));
  assert.equal(output.usedSpaceCount, expectedUsedSpaceCount);
  assert.equal(output.unloadedBlockCount, 0);
  assert.equal(packedBlockCount, expectedPackedBlockCount);
}

function createInput(runId: string, blocks: BlockDefinition[]): OptimizationInput {
  return {
    runId,
    space: getDefaultPallet(),
    blocks,
    policy: {
      ...createPolicy(),
      rotation: "orthogonal-90deg"
    }
  };
}

function createPolicy() {
  return {
    fragileStackOnFragileAllowed: true,
    nonFragileOnFragileAllowed: false as const,
    partialSupportEnabled: false,
    minimumSupportRatio: 1
  };
}

function getDefaultPallet() {
  const space = findPresetSpaceById(DEFAULT_PALLET_SPACE_ID);
  assert.ok(space);
  return space;
}

function createBlock(
  blockId: string,
  dimensions: BlockDefinition["dimensions"],
  quantity: number
): BlockDefinition {
  return {
    blockId,
    blockTemplateId: `template-${blockId}`,
    draftBlockItemId: `item-${blockId}`,
    entityVersion: 1,
    name: `${blockId} 박스`,
    dimensions,
    quantity,
    fragile: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function createTemplate(blockId: string, dimensions: BlockTemplate["dimensions"]): BlockTemplate {
  return {
    blockTemplateId: `template-${blockId}`,
    entityVersion: 1,
    name: `${blockId} 박스`,
    dimensions,
    fragile: false,
    weightKg: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}
