import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPackingResultWarnings } from "./result-warnings";

describe("result-warnings", () => {
  it("실제 사용 공간 수가 부피 기준 최소 공간 수보다 크면 현장 안내 문구를 추가한다", () => {
    // Given
    const warnings = ["기존 경고"];

    // When
    const resultWarnings = createPackingResultWarnings({
      warnings,
      usedSpaceCount: 3,
      minimumSpaceCountLowerBound: 2
    });

    // Then
    assert.deepEqual(resultWarnings, [
      "기존 경고",
      "부피로는 남아 보여도 안전하게 받칠 바닥이 부족해 공간이 나뉘었습니다."
    ]);
  });

  it("실제 사용 공간 수가 부피 기준 최소 공간 수와 같거나 작으면 안내 문구를 추가하지 않는다", () => {
    // Given
    const warnings = ["기존 경고"];

    // When
    const resultWarnings = createPackingResultWarnings({
      warnings,
      usedSpaceCount: 2,
      minimumSpaceCountLowerBound: 2
    });

    // Then
    assert.deepEqual(resultWarnings, ["기존 경고"]);
  });
});
