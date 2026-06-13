import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateOptimizationOutputInvariants } from "./packing-engine-invariants";
import type { OptimizationInput, OptimizationOutput } from "./engine-contract";

describe("packing-engine-invariants", () => {
  it("엔진 출력의 수량, 사용 공간 수, 적재율, 안전 배치 invariant를 통과시킨다", () => {
    // Given
    const input = createInput();
    const output = createOutput();

    // When
    const validation = validateOptimizationOutputInvariants(input, output);

    // Then
    assert.deepEqual(validation, {
      isValid: true,
      reasons: []
    });
  });

  it("입력 수량과 처리 수량이 다르면 실패 이유를 반환한다", () => {
    // Given
    const input = createInput();
    const output = createOutput({ unloadedBlockCount: 1 });

    // When
    const validation = validateOptimizationOutputInvariants(input, output);

    // Then
    assert.equal(validation.isValid, false);
    assert.match(validation.reasons.join("\n"), /입력 2개, 적재 2개, 미적재 1개/);
  });

  it("같은 blockId가 중복 배치되면 실패 이유를 반환한다", () => {
    // Given
    const input = createInput();
    const output = createOutput({
      spaces: [
        {
          ...createOutput().spaces[0],
          blocks: [
            createOutput().spaces[0].blocks[0],
            {
              ...createOutput().spaces[0].blocks[1],
              blockId: "block-a"
            }
          ]
        }
      ]
    });

    // When
    const validation = validateOptimizationOutputInvariants(input, output);

    // Then
    assert.equal(validation.isValid, false);
    assert.match(validation.reasons.join("\n"), /같은 박스 ID가 중복 배치되었습니다/);
  });

  it("표시된 공간 수와 적재율이 실제 계산값과 다르면 실패 이유를 반환한다", () => {
    // Given
    const input = createInput();
    const output = createOutput({
      usedSpaceCount: 2,
      averageUtilizationRate: 0.1,
      spaces: [
        {
          ...createOutput().spaces[0],
          utilizationRate: 0.1
        }
      ]
    });

    // When
    const validation = validateOptimizationOutputInvariants(input, output);

    // Then
    assert.equal(validation.isValid, false);
    assert.match(validation.reasons.join("\n"), /사용 공간 수가 실제 공간 목록과 다릅니다/);
    assert.match(validation.reasons.join("\n"), /적재율이 실제 부피와 다릅니다/);
  });
});

function createInput(): OptimizationInput {
  return {
    runId: "invariant-run",
    space: {
      spaceId: "space-a",
      entityVersion: 1,
      name: "검증 공간",
      type: "custom",
      dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
      offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z"
    },
    blocks: [
      {
        blockId: "block-a",
        blockTemplateId: "template-a",
        draftBlockItemId: "item-a",
        entityVersion: 1,
        name: "A 박스",
        dimensions: { widthMm: 500, depthMm: 500, heightMm: 500 },
        quantity: 2,
        fragile: false,
        createdAt: "2026-06-12T00:00:00.000Z",
        updatedAt: "2026-06-12T00:00:00.000Z"
      }
    ],
    policy: {
      fragileStackOnFragileAllowed: true,
      nonFragileOnFragileAllowed: false,
      rotation: "orthogonal-90deg"
    }
  };
}

function createOutput(overrides: Partial<OptimizationOutput> = {}): OptimizationOutput {
  return {
    runId: "invariant-run",
    usedSpaceCount: 1,
    averageUtilizationRate: 0.25,
    unloadedBlockCount: 0,
    spaces: [
      {
        spaceInstanceId: "invariant-run-space-1",
        utilizationRate: 0.25,
        blocks: [
          {
            blockId: "block-a",
            blockTemplateId: "template-a",
            name: "A 박스",
            fragile: false,
            xMm: 0,
            yMm: 0,
            zMm: 0,
            widthMm: 500,
            depthMm: 500,
            heightMm: 500,
            rotation: "xyz"
          },
          {
            blockId: "block-b",
            blockTemplateId: "template-a",
            name: "A 박스",
            fragile: false,
            xMm: 500,
            yMm: 0,
            zMm: 0,
            widthMm: 500,
            depthMm: 500,
            heightMm: 500,
            rotation: "xyz"
          }
        ]
      }
    ],
    warnings: [],
    ...overrides
  };
}
