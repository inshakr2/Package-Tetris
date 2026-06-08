export interface SaveConflictBannerNotice {
  storedRevision: number;
  incomingRevision: number;
  expectedRevision: number;
  storedUpdatedAt: string;
  source: "storage" | "remote";
}

export function getSaveConflictBannerCopy(saveConflict: SaveConflictBannerNotice) {
  const detail = `작업본 번호: 최신 ${saveConflict.storedRevision} · 이 화면 ${saveConflict.expectedRevision}`;

  if (saveConflict.source === "remote") {
    return {
      title: "다른 탭의 최신 작업본이 있어 이 화면은 잠시 멈췄습니다.",
      description: "최신본을 불러오거나, 지금 보이는 화면을 백업 파일로 남긴 뒤 다시 이어가세요.",
      detail,
      primaryLabel: "최신본 불러오기",
      secondaryLabel: "현재 화면 백업"
    };
  }

  return {
    title: "최신 작업본이 바뀌어 이 화면은 잠시 멈췄습니다.",
    description:
      "이 기기 저장 중 최신 작업본과 달라졌습니다. 최신본을 불러오거나, 지금 보이는 화면을 백업 파일로 남긴 뒤 다시 이어가세요.",
    detail,
    primaryLabel: "최신본 불러오기",
    secondaryLabel: "현재 화면 백업"
  };
}
