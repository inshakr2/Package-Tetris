import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getResultCalculationProgressCopy } from "./result-calculation-progress";

describe("result-calculation-progress", () => {
  it("검증 단계 문구를 반환한다", () => {
    // Given / When
    const copy = getResultCalculationProgressCopy("reviewing");

    // Then
    assert.equal(copy.statusLabel, "검증 중");
    assert.equal(copy.buttonLabel, "검증 중...");
    assert.match(copy.description, /입력 조건/);
  });

  it("적재 계산 단계 문구를 반환한다", () => {
    // Given / When
    const copy = getResultCalculationProgressCopy("packing");

    // Then
    assert.equal(copy.statusLabel, "적재 계산 중");
    assert.equal(copy.buttonLabel, "적재 계산 중...");
    assert.match(copy.description, /빈 공간/);
  });

  it("3D 생성 단계 문구를 반환한다", () => {
    // Given / When
    const copy = getResultCalculationProgressCopy("rendering");

    // Then
    assert.equal(copy.statusLabel, "3D 생성 중");
    assert.equal(copy.buttonLabel, "3D 생성 중...");
    assert.match(copy.description, /결과 화면/);
  });
});
