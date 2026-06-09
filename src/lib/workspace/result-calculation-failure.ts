export interface ResultCalculationFailure {
  title: string;
  description: string;
  actionHint: string;
}

export function createResultCalculationFailure(error: unknown): ResultCalculationFailure {
  const errorText = getErrorText(error).toLowerCase();

  if (errorText.includes("abort") || errorText.includes("interrupt")) {
    return {
      title: "브라우저가 계산을 중단했습니다.",
      description: "다시 계산해도 같은 문제가 반복되면 박스 수량을 줄여 나누어 계산하세요.",
      actionHint: "입력 수정으로 박스 수량을 조정하거나 다시 계산을 눌러 재시도할 수 있습니다."
    };
  }

  if (errorText.includes("memory") || errorText.includes("maximum call stack") || errorText.includes("rangeerror")) {
    return {
      title: "브라우저 메모리가 부족해 계산을 멈췄습니다.",
      description: "한 번에 계산하는 박스가 많거나 공간이 복잡하면 브라우저가 계산을 멈출 수 있습니다.",
      actionHint: "박스 수량을 줄이거나 작업을 나누어 입력한 뒤 다시 계산하세요."
    };
  }

  if (errorText.includes("constraint") || errorText.includes("validation") || errorText.includes("input")) {
    return {
      title: "입력 조건을 다시 확인해야 합니다.",
      description: "공간 크기, 안전 여유, 박스 수량, 회전 가능 여부 중 계산할 수 없는 조건이 있습니다.",
      actionHint: "입력 수정으로 값과 단위를 확인한 뒤 다시 계산하세요."
    };
  }

  return {
    title: "계산을 완료하지 못했습니다.",
    description: "작업본은 유지됩니다. 잠시 후 다시 계산하거나 입력을 줄여서 시도하세요.",
    actionHint: "문제가 반복되면 백업 파일을 만든 뒤 브라우저를 새로 열어 다시 시도하세요."
  };
}

function getErrorText(error: unknown) {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}
