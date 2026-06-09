export interface SpaceFormValidationInput {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  offsetWidthMm: number;
  offsetDepthMm: number;
  offsetHeightMm: number;
}

export interface SpaceFormValidationResult {
  valid: boolean;
  message: string | null;
}

export function validateSpaceForm(input: SpaceFormValidationInput): SpaceFormValidationResult {
  const values = [
    input.widthMm,
    input.depthMm,
    input.heightMm,
    input.offsetWidthMm,
    input.offsetDepthMm,
    input.offsetHeightMm
  ].map(Number);

  if (values.some((value) => !Number.isFinite(value))) {
    return {
      valid: false,
      message: "공간 크기와 안전 여유는 숫자로 입력하세요."
    };
  }

  const [widthMm, depthMm, heightMm, offsetWidthMm, offsetDepthMm, offsetHeightMm] = values;

  if (widthMm < 1 || depthMm < 1 || heightMm < 1) {
    return {
      valid: false,
      message: "공간 크기는 1mm 이상으로 입력하세요."
    };
  }

  if (offsetWidthMm < 0 || offsetDepthMm < 0 || offsetHeightMm < 0) {
    return {
      valid: false,
      message: "안전 여유는 0mm 이상으로 입력하세요."
    };
  }

  if (widthMm - offsetWidthMm < 1 || depthMm - offsetDepthMm < 1 || heightMm - offsetHeightMm < 1) {
    return {
      valid: false,
      message: "안전 여유를 뺀 적재 가능 크기가 1mm 이상이어야 합니다."
    };
  }

  return {
    valid: true,
    message: null
  };
}
