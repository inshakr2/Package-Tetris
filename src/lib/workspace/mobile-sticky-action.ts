export type MobileStickyActionKind = "reload" | "create" | "export";
export type MobileStickyActionTone = "green" | "amber" | "red" | "neutral";
export type MobileStickySaveStatus = "loading" | "saving" | "saved" | "error" | "conflict";

export interface MobileStickyActionStateInput {
  isWorkspaceLocked: boolean;
  hasResult: boolean;
  canCreateResult: boolean;
  reviewCtaLabel: string;
  reviewCtaReason: string | null;
  saveStatus: MobileStickySaveStatus;
  needsExport: boolean;
}

export interface MobileStickyActionState {
  statusLabel: string;
  helperLabel: string;
  buttonLabel: string;
  action: MobileStickyActionKind;
  tone: MobileStickyActionTone;
  disabled: boolean;
}

export function createMobileStickyActionState(
  input: MobileStickyActionStateInput
): MobileStickyActionState {
  if (input.isWorkspaceLocked || input.saveStatus === "conflict") {
    return {
      statusLabel: "최신본 필요",
      helperLabel: "다른 탭에서 저장된 최신 작업본을 불러와야 계속할 수 있습니다.",
      buttonLabel: "최신본 불러오기",
      action: "reload",
      tone: "red",
      disabled: false
    };
  }

  if (input.saveStatus === "error") {
    return {
      statusLabel: "저장 실패",
      helperLabel: "이 기기 저장이 되지 않아 지금 백업 파일이 필요합니다.",
      buttonLabel: "지금 백업",
      action: "export",
      tone: "red",
      disabled: false
    };
  }

  if (!input.hasResult) {
    if (input.canCreateResult) {
      return {
        statusLabel: "입력 확인 완료",
        helperLabel: "지금 결과를 만들어 박스 배치를 확인할 수 있습니다.",
        buttonLabel: input.reviewCtaLabel,
        action: "create",
        tone: "green",
        disabled: false
      };
    }

    return {
      statusLabel: "입력 확인 필요",
      helperLabel: input.reviewCtaReason ?? "결과를 만들기 전에 입력 내용을 먼저 확인하세요.",
      buttonLabel: input.reviewCtaLabel,
      action: "create",
      tone: "amber",
      disabled: true
    };
  }

  if (input.needsExport) {
    return {
      statusLabel: "백업 필요",
      helperLabel: "결과를 다른 기기로 옮기려면 백업 파일을 만들어 두는 것이 안전합니다.",
      buttonLabel: "백업 만들기",
      action: "export",
      tone: "amber",
      disabled: false
    };
  }

  return {
    statusLabel: "결과 확인 중",
    helperLabel: "필요하면 지금 백업 파일을 만들어 다른 기기로 옮길 수 있습니다.",
    buttonLabel: "백업 만들기",
    action: "export",
    tone: "neutral",
    disabled: false
  };
}
