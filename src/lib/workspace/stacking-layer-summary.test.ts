import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createStackingInstructionText,
  createStackingInstructionSteps,
  createStackingLayerSummaries
} from "./stacking-layer-summary";
import { PackedSpace } from "./types";

function createPackedSpace(blocks: PackedSpace["blocks"]): PackedSpace {
  return {
    spaceInstanceId: "space-1",
    utilizationRate: 0.52,
    blocks
  };
}

describe("stacking-layer-summary", () => {
  it("z 좌표가 낮은 바닥층부터 층별 적재 요약을 만든다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock("block-1", "template-top", "상단 박스", 240),
      createPackedBlock("block-2", "template-floor", "바닥 박스", 0),
      createPackedBlock("block-3", "template-middle", "중간 박스", 120)
    ]);

    // When
    const summaries = createStackingLayerSummaries(packedSpace);

    // Then
    assert.deepEqual(
      summaries.map((summary) => ({
        layerIndex: summary.layerIndex,
        zMm: summary.zMm,
        heightLabel: summary.heightLabel,
        blockCount: summary.blockCount,
        loadSummary: summary.loadSummary
      })),
      [
        {
          layerIndex: 1,
          zMm: 0,
          heightLabel: "바닥층",
          blockCount: 1,
          loadSummary: "바닥 박스 1개"
        },
        {
          layerIndex: 2,
          zMm: 120,
          heightLabel: "120mm 높이",
          blockCount: 1,
          loadSummary: "중간 박스 1개"
        },
        {
          layerIndex: 3,
          zMm: 240,
          heightLabel: "240mm 높이",
          blockCount: 1,
          loadSummary: "상단 박스 1개"
        }
      ]
    );
  });

  it("같은 층의 박스 유형은 수량이 많은 순으로 최대 두 종류까지 보여준다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock("block-1", "template-small", "소형 박스", 0),
      createPackedBlock("block-2", "template-long", "긴 박스", 0),
      createPackedBlock("block-3", "template-small", "소형 박스", 0),
      createPackedBlock("block-4", "template-wide", "넓은 박스", 0),
      createPackedBlock("block-5", "template-long", "긴 박스", 0),
      createPackedBlock("block-6", "template-small", "소형 박스", 0)
    ]);

    // When
    const [summary] = createStackingLayerSummaries(packedSpace);

    // Then
    assert.equal(summary.loadSummary, "소형 박스 3개 · 긴 박스 2개 · 외 1종");
    assert.equal(summary.blockCount, 6);
  });

  it("대표 유형 개수는 옵션으로 조정할 수 있다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock("block-1", "template-a", "A 박스", 0),
      createPackedBlock("block-2", "template-b", "B 박스", 0),
      createPackedBlock("block-3", "template-c", "C 박스", 0)
    ]);

    // When
    const [summary] = createStackingLayerSummaries(packedSpace, { maxTypes: 1 });

    // Then
    assert.equal(summary.loadSummary, "A 박스 1개 · 외 2종");
  });

  it("적재 박스가 없으면 층 요약을 만들지 않는다", () => {
    // Given
    const packedSpace = createPackedSpace([]);

    // When
    const summaries = createStackingLayerSummaries(packedSpace);

    // Then
    assert.deepEqual(summaries, []);
  });

  it("층별 요약을 현장 적재 지시 문장으로 바꾼다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock("block-1", "template-floor", "바닥 박스", 0),
      createPackedBlock("block-2", "template-top", "상단 박스", 100)
    ]);

    // When
    const instructions = createStackingInstructionSteps(packedSpace);

    // Then
    assert.deepEqual(instructions, [
      {
        stepIndex: 1,
        title: "1층",
        instruction: "바닥 박스 1개를 바닥에 먼저 놓습니다.",
        detail: "바닥층 · 총 1개"
      },
      {
        stepIndex: 2,
        title: "2층",
        instruction: "상단 박스 1개를 100mm 높이에 올립니다.",
        detail: "100mm 높이 · 총 1개"
      }
    ]);
  });

  it("대표 유형 수가 줄어든 지시 문장도 외 N종으로 압축한다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock("block-1", "template-a", "A 박스", 0),
      createPackedBlock("block-2", "template-b", "B 박스", 0),
      createPackedBlock("block-3", "template-c", "C 박스", 0)
    ]);

    // When
    const [instruction] = createStackingInstructionSteps(packedSpace, { maxTypes: 1 });

    // Then
    assert.equal(instruction.instruction, "A 박스 1개 · 외 2종을 바닥에 먼저 놓습니다.");
  });

  it("적재 박스가 없으면 현장 적재 지시도 만들지 않는다", () => {
    // Given
    const packedSpace = createPackedSpace([]);

    // When
    const instructions = createStackingInstructionSteps(packedSpace);

    // Then
    assert.deepEqual(instructions, []);
  });

  it("현장 적재 지시를 작업자가 전달하기 쉬운 여러 줄 텍스트로 만든다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock("block-1", "template-floor", "바닥 박스", 0),
      createPackedBlock("block-2", "template-top", "상단 박스", 100)
    ]);
    const instructions = createStackingInstructionSteps(packedSpace);

    // When
    const text = createStackingInstructionText("Space 1", instructions);

    // Then
    assert.equal(
      text,
      [
        "Space 1 쌓는 순서",
        "1층: 바닥 박스 1개를 바닥에 먼저 놓습니다. (바닥층 · 총 1개)",
        "2층: 상단 박스 1개를 100mm 높이에 올립니다. (100mm 높이 · 총 1개)"
      ].join("\n")
    );
  });

  it("현장 적재 지시가 없으면 복사용 텍스트도 비운다", () => {
    // Given
    const instructions = createStackingInstructionSteps(createPackedSpace([]));

    // When
    const text = createStackingInstructionText("Space 1", instructions);

    // Then
    assert.equal(text, "");
  });

  it("복사용 현장 적재 지시에 미적재와 경고 확인 문장을 포함한다", () => {
    // Given
    const packedSpace = createPackedSpace([createPackedBlock("block-1", "template-floor", "바닥 박스", 0)]);
    const instructions = createStackingInstructionSteps(packedSpace);

    // When
    const text = createStackingInstructionText("Space 1", instructions, {
      unloadedBlockCount: 2,
      warnings: ["부피로는 남아 보여도 안전하게 받칠 바닥이 부족해 공간이 나뉘었습니다."]
    });

    // Then
    assert.equal(
      text,
      [
        "Space 1 쌓는 순서",
        "확인 필요: 미적재 박스 2개가 있습니다. 결과 화면의 미적재 안내를 확인하세요.",
        "확인 필요: 부피로는 남아 보여도 안전하게 받칠 바닥이 부족해 공간이 나뉘었습니다.",
        "1층: 바닥 박스 1개를 바닥에 먼저 놓습니다. (바닥층 · 총 1개)"
      ].join("\n")
    );
  });

  it("복사용 현장 적재 지시는 중복 경고를 줄이고 추가 경고 건수를 압축한다", () => {
    // Given
    const packedSpace = createPackedSpace([createPackedBlock("block-1", "template-floor", "바닥 박스", 0)]);
    const instructions = createStackingInstructionSteps(packedSpace);

    // When
    const text = createStackingInstructionText("Space 1", instructions, {
      maxWarnings: 2,
      warnings: ["A 경고", "B 경고", "A 경고", "C 경고"]
    });

    // Then
    assert.equal(
      text,
      [
        "Space 1 쌓는 순서",
        "확인 필요: A 경고",
        "확인 필요: B 경고",
        "확인 필요: 외 1건의 경고가 더 있습니다. 결과 화면을 확인하세요.",
        "1층: 바닥 박스 1개를 바닥에 먼저 놓습니다. (바닥층 · 총 1개)"
      ].join("\n")
    );
  });
});

function createPackedBlock(blockId: string, blockTemplateId: string, name: string, zMm: number) {
  return {
    blockId,
    blockTemplateId,
    name,
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm,
    widthMm: 100,
    depthMm: 100,
    heightMm: 100,
    rotation: "xyz" as const
  };
}
