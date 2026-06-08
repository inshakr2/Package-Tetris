import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSpaceDialogCopy } from "./space-dialog-copy";

describe("space-dialog-copy", () => {
  it("add 모드는 내 공간 추가 문구를 반환한다", () => {
    // Given

    // When
    const copy = getSpaceDialogCopy("add");

    // Then
    assert.deepEqual(copy, {
      title: "내 공간 추가",
      primaryLabel: "추가하고 선택",
      helperLabel: "기본값이 맞지 않을 때 직접 공간 크기와 안전 여유를 저장합니다."
    });
  });

  it("edit 모드는 내 공간 수정 문구를 반환한다", () => {
    // Given

    // When
    const copy = getSpaceDialogCopy("edit");

    // Then
    assert.deepEqual(copy, {
      title: "내 공간 수정",
      primaryLabel: "수정 저장",
      helperLabel: "현재 저장된 공간 크기와 안전 여유를 바꿉니다."
    });
  });
});
