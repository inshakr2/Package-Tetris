import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");

describe("field-number-input-layout", () => {
  it("숫자 입력은 공통 파서를 사용하고 직접 Number 변환을 사용하지 않는다", () => {
    // Given / When
    const importsParser = source.includes('import { parseFieldIntegerInput } from "@/lib/workspace/field-number-input";');
    const hasDirectEventNumberParsing = source.includes("Number(event.target.value)");
    const hasNumberFieldComponent =
      source.includes("function NumberFieldInput({") &&
      source.includes("setDraftValue(nextDraftValue)") &&
      source.includes("const result = parseFieldIntegerInput(nextDraftValue, { min })") &&
      source.includes("onValidValueChange(result.value)") &&
      source.includes("aria-invalid={Boolean(error)}") &&
      source.includes('className="field-error"') &&
      source.includes("onBlur={handleBlur}");
    const numberFieldUsageCount = (source.match(/<NumberFieldInput/g) ?? []).length;

    // Then
    assert.equal(importsParser, true);
    assert.equal(hasDirectEventNumberParsing, false);
    assert.equal(hasNumberFieldComponent, true);
    assert.equal(numberFieldUsageCount, 11);
  });

  it("수량 입력은 템플릿 등록이 아니라 작업 수량 단계에서 현장 단위와 접근성 라벨을 제공한다", () => {
    // Given / When
    const hasVisibleQuantityUnits =
      source.includes("이번 작업 수량(개)") &&
      source.includes("지정 수량(개)");
    const hasA11yQuantityUnits =
      source.includes('aria-label="이번 작업 수량 개"') &&
      source.includes("지정 수량");
    const hasRemovedTemplateDefaultQuantity =
      !source.includes("기본 수량(개)") && !source.includes('aria-label="박스 기본 수량 개"');
    const hasIntegerSteps = source.includes('step="1"');

    // Then
    assert.equal(hasVisibleQuantityUnits, true);
    assert.equal(hasA11yQuantityUnits, true);
    assert.equal(hasRemovedTemplateDefaultQuantity, true);
    assert.equal(hasIntegerSteps, true);
  });

  it("숫자 입력은 포커스 시 값을 선택하고 clear 후 재입력 가능한 임시 문자열 상태를 사용한다", () => {
    // Given / When
    const hasFocusHelper = source.includes(
      "function selectNumberFieldValue(event: FocusEvent<HTMLInputElement> | MouseEvent<HTMLInputElement>)"
    );
    const hasDraftStringState =
      source.includes("const [draftValue, setDraftValue] = useState(() => formatNumberFieldDraftValue(value))") &&
      source.includes("setDraftValue(nextDraftValue)") &&
      source.includes("value={draftValue}") &&
      source.includes("onClick={selectNumberFieldValue}") &&
      source.includes("function formatNumberFieldDraftValue(value: number)");

    // Then
    assert.equal(hasFocusHelper, true);
    assert.equal(hasDraftStringState, true);
  });

  it("현재 작업 카드의 총 부피는 비정상 숫자를 작업자 문구로 처리한다", () => {
    // Given / When
    const importsMeasurements =
      source.includes('calculateBlockVolumeM3,') &&
      source.includes('isValidBlockMeasurementInput') &&
      source.includes('from "@/lib/workspace/block-measurements";');
    const usesSafeFormatter =
      source.includes("<strong>{formatBlockVolumeM3(block)}</strong>") &&
      source.includes("function formatBlockVolumeM3(block: BlockDefinition)") &&
      source.includes('"입력 확인 필요"');

    // Then
    assert.equal(importsMeasurements, true);
    assert.equal(usesSafeFormatter, true);
  });
});
