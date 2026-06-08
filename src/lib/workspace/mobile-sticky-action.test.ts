import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMobileStickyActionState } from "./mobile-sticky-action";

describe("mobile-sticky-action", () => {
  it("작업본이 잠기면 최신본 안내와 불러오기 액션을 반환한다", () => {
    // Given
    const input = createInput({
      isWorkspaceLocked: true,
      saveStatus: "conflict"
    });

    // When
    const state = createMobileStickyActionState(input);

    // Then
    assert.deepEqual(state, {
      statusLabel: "최신본 필요",
      helperLabel: "다른 탭에서 저장된 최신 작업본을 불러와야 계속할 수 있습니다.",
      buttonLabel: "최신본 불러오기",
      action: "reload",
      tone: "red",
      disabled: false
    });
  });

  it("결과가 없고 실행 가능하면 결과 만들기 액션을 반환한다", () => {
    // Given
    const input = createInput({
      canCreateResult: true
    });

    // When
    const state = createMobileStickyActionState(input);

    // Then
    assert.deepEqual(state, {
      statusLabel: "입력 확인 완료",
      helperLabel: "지금 결과를 만들어 박스 배치를 확인할 수 있습니다.",
      buttonLabel: "결과 만들기",
      action: "create",
      tone: "green",
      disabled: false
    });
  });

  it("결과가 없고 실행 불가면 막힌 이유를 보여주고 버튼을 비활성화한다", () => {
    // Given
    const input = createInput({
      reviewCtaReason: "적재 공간을 선택하세요."
    });

    // When
    const state = createMobileStickyActionState(input);

    // Then
    assert.deepEqual(state, {
      statusLabel: "입력 확인 필요",
      helperLabel: "적재 공간을 선택하세요.",
      buttonLabel: "결과 만들기",
      action: "create",
      tone: "amber",
      disabled: true
    });
  });

  it("결과가 있고 이 기기 저장에 실패하면 백업 액션을 우선 반환한다", () => {
    // Given
    const input = createInput({
      hasResult: true,
      saveStatus: "error"
    });

    // When
    const state = createMobileStickyActionState(input);

    // Then
    assert.deepEqual(state, {
      statusLabel: "저장 실패",
      helperLabel: "이 기기 저장이 되지 않아 지금 백업 파일이 필요합니다.",
      buttonLabel: "지금 백업",
      action: "export",
      tone: "red",
      disabled: false
    });
  });

  it("결과가 있고 백업이 필요하면 백업 만들기 액션을 반환한다", () => {
    // Given
    const input = createInput({
      hasResult: true,
      needsExport: true
    });

    // When
    const state = createMobileStickyActionState(input);

    // Then
    assert.deepEqual(state, {
      statusLabel: "백업 필요",
      helperLabel: "결과를 다른 기기로 옮기려면 백업 파일을 만들어 두는 것이 안전합니다.",
      buttonLabel: "백업 만들기",
      action: "export",
      tone: "amber",
      disabled: false
    });
  });

  it("결과가 있지만 입력이 바뀌었으면 모바일 주요 액션은 다시 계산을 우선한다", () => {
    // Given
    const input = createInput({
      hasResult: true,
      isResultStale: true,
      canCreateResult: true,
      needsExport: true
    });

    // When
    const state = createMobileStickyActionState(input);

    // Then
    assert.deepEqual(state, {
      statusLabel: "입력 변경됨",
      helperLabel: "현재 결과는 이전 입력 기준입니다. 최신 입력으로 다시 계산하세요.",
      buttonLabel: "결과 다시 만들기",
      action: "create",
      tone: "amber",
      disabled: false
    });
  });
});

function createInput(
  overrides: Partial<Parameters<typeof createMobileStickyActionState>[0]> = {}
): Parameters<typeof createMobileStickyActionState>[0] {
  return {
    isWorkspaceLocked: false,
    hasResult: false,
    isResultStale: false,
    canCreateResult: false,
    reviewCtaLabel: "결과 만들기",
    reviewCtaReason: null,
    saveStatus: "saved",
    needsExport: false,
    ...overrides
  };
}
