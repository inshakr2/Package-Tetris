import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPlacementDetailRows } from "./placement-detail-table";
import { PackedBlock, PackedSpace } from "./types";

function createPackedSpace(blocks: PackedBlock[]): PackedSpace {
  return {
    spaceInstanceId: "space-1",
    utilizationRate: 0.48,
    blocks
  };
}

function createPackedBlock(overrides: Partial<PackedBlock> & Pick<PackedBlock, "blockId" | "name">): PackedBlock {
  return {
    blockTemplateId: "template-1",
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 300,
    depthMm: 200,
    heightMm: 100,
    rotation: "xyz",
    ...overrides
  };
}

describe("placement-detail-table", () => {
  it("바닥부터 앞쪽과 왼쪽 기준으로 배치 상세 행을 만든다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock({ blockId: "top", name: "상단 박스", zMm: 200, xMm: 0, yMm: 0 }),
      createPackedBlock({ blockId: "right", name: "오른쪽 박스", zMm: 0, xMm: 300, yMm: 100 }),
      createPackedBlock({ blockId: "front", name: "앞 박스", zMm: 0, xMm: 0, yMm: 0 })
    ]);

    // When
    const rows = createPlacementDetailRows(packedSpace);

    // Then
    assert.deepEqual(
      rows.map((row) => ({
        sequenceLabel: row.sequenceLabel,
        blockId: row.blockId,
        name: row.name,
        positionLabel: row.positionLabel
      })),
      [
        {
          sequenceLabel: "1번",
          blockId: "front",
          name: "앞 박스",
          positionLabel: "왼쪽 0mm · 앞 0mm · 바닥 0mm"
        },
        {
          sequenceLabel: "2번",
          blockId: "right",
          name: "오른쪽 박스",
          positionLabel: "왼쪽 300mm · 앞 100mm · 바닥 0mm"
        },
        {
          sequenceLabel: "3번",
          blockId: "top",
          name: "상단 박스",
          positionLabel: "왼쪽 0mm · 앞 0mm · 바닥 200mm"
        }
      ]
    );
  });

  it("깨짐주의와 회전 배치 여부를 현장 문구로 표시한다", () => {
    // Given
    const packedSpace = createPackedSpace([
      createPackedBlock({
        blockId: "rotated-fragile",
        blockTemplateId: "template-fragile",
        name: "긴 이름의 깨짐주의 제품 박스",
        fragile: true,
        widthMm: 120,
        depthMm: 300,
        heightMm: 450,
        rotation: "zxy"
      })
    ]);

    // When
    const [row] = createPlacementDetailRows(packedSpace);

    // Then
    assert.equal(row.name, "긴 이름의 깨짐주의 제품 박스");
    assert.equal(row.handlingLabel, "깨짐주의");
    assert.equal(row.sizeLabel, "120 x 300 x 450mm");
    assert.equal(row.directionLabel, "회전 배치");
  });

  it("적재 박스가 없으면 행을 만들지 않는다", () => {
    // Given
    const packedSpace = createPackedSpace([]);

    // When
    const rows = createPlacementDetailRows(packedSpace);

    // Then
    assert.deepEqual(rows, []);
  });
});
