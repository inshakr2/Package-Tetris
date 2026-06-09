import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createResultCalculationFailure } from "./result-calculation-failure";

describe("result-calculation-failure", () => {
  it("브라우저가 계산을 중단한 오류를 작업자 문구로 바꾼다", () => {
    // Given
    const error = new Error("AbortError: calculation was interrupted");

    // When
    const failure = createResultCalculationFailure(error);

    // Then
    assert.equal(failure.title, "브라우저가 계산을 중단했습니다.");
    assert.match(failure.description, /다시 계산/);
  });

  it("메모리 부족 오류는 박스 수량 조정 안내로 바꾼다", () => {
    // Given
    const error = new RangeError("Maximum call stack size exceeded");

    // When
    const failure = createResultCalculationFailure(error);

    // Then
    assert.equal(failure.title, "브라우저 메모리가 부족해 계산을 멈췄습니다.");
    assert.match(failure.actionHint, /박스 수량/);
  });

  it("입력 제약 위반 오류는 입력 수정 안내로 바꾼다", () => {
    // Given
    const error = new Error("input constraint violation");

    // When
    const failure = createResultCalculationFailure(error);

    // Then
    assert.equal(failure.title, "입력 조건을 다시 확인해야 합니다.");
    assert.match(failure.actionHint, /입력 수정/);
  });

  it("알 수 없는 오류도 재시도 가능한 실패 안내로 바꾼다", () => {
    // Given / When
    const failure = createResultCalculationFailure(null);

    // Then
    assert.equal(failure.title, "계산을 완료하지 못했습니다.");
    assert.match(failure.description, /작업본/);
  });
});
