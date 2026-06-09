export type SpaceDialogMode = "add" | "edit";

export function getSpaceDialogCopy(mode: SpaceDialogMode) {
  if (mode === "edit") {
    return {
      title: "내 공간 수정",
      primaryLabel: "수정 저장",
      helperLabel: "현재 저장된 공간 크기와 안전 여유를 바꿉니다."
    };
  }

  return {
    title: "내 공간 추가",
    primaryLabel: "추가하고 선택",
    helperLabel: "기본값이 맞지 않을 때 직접 공간 크기와 안전 여유를 저장합니다."
  };
}
