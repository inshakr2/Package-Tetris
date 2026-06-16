import {
  ChangeEvent,
  FocusEvent,
  MouseEvent,
  useEffect,
  useId,
  useState
} from "react";
import { parseFieldIntegerInput } from "@/lib/workspace/field-number-input";

export type NumberFieldFormValue = number | "";

export function NumberFieldInput({
  value,
  min,
  onValidValueChange,
  onEmptyValueChange,
  "aria-label": ariaLabel,
  allowEmpty = false,
  disabled = false
}: {
  value: NumberFieldFormValue;
  min: number;
  onValidValueChange: (value: number) => void;
  onEmptyValueChange?: () => void;
  "aria-label": string;
  allowEmpty?: boolean;
  disabled?: boolean;
}) {
  const errorId = useId();
  const [draftValue, setDraftValue] = useState(() => formatNumberFieldDraftValue(value));
  const [error, setError] = useState<string | null>(() => getCommittedNumberFieldError(value, min, allowEmpty));

  useEffect(() => {
    setDraftValue(formatNumberFieldDraftValue(value));
    setError(getCommittedNumberFieldError(value, min, allowEmpty));
  }, [allowEmpty, min, value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextDraftValue = event.target.value;
    setDraftValue(nextDraftValue);

    if (allowEmpty && nextDraftValue.trim() === "") {
      setError(null);
      onEmptyValueChange?.();
      return;
    }

    const result = parseFieldIntegerInput(nextDraftValue, { min });

    if (result.status !== "valid") {
      setError(result.message);
      return;
    }

    setError(null);
    onValidValueChange(result.value);
  };

  const handleBlur = () => {
    if (allowEmpty && draftValue.trim() === "") {
      setDraftValue("");
      setError(null);
      onEmptyValueChange?.();
      return;
    }

    const result = parseFieldIntegerInput(draftValue, { min });

    if (result.status !== "valid") {
      setDraftValue(formatNumberFieldDraftValue(value));
      setError(getCommittedNumberFieldError(value, min, allowEmpty));
      return;
    }

    setDraftValue(String(result.value));
    setError(null);
    onValidValueChange(result.value);
  };

  return (
    <>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        aria-label={ariaLabel}
        inputMode="numeric"
        type="number"
        min={min}
        step="1"
        value={draftValue}
        disabled={disabled}
        onBlur={handleBlur}
        onClick={selectNumberFieldValue}
        onFocus={selectNumberFieldValue}
        onChange={handleChange}
      />
      {error ? (
        <span className="field-error" id={errorId} role="status">
          {error}
        </span>
      ) : null}
    </>
  );
}

function formatNumberFieldDraftValue(value: NumberFieldFormValue) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function getCommittedNumberFieldError(value: NumberFieldFormValue, min: number, allowEmpty = false) {
  if (value === "") {
    return allowEmpty ? null : "숫자를 입력하세요.";
  }

  if (!Number.isFinite(value)) {
    return "숫자를 입력하세요.";
  }

  if (!Number.isInteger(value)) {
    return "정수만 입력하세요.";
  }

  if (value < min) {
    return `${min} 이상 입력하세요.`;
  }

  return null;
}

export function selectNumberFieldValue(event: FocusEvent<HTMLInputElement> | MouseEvent<HTMLInputElement>) {
  event.currentTarget.select();
}
