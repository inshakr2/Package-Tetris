import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPackedSpaceLoadSummary } from "./space-load-summary";
import { PackedSpace } from "./types";

function createPackedSpace(blocks: PackedSpace["blocks"]): PackedSpace {
  return {
    spaceInstanceId: "space-1",
    utilizationRate: 0.52,
    blocks
  };
}

describe("space-load-summary", () => {
  it("가장 많은 박스 유형부터 최대 두 종류까지 대표 박스 구성을 요약한다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock("block-1", "template-floor-small", "바닥용 소형 박스"),
      createPackedBlock("block-2", "template-floor-small", "바닥용 소형 박스"),
      createPackedBlock("block-3", "template-top-large", "상단 대형 박스"),
      createPackedBlock("block-4", "template-floor-small", "바닥용 소형 박스")
    ]);

    // When
    const summary = createPackedSpaceLoadSummary(packedSpace);

    // Then
    assert.equal(summary, "바닥용 소형 박스 3개 · 상단 대형 박스 1개");
  });

  it("유형이 세 가지 이상이면 대표 두 종류 뒤에 외 N종으로 줄여서 보여준다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock("block-1", "template-floor-small", "바닥용 소형 박스"),
      createPackedBlock("block-2", "template-top-large", "상단 대형 박스"),
      createPackedBlock("block-3", "template-side-mid", "측면 중형 박스"),
      createPackedBlock("block-4", "template-floor-small", "바닥용 소형 박스"),
      createPackedBlock("block-5", "template-top-large", "상단 대형 박스")
    ]);

    // When
    const summary = createPackedSpaceLoadSummary(packedSpace);

    // Then
    assert.equal(summary, "바닥용 소형 박스 2개 · 상단 대형 박스 2개 · 외 1종");
  });

  it("같은 템플릿이라도 결과 안의 표시 이름이 다르면 별도 구성으로 보여준다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock("block-1", "template-renamed", "예전 이름 박스"),
      createPackedBlock("block-2", "template-renamed", "현재 이름 박스"),
      createPackedBlock("block-3", "template-renamed", "현재 이름 박스")
    ]);

    // When
    const summary = createPackedSpaceLoadSummary(packedSpace);

    // Then
    assert.equal(summary, "현재 이름 박스 2개 · 예전 이름 박스 1개");
  });

  it("적재된 박스가 없으면 빈 공간 안내를 반환한다", () => {
    // Given
    const packedSpace = createPackedSpace([]);

    // When
    const summary = createPackedSpaceLoadSummary(packedSpace);

    // Then
    assert.equal(summary, "적재 박스 없음");
  });
});

function createPackedBlock(blockId: string, blockTemplateId: string, name: string) {
  return {
    blockId,
    blockTemplateId,
    name,
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 100,
    depthMm: 100,
    heightMm: 100,
    rotation: "xyz" as const
  };
}
