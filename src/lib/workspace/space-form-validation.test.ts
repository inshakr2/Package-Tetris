import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateSpaceForm } from "./space-form-validation";

describe("space-form-validation", () => {
  it("공간 크기와 안전 여유가 유효하면 통과한다", () => {
    // Given
    const input = {
      widthMm: 1200,
      depthMm: 1000,
      heightMm: 1500,
      offsetWidthMm: 50,
      offsetDepthMm: 50,
      offsetHeightMm: 80
    };

    // When
    const result = validateSpaceForm(input);

    // Then
    assert.deepEqual(result, { valid: true, message: null });
  });

  it("공간 크기가 1mm보다 작으면 저장할 수 없다", () => {
    // Given
    const input = {
      widthMm: 0,
      depthMm: 1000,
      heightMm: 1500,
      offsetWidthMm: 50,
      offsetDepthMm: 50,
      offsetHeightMm: 80
    };

    // When
    const result = validateSpaceForm(input);

    // Then
    assert.deepEqual(result, {
      valid: false,
      message: "공간 크기는 1mm 이상으로 입력하세요."
    });
  });

  it("안전 여유를 뺀 적재 가능 크기가 1mm보다 작으면 저장할 수 없다", () => {
    // Given
    const input = {
      widthMm: 100,
      depthMm: 1000,
      heightMm: 1500,
      offsetWidthMm: 100,
      offsetDepthMm: 50,
      offsetHeightMm: 80
    };

    // When
    const result = validateSpaceForm(input);

    // Then
    assert.deepEqual(result, {
      valid: false,
      message: "안전 여유를 뺀 적재 가능 크기가 1mm 이상이어야 합니다."
    });
  });
});
