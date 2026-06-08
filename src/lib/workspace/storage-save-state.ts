import { createSaveConflictVersionDetail } from "./save-conflict-banner-copy";

export type LocalSaveStatus = "loading" | "saving" | "saved" | "error" | "conflict";

export interface LocalSaveConflictNotice {
  storedRevision: number;
  incomingRevision: number;
  expectedRevision: number;
  storedUpdatedAt: string;
  source: "storage" | "remote";
}

export interface LocalSaveStateInput {
  status: LocalSaveStatus;
  error: string | null;
  lastLocalSavedLabel: string | null;
  saveConflict: LocalSaveConflictNotice | null;
  otherTabCount: number;
}

export interface LocalSaveStateCopy {
  tone: "green" | "amber" | "red" | "neutral";
  value: string;
  description: string;
  detail: string | null;
}

export function createLocalSaveState(input: LocalSaveStateInput): LocalSaveStateCopy {
  if (input.status === "conflict" || input.saveConflict) {
    return {
      tone: "red",
      value: "다른 탭 최신본 감지",
      description: "이 화면은 보호를 위해 잠겼습니다. 최신본을 불러오면 계속할 수 있습니다.",
      detail: input.saveConflict
        ? createSaveConflictVersionDetail(input.saveConflict)
        : "최신 작업본을 불러오거나 현재 화면을 백업 파일로 남기세요."
    };
  }

  if (input.status === "error") {
    return {
      tone: "red",
      value: "저장 실패",
      description: input.error
        ? `브라우저 저장소에 쓰지 못했습니다. ${input.error}`
        : "브라우저 저장소에 쓰지 못했습니다. 이 기기 저장이 불안정할 수 있습니다.",
      detail: null
    };
  }

  if (input.status === "loading") {
    return {
      tone: "amber",
      value: "불러오는 중",
      description: "이 기기에 저장된 작업본을 확인하고 있습니다.",
      detail: null
    };
  }

  if (input.status === "saving") {
    return {
      tone: "amber",
      value: "저장 중",
      description: "현재 작업을 이 기기에 자동저장하고 있습니다.",
      detail:
        input.otherTabCount > 0
          ? "다른 탭도 열려 있습니다. 작업본 번호를 비교해 오래된 화면이 최신 작업을 덮어쓰지 않게 막고 있습니다."
          : null
    };
  }

  return {
    tone: input.otherTabCount > 0 ? "amber" : "green",
    value: input.otherTabCount > 0 ? "이 탭이 편집 중 · 다른 탭 열림" : "자동저장됨",
    description: input.lastLocalSavedLabel
      ? `마지막 이 기기 저장: ${input.lastLocalSavedLabel}`
      : "브라우저를 닫아도 이 기기에서는 이어서 작업할 수 있습니다.",
    detail:
      input.otherTabCount > 0
        ? "다른 탭을 참고용으로 열어둘 수 있지만, 같은 작업본 편집은 한 탭에서만 이어가는 것이 안전합니다."
        : null
  };
}
