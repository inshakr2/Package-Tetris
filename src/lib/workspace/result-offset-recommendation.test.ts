import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPackingEngineV0 } from "./packing-engine";
import {
  createOffsetAdjustmentRecommendation,
  OFFSET_RECOMMENDATION_REDUCTION_CANDIDATES_MM
} from "./result-offset-recommendation";
import type { OptimizationOutput } from "./engine-contract";
import type { PackedSpace, SpaceDefinition } from "./types";

const POLICY = {
  fragileStackOnFragileAllowed: true,
  nonFragileOnFragileAllowed: false as const,
  rotation: "orthogonal-90deg" as const
};

describe("result-offset-recommendation", () => {
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
});
