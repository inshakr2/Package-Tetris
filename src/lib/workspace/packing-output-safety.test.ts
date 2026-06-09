import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ensureSafeOptimizationOutput,
  UNSAFE_PACKING_RESULT_WARNING
} from "./packing-output-safety";
import { OptimizationInput, OptimizationOutput } from "./engine-contract";
import { PackedBlock } from "./types";

describe("packing-output-safety", () => {
  it("안전한 엔진 출력은 그대로 반환한다", () => {
    // Given
    const input = createInput();
    const output = createOutput([
      createPackedBlock({
        blockId: "floor",
        zMm: 0,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 500
      }),
      createPackedBlock({
        blockId: "top",
        zMm: 500,
        widthMm: 500,
        depthMm: 500,
        heightMm: 500
      })
    ]);

    // When
    const safeOutput = ensureSafeOptimizationOutput(input, output);

    // Then
    assert.deepEqual(safeOutput, output);
  });

  it("공중에 떠 있는 블록이 있으면 좌표를 폐기하고 전체 입력 수량을 미적재 처리한다", () => {
    // Given
    const input = createInput({
      blocks: [
        {
          ...createInput().blocks[0],
          quantity: 3
        }
      ]
    });
    const output = createOutput([
      createPackedBlock({
        blockId: "floating",
        zMm: 500
      })
    ]);

    // When
    const safeOutput = ensureSafeOptimizationOutput(input, output);

    // Then
    assert.equal(safeOutput.runId, output.runId);
    assert.equal(safeOutput.usedSpaceCount, 0);
    assert.equal(safeOutput.averageUtilizationRate, 0);
    assert.equal(safeOutput.unloadedBlockCount, 3);
    assert.deepEqual(safeOutput.spaces, []);
    assert.deepEqual(safeOutput.warnings, [UNSAFE_PACKING_RESULT_WARNING]);
  });

  it("안전 실패 경고는 기존 경고를 보존하되 중복으로 추가하지 않는다", () => {
    // Given
    const input = createInput();
    const output = createOutput(
      [
        createPackedBlock({
          blockId: "floating",
          zMm: 500
        })
      ],
      {
        warnings: ["기존 미적재 경고", UNSAFE_PACKING_RESULT_WARNING],
        unloadedBlockCount: 1
      }
    );

    // When
    const safeOutput = ensureSafeOptimizationOutput(input, output);

    // Then
    assert.equal(safeOutput.unloadedBlockCount, 2);
    assert.deepEqual(safeOutput.warnings, ["기존 미적재 경고", UNSAFE_PACKING_RESULT_WARNING]);
  });
});

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
      createdAt: "2026-06-09T00:00:00.000Z",
      updatedAt: "2026-06-09T00:00:00.000Z"
    },
    blocks: [
      {
        blockId: "block-a",
        blockTemplateId: "template-a",
        draftBlockItemId: "draft-a",
        entityVersion: 1,
        name: "A 박스",
        dimensions: { widthMm: 500, depthMm: 500, heightMm: 500 },
        quantity: 2,
        fragile: false,
        createdAt: "2026-06-09T00:00:00.000Z",
        updatedAt: "2026-06-09T00:00:00.000Z"
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

function createOutput(
  blocks: PackedBlock[],
  overrides: Partial<OptimizationOutput> = {}
): OptimizationOutput {
  return {
    runId: "run-a",
    usedSpaceCount: 1,
    averageUtilizationRate: 0.5,
    unloadedBlockCount: 0,
    spaces: [
      {
        spaceInstanceId: "space-instance-a",
        utilizationRate: 0.5,
        blocks
      }
    ],
    warnings: [],
    ...overrides
  };
}

function createPackedBlock(overrides: Partial<PackedBlock> = {}): PackedBlock {
  return {
    blockId: "packed-a",
    blockTemplateId: "template-a",
    name: "A 박스",
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 500,
    depthMm: 500,
    heightMm: 500,
    rotation: "xyz",
    ...overrides
  };
}
