export type DeleteConfirmationKind = "space" | "block-template" | "draft-block";

export function getDeleteConfirmationCopy(kind: DeleteConfirmationKind, itemName: string) {
  if (kind === "space") {
    return {
      title: "내 공간을 삭제할까요?",
      description: `${itemName}를 삭제하면 선택 중이던 경우 기본 공간으로 돌아갑니다.`,
      confirmLabel: "내 공간 삭제"
    };
  }

  if (kind === "block-template") {
    return {
      title: "저장된 박스를 삭제할까요?",
      description: `${itemName}를 삭제하면 저장된 박스와 이번 작업에 담긴 같은 박스도 함께 빠집니다.`,
      confirmLabel: "저장된 박스 삭제"
    };
  }

  return {
    title: "이번 작업에서 박스를 제거할까요?",
    description: `${itemName}는 이번 작업에서만 빠지고 저장된 박스 목록은 그대로 남습니다.`,
    confirmLabel: "작업에서 제거"
  };
}
