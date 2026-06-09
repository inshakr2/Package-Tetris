export type ResultCalculationProgressStep = "idle" | "reviewing" | "packing" | "rendering";

export interface ResultCalculationProgressCopy {
  statusLabel: string;
  buttonLabel: string;
  description: string;
}

export function getResultCalculationProgressCopy(
  step: ResultCalculationProgressStep
): ResultCalculationProgressCopy {
  switch (step) {
    case "reviewing":
      return {
        statusLabel: "검증 중",
        buttonLabel: "검증 중...",
        description: "입력 조건과 저장 상태를 확인하고 있습니다."
      };
    case "packing":
      return {
        statusLabel: "적재 계산 중",
        buttonLabel: "적재 계산 중...",
        description: "쌓기 규칙과 빈 공간을 기준으로 박스 위치를 계산하고 있습니다. 계산 중에도 화면은 유지됩니다."
      };
    case "rendering":
      return {
        statusLabel: "3D 생성 중",
        buttonLabel: "3D 생성 중...",
        description: "계산 결과를 저장하고 결과 화면과 3D 보기를 준비하고 있습니다."
      };
    case "idle":
    default:
      return {
        statusLabel: "대기",
        buttonLabel: "결과 만들기",
        description: "입력을 확인한 뒤 결과를 만들 수 있습니다."
      };
  }
}
