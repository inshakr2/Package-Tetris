import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSaveConflictBannerCopy } from "./save-conflict-banner-copy";

describe("save-conflict-banner-copy", () => {
  it("remote 충돌이면 현장 작업자용 제목, 설명, 버튼 문구를 반환한다", () => {
    // Given
    const saveConflict = {
      storedRevision: 12,
      incomingRevision: 11,
      expectedRevision: 10,
      storedUpdatedAt: "2026-06-09T10:00:00.000Z",
      source: "remote" as const
    };

    // When
    const copy = getSaveConflictBannerCopy(saveConflict);

    // Then
    assert.deepEqual(copy, {
      title: "다른 탭의 최신 작업본이 있어 이 화면은 잠시 멈췄습니다.",
      description: "최신본을 불러오거나, 지금 보이는 화면을 백업 파일로 남긴 뒤 다시 이어가세요.",
      detail: "작업본 번호: 최신 12 · 이 화면 10",
      primaryLabel: "최신본 불러오기",
      secondaryLabel: "현재 화면 백업"
    });
  });

  it("storage 충돌이면 저장 중 충돌 설명을 반환한다", () => {
    // Given
    const saveConflict = {
      storedRevision: 8,
      incomingRevision: 7,
      expectedRevision: 6,
      storedUpdatedAt: "2026-06-09T09:30:00.000Z",
      source: "storage" as const
    };

    // When
    const copy = getSaveConflictBannerCopy(saveConflict);

    // Then
    assert.equal(copy.title, "최신 작업본이 바뀌어 이 화면은 잠시 멈췄습니다.");
    assert.equal(
      copy.description,
      "이 기기 저장 중 최신 작업본과 달라졌습니다. 최신본을 불러오거나, 지금 보이는 화면을 백업 파일로 남긴 뒤 다시 이어가세요."
    );
    assert.equal(copy.detail, "작업본 번호: 최신 8 · 이 화면 6");
    assert.equal(copy.primaryLabel, "최신본 불러오기");
    assert.equal(copy.secondaryLabel, "현재 화면 백업");
  });
});
