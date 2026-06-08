import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDeleteConfirmationCopy } from "./delete-confirmation-copy";

describe("delete-confirmation-copy", () => {
  it("space 삭제 문구를 반환한다", () => {
    // Given

    // When
    const copy = getDeleteConfirmationCopy("space", "현장 팔레트");

    // Then
    assert.deepEqual(copy, {
      title: "내 공간을 삭제할까요?",
      description: "현장 팔레트를 삭제하면 선택 중이던 경우 기본 공간으로 돌아갑니다.",
      confirmLabel: "내 공간 삭제"
    });
  });

  it("block-template 삭제 문구를 반환한다", () => {
    // Given

    // When
    const copy = getDeleteConfirmationCopy("block-template", "대형 박스");

    // Then
    assert.deepEqual(copy, {
      title: "저장된 박스를 삭제할까요?",
      description: "대형 박스를 삭제하면 저장된 박스와 이번 작업에 담긴 같은 박스도 함께 빠집니다.",
      confirmLabel: "저장된 박스 삭제"
    });
  });

  it("draft-block 삭제 문구를 반환한다", () => {
    // Given

    // When
    const copy = getDeleteConfirmationCopy("draft-block", "중형 박스");

    // Then
    assert.deepEqual(copy, {
      title: "이번 작업에서 박스를 제거할까요?",
      description: "중형 박스는 이번 작업에서만 빠지고 저장된 박스 목록은 그대로 남습니다.",
      confirmLabel: "작업에서 제거"
    });
  });
});
