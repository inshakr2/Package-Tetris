import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLocalSaveState } from "./storage-save-state";

describe("storage-save-state", () => {
  it("저장 충돌 상태는 작업본 번호 detail을 현장 언어로 반환한다", () => {
    // Given
    const saveConflict = {
      storedRevision: 12,
      incomingRevision: 11,
      expectedRevision: 10,
      storedUpdatedAt: "2026-06-09T10:00:00.000Z",
      source: "remote" as const
    };

    // When
    const state = createLocalSaveState({
      status: "conflict",
      error: null,
      lastLocalSavedLabel: null,
      saveConflict,
      otherTabCount: 1
    });

    // Then
    assert.equal(state.value, "다른 탭 최신본 감지");
    assert.equal(state.detail, "작업본 번호: 저장된 최신 12 · 현재 화면 10");
    assert.doesNotMatch(`${state.description} ${state.detail}`, /revision|저장소|저장 기준/);
  });

  it("충돌 상태지만 작업본 번호가 아직 없으면 최신본 불러오기와 백업 안내를 반환한다", () => {
    // Given / When
    const state = createLocalSaveState({
      status: "conflict",
      error: null,
      lastLocalSavedLabel: null,
      saveConflict: null,
      otherTabCount: 0
    });

    // Then
    assert.equal(state.tone, "red");
    assert.equal(state.value, "다른 탭 최신본 감지");
    assert.equal(state.detail, "최신 작업본을 불러오거나 현재 화면을 백업 파일로 남기세요.");
    assert.doesNotMatch(`${state.description} ${state.detail}`, /revision|저장소|저장 기준/);
  });

  it("저장 중 다른 탭이 열려 있으면 덮어쓰기 방지 안내를 반환한다", () => {
    // Given / When
    const state = createLocalSaveState({
      status: "saving",
      error: null,
      lastLocalSavedLabel: null,
      saveConflict: null,
      otherTabCount: 1
    });

    // Then
    assert.equal(state.value, "저장 중");
    assert.equal(
      state.detail,
      "다른 탭도 열려 있습니다. 작업본 번호를 비교해 오래된 화면이 최신 작업을 덮어쓰지 않게 막고 있습니다."
    );
    assert.doesNotMatch(state.detail ?? "", /revision|저장 기준/);
  });

  it("자동저장 완료 상태는 전달받은 마지막 저장 시각 문구를 사용한다", () => {
    // Given / When
    const state = createLocalSaveState({
      status: "saved",
      error: null,
      lastLocalSavedLabel: "6. 9. 오전 10:00",
      saveConflict: null,
      otherTabCount: 0
    });

    // Then
    assert.equal(state.tone, "green");
    assert.equal(state.value, "자동저장됨");
    assert.equal(state.description, "마지막 이 기기 저장: 6. 9. 오전 10:00");
    assert.equal(state.detail, null);
  });
});
