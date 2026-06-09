import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFieldIntegerInput } from "./field-number-input";

describe("field-number-input", () => {
  it("빈 입력은 오류 상태를 반환해 필드에서 임시 편집값으로 유지할 수 있게 한다", () => {
    // Given / When
    const result = parseFieldIntegerInput("", { min: 1 });

    // Then
    assert.deepEqual(result, {
      status: "empty",
      value: null,
      message: "숫자를 입력하세요."
    });
  });

  it("숫자가 아닌 입력과 소수 입력은 정수 입력 오류를 반환한다", () => {
    // When
    const textResult = parseFieldIntegerInput("abc", { min: 1 });
    const decimalResult = parseFieldIntegerInput("12.5", { min: 1 });

    // Then
    assert.deepEqual(textResult, {
      status: "invalid",
      value: null,
      message: "정수만 입력하세요."
    });
    assert.deepEqual(decimalResult, {
      status: "invalid",
      value: null,
      message: "정수만 입력하세요."
    });
  });

  it("최소값보다 작은 정수는 최소값으로 보정한다", () => {
    // Given / When
    const quantity = parseFieldIntegerInput("0", { min: 1 });
    const offset = parseFieldIntegerInput("-10", { min: 0 });

    // Then
    assert.deepEqual(quantity, { status: "valid", value: 1, message: null });
    assert.deepEqual(offset, { status: "valid", value: 0, message: null });
  });

  it("공백이 포함된 정수는 정수값으로 사용한다", () => {
    // Given / When
    const result = parseFieldIntegerInput(" 240 ", { min: 1 });

    // Then
    assert.deepEqual(result, { status: "valid", value: 240, message: null });
  });
});
