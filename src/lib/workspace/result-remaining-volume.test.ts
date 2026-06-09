import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateResultRemainingVolumeM3,
  formatVolumeM3
} from "./result-remaining-volume";
import type { PackedSpace } from "./types";

describe("result-remaining-volume", () => {
  it("사용 공간 전체의 적재 가능 부피에서 실제 적재 박스 부피를 뺀다", () => {
    // Given
    const spaces: PackedSpace[] = [
      {
        spaceInstanceId: "space-1",
        utilizationRate: 0.375,
        blocks: [
          createPackedBlock("block-1", {
            widthMm: 1000,
            depthMm: 500,
            heightMm: 500
          })
        ]
      },
      {
        spaceInstanceId: "space-2",
        utilizationRate: 0.125,
        blocks: [
          createPackedBlock("block-2", {
            widthMm: 500,
            depthMm: 500,
            heightMm: 500
          })
        ]
      }
    ];

    // When
    const remainingVolumeM3 = calculateResultRemainingVolumeM3(spaces, {
      widthMm: 1000,
      depthMm: 1000,
      heightMm: 1000
    });

    // Then
    assert.equal(remainingVolumeM3, 1.625);
  });

  it("비정상 결과나 초과 적재 데이터가 들어와도 남은 부피를 음수로 만들지 않는다", () => {
    // Given
    const spaces: PackedSpace[] = [
      {
        spaceInstanceId: "space-1",
        utilizationRate: 1.4,
        blocks: [
          createPackedBlock("block-1", {
            widthMm: 2000,
            depthMm: 1000,
            heightMm: 1000
          })
        ]
      }
    ];

    // When
    const remainingVolumeM3 = calculateResultRemainingVolumeM3(spaces, {
      widthMm: 1000,
      depthMm: 1000,
      heightMm: 1000
    });

    // Then
    assert.equal(remainingVolumeM3, 0);
  });

  it("현장 화면에는 m3 부피를 최대 소수 3자리로 표시한다", () => {
    // Given
    const values = [1.2345, 1.2, 0];

    // When
    const labels = values.map(formatVolumeM3);

    // Then
    assert.deepEqual(labels, ["1.235m³", "1.2m³", "0m³"]);
  });
});

function createPackedBlock(
  blockId: string,
  dimensions: {
    widthMm: number;
    depthMm: number;
    heightMm: number;
  }
) {
  return {
    blockId,
    blockTemplateId: `${blockId}-template`,
    name: blockId,
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: dimensions.widthMm,
    depthMm: dimensions.depthMm,
    heightMm: dimensions.heightMm,
    rotation: "xyz" as const
  };
}
