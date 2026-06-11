import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPackingEngineV0 } from "./packing-engine";
import { DEFAULT_PALLET_SPACE_ID, findPresetSpaceById, OVERHANG_PALLET_SPACE_ID } from "./presets";
import {
  createOffsetAdjustmentRecommendation,
  createOverhangPalletRecommendation,
  OFFSET_RECOMMENDATION_REDUCTION_CANDIDATES_MM
} from "./result-offset-recommendation";
import type { OptimizationOutput } from "./engine-contract";
import type { BlockDefinition, PackedSpace, SpaceDefinition } from "./types";

const POLICY = {
  fragileStackOnFragileAllowed: true,
  nonFragileOnFragileAllowed: false as const,
  rotation: "orthogonal-90deg" as const
};

describe("result-offset-recommendation", () => {
  it("기본 파레트 결과가 오버행 파레트에서 공간 수가 줄어들면 검토 추천을 만든다", async () => {
    // Given
    const basicPallet = findPresetSpaceById(DEFAULT_PALLET_SPACE_ID);
    assert.ok(basicPallet);
    const blocks: BlockDefinition[] = [
      createBlockDefinition("template-overhang-fit", "오버행 경계 박스", {
        widthMm: 575,
        depthMm: 1000,
        heightMm: 100,
        quantity: 2
      })
    ];
    const baseSpaces: PackedSpace[] = [
      createPackedSpace("base-space-1", blocks[0], 0),
      createPackedSpace("base-space-2", blocks[0], 1)
    ];

    // When
    const recommendation = await createOverhangPalletRecommendation({
      space: basicPallet,
      blocks,
      spaces: baseSpaces,
      unloadedBlockCount: 0,
      policy: POLICY,
      runPackingEngine: runPackingEngineV0
    });

    // Then
    assert.ok(recommendation);
    assert.equal(recommendation.kind, "overhang-pallet");
    assert.equal(recommendation.suggestedSpace.spaceId, OVERHANG_PALLET_SPACE_ID);
    assert.equal(recommendation.originalUsedSpaceCount, 2);
    assert.equal(recommendation.improvedUsedSpaceCount, 1);
    assert.equal(recommendation.originalUnloadedBlockCount, 0);
    assert.equal(recommendation.improvedUnloadedBlockCount, 0);
    assert.equal(recommendation.previewSpaces.length, 1);
    assert.deepEqual(recommendation.usableSizeBefore, { widthMm: 1100, depthMm: 1100, heightMm: 1550 });
    assert.deepEqual(recommendation.usableSizeAfter, { widthMm: 1150, depthMm: 1150, heightMm: 1550 });
  });

  it("오버행 파레트 재계산으로 미적재가 줄어들면 공간 수가 같아도 검토 추천을 만든다", async () => {
    // Given
    const basicPallet = findPresetSpaceById(DEFAULT_PALLET_SPACE_ID);
    assert.ok(basicPallet);
    const blocks: BlockDefinition[] = [
      createBlockDefinition("template-unloaded", "미적재 경계 박스", {
        widthMm: 1150,
        depthMm: 1100,
        heightMm: 100,
        quantity: 1
      })
    ];

    // When
    const recommendation = await createOverhangPalletRecommendation({
      space: basicPallet,
      blocks,
      spaces: [],
      unloadedBlockCount: 1,
      policy: POLICY,
      runPackingEngine: runPackingEngineV0
    });

    // Then
    assert.ok(recommendation);
    assert.equal(recommendation.originalUsedSpaceCount, 0);
    assert.equal(recommendation.improvedUsedSpaceCount, 1);
    assert.equal(recommendation.originalUnloadedBlockCount, 1);
    assert.equal(recommendation.improvedUnloadedBlockCount, 0);
  });

  it("기본 파레트가 아니거나 오버행 재계산이 개선되지 않으면 추천하지 않는다", async () => {
    // Given
    const overhangPallet = findPresetSpaceById(OVERHANG_PALLET_SPACE_ID);
    const basicPallet = findPresetSpaceById(DEFAULT_PALLET_SPACE_ID);
    assert.ok(overhangPallet);
    assert.ok(basicPallet);
    const blocks: BlockDefinition[] = [
      createBlockDefinition("template-no-gain", "개선 없음 박스", {
        widthMm: 500,
        depthMm: 500,
        heightMm: 100,
        quantity: 1
      })
    ];
    const baseSpaces: PackedSpace[] = [createPackedSpace("base-space-1", blocks[0], 0)];

    // When
    const nonBasicRecommendation = await createOverhangPalletRecommendation({
      space: overhangPallet,
      blocks,
      spaces: baseSpaces,
      unloadedBlockCount: 0,
      policy: POLICY,
      runPackingEngine: runPackingEngineV0
    });
    const noGainRecommendation = await createOverhangPalletRecommendation({
      space: basicPallet,
      blocks,
      spaces: baseSpaces,
      unloadedBlockCount: 0,
      policy: POLICY,
      runPackingEngine: runPackingEngineV0
    });

    // Then
    assert.equal(nonBasicRecommendation, null);
    assert.equal(noGainRecommendation, null);
  });

  it("오버행 추천 재계산은 현재 결과와 같은 적재 policy를 그대로 사용한다", async () => {
    // Given
    const basicPallet = findPresetSpaceById(DEFAULT_PALLET_SPACE_ID);
    assert.ok(basicPallet);
    const policy = {
      fragileStackOnFragileAllowed: false,
      nonFragileOnFragileAllowed: false as const,
      rotation: "orthogonal-90deg" as const
    };
    const blocks: BlockDefinition[] = [
      createBlockDefinition("template-policy", "정책 확인 박스", {
        widthMm: 575,
        depthMm: 1000,
        heightMm: 100,
        quantity: 2
      })
    ];
    const receivedPolicies: Array<typeof policy> = [];

    // When
    await createOverhangPalletRecommendation({
      space: basicPallet,
      blocks,
      spaces: [createPackedSpace("base-space-1", blocks[0], 0), createPackedSpace("base-space-2", blocks[0], 1)],
      unloadedBlockCount: 0,
      policy,
      runPackingEngine: async (input): Promise<OptimizationOutput> => {
        receivedPolicies.push(input.policy);
        return {
          runId: input.runId,
          usedSpaceCount: 1,
          averageUtilizationRate: 0.7,
          unloadedBlockCount: 0,
          spaces: [createPackedSpace("candidate-space-1", blocks[0], 0)],
          warnings: []
        };
      }
    });

    // Then
    assert.deepEqual(receivedPolicies, [policy]);
  });

  it("안전 여유를 조금 줄이면 공간 수가 줄어드는 경계 결과를 추천한다", async () => {
    // Given
    const space: SpaceDefinition = {
      spaceId: "space-tight",
      entityVersion: 1,
      name: "경계 테스트 공간",
      type: "custom",
      dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 },
      offset: { widthMm: 10, depthMm: 0, heightMm: 0 },
      createdAt: "2026-06-09T00:00:00.000Z",
      updatedAt: "2026-06-09T00:00:00.000Z"
    };
    const baseSpaces: PackedSpace[] = [
      {
        spaceInstanceId: "base-space-1",
        utilizationRate: 0.5,
        blocks: [
          {
            blockId: "block-a",
            blockTemplateId: "template-a",
            name: "경계 박스",
            fragile: false,
            xMm: 0,
            yMm: 0,
            zMm: 0,
            widthMm: 50,
            depthMm: 90,
            heightMm: 10,
            rotation: "xyz"
          }
        ]
      },
      {
        spaceInstanceId: "base-space-2",
        utilizationRate: 0.5,
        blocks: [
          {
            blockId: "block-b",
            blockTemplateId: "template-a",
            name: "경계 박스",
            fragile: false,
            xMm: 0,
            yMm: 0,
            zMm: 0,
            widthMm: 50,
            depthMm: 90,
            heightMm: 10,
            rotation: "xyz"
          }
        ]
      }
    ];

    // When
    const recommendation = await createOffsetAdjustmentRecommendation({
      space,
      spaces: baseSpaces,
      policy: POLICY,
      runPackingEngine: runPackingEngineV0
    });

    // Then
    assert.ok(recommendation);
    assert.equal(recommendation.reductionMm, 10);
    assert.equal(recommendation.originalUsedSpaceCount, 2);
    assert.equal(recommendation.improvedUsedSpaceCount, 1);
    assert.equal(recommendation.previewSpaces.length, 1);
    assert.equal(recommendation.previewSpaces[0]?.blocks.length, 2);
    assert.deepEqual(recommendation.suggestedOffset, { widthMm: 0, depthMm: 0, heightMm: 0 });
    assert.deepEqual(recommendation.usableSizeBefore, { widthMm: 90, depthMm: 100, heightMm: 100 });
    assert.deepEqual(recommendation.usableSizeAfter, { widthMm: 100, depthMm: 100, heightMm: 100 });
  });

  it("단일 공간 결과나 미적재가 생기는 후보는 추천하지 않는다", async () => {
    // Given
    const space: SpaceDefinition = {
      spaceId: "space-single",
      entityVersion: 1,
      name: "단일 공간",
      type: "custom",
      dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 },
      offset: { widthMm: 10, depthMm: 10, heightMm: 10 },
      createdAt: "2026-06-09T00:00:00.000Z",
      updatedAt: "2026-06-09T00:00:00.000Z"
    };
    const singleSpace: PackedSpace[] = [
      {
        spaceInstanceId: "base-space-1",
        utilizationRate: 0.5,
        blocks: [
          {
            blockId: "block-a",
            blockTemplateId: "template-a",
            name: "단일 박스",
            fragile: false,
            xMm: 0,
            yMm: 0,
            zMm: 0,
            widthMm: 40,
            depthMm: 40,
            heightMm: 40,
            rotation: "xyz"
          }
        ]
      }
    ];
    const twoSpaces = [...singleSpace, { ...singleSpace[0], spaceInstanceId: "base-space-2" }];
    const unloadsBlocks = async (): Promise<OptimizationOutput> => ({
      runId: "offset-test",
      usedSpaceCount: 1,
      averageUtilizationRate: 1,
      unloadedBlockCount: 1,
      spaces: singleSpace,
      warnings: ["미적재"]
    });

    // When
    const singleSpaceRecommendation = await createOffsetAdjustmentRecommendation({
      space,
      spaces: singleSpace,
      policy: POLICY,
      runPackingEngine: runPackingEngineV0
    });
    const unsafeRecommendation = await createOffsetAdjustmentRecommendation({
      space,
      spaces: twoSpaces,
      policy: POLICY,
      runPackingEngine: unloadsBlocks
    });

    // Then
    assert.equal(singleSpaceRecommendation, null);
    assert.equal(unsafeRecommendation, null);
  });

  it("추천 후보는 작은 안전 여유 조정부터 제한된 수량만 검사한다", () => {
    // Given / When / Then
    assert.deepEqual(OFFSET_RECOMMENDATION_REDUCTION_CANDIDATES_MM, [10, 20, 50]);
  });

  it("후보는 작은 조정부터 검사하고 개선 후보를 찾으면 추가 계산하지 않는다", async () => {
    // Given
    const space: SpaceDefinition = {
      spaceId: "space-stop",
      entityVersion: 1,
      name: "순서 테스트 공간",
      type: "custom",
      dimensions: { widthMm: 100, depthMm: 100, heightMm: 100 },
      offset: { widthMm: 50, depthMm: 0, heightMm: 0 },
      createdAt: "2026-06-09T00:00:00.000Z",
      updatedAt: "2026-06-09T00:00:00.000Z"
    };
    const baseSpace: PackedSpace = {
      spaceInstanceId: "base-space-1",
      utilizationRate: 0.5,
      blocks: [
        {
          blockId: "block-a",
          blockTemplateId: "template-a",
          name: "순서 박스",
          fragile: false,
          xMm: 0,
          yMm: 0,
          zMm: 0,
          widthMm: 20,
          depthMm: 20,
          heightMm: 20,
          rotation: "xyz"
        }
      ]
    };
    const triedOffsets: number[] = [];

    // When
    const recommendation = await createOffsetAdjustmentRecommendation({
      space,
      spaces: [
        { ...baseSpace, spaceInstanceId: "base-space-1" },
        { ...baseSpace, spaceInstanceId: "base-space-2" },
        { ...baseSpace, spaceInstanceId: "base-space-3" }
      ],
      policy: POLICY,
      runPackingEngine: async (input): Promise<OptimizationOutput> => {
        triedOffsets.push(input.space.offset.widthMm);

        return {
          runId: input.runId,
          usedSpaceCount: input.space.offset.widthMm === 30 ? 2 : 3,
          averageUtilizationRate: 0.4,
          unloadedBlockCount: 0,
          spaces: [{ ...baseSpace, spaceInstanceId: `candidate-${input.space.offset.widthMm}` }],
          warnings: []
        };
      }
    });

    // Then
    assert.equal(recommendation?.reductionMm, 20);
    assert.deepEqual(triedOffsets, [40, 30]);
  });
});

function createBlockDefinition(
  blockTemplateId: string,
  name: string,
  options: { widthMm: number; depthMm: number; heightMm: number; quantity: number }
): BlockDefinition {
  return {
    blockId: `${blockTemplateId}-block`,
    blockTemplateId,
    draftBlockItemId: `${blockTemplateId}-item`,
    entityVersion: 1,
    name,
    dimensions: {
      widthMm: options.widthMm,
      depthMm: options.depthMm,
      heightMm: options.heightMm
    },
    quantity: options.quantity,
    fragile: false,
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z"
  };
}

function createPackedSpace(spaceInstanceId: string, block: BlockDefinition, index: number): PackedSpace {
  return {
    spaceInstanceId,
    utilizationRate: 0.1,
    blocks: [
      {
        blockId: `${block.blockId}-${index + 1}`,
        blockTemplateId: block.blockTemplateId,
        name: block.name,
        fragile: block.fragile,
        xMm: 0,
        yMm: 0,
        zMm: 0,
        widthMm: block.dimensions.widthMm,
        depthMm: block.dimensions.depthMm,
        heightMm: block.dimensions.heightMm,
        rotation: "xyz"
      }
    ]
  };
}
