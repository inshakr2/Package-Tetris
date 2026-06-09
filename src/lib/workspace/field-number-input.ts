interface FieldIntegerInputOptions {
  min: number;
}

type FieldIntegerInputParseResult =
  | {
      status: "valid";
      value: number;
      message: null;
    }
  | {
      status: "empty" | "invalid";
      value: null;
      message: string;
    };

export function parseFieldIntegerInput(
  rawValue: string,
  { min }: FieldIntegerInputOptions
): FieldIntegerInputParseResult {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return {
      status: "empty",
      value: null,
      message: "숫자를 입력하세요."
    };
  }

  if (!/^-?\d+$/.test(trimmedValue)) {
    return {
      status: "invalid",
      value: null,
      message: "정수만 입력하세요."
    };
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isSafeInteger(parsedValue)) {
    return {
      status: "invalid",
      value: null,
      message: "정수만 입력하세요."
    };
  }

  return {
    status: "valid",
    value: Math.max(min, parsedValue),
    message: null
  };
}
