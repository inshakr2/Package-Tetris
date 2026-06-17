import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const SPACE_FORM_DIALOG_PATH = join(process.cwd(), "src/components/workspace/space-form-dialog.tsx");
const BLOCK_CREATE_PANEL_PATH = join(process.cwd(), "src/components/workspace/block-create-panel.tsx");
const CURRENT_WORK_PANEL_PATH = join(process.cwd(), "src/components/workspace/current-work-blocks-panel.tsx");
const NUMBER_FIELD_INPUT_PATH = join(process.cwd(), "src/components/workspace/number-field-input.tsx");

const appSource = readFileSync(WORKSPACE_APP_PATH, "utf8");
const spaceFormDialogSource = readFileSync(SPACE_FORM_DIALOG_PATH, "utf8");
const blockCreatePanelSource = readFileSync(BLOCK_CREATE_PANEL_PATH, "utf8");
const currentWorkPanelSource = readFileSync(CURRENT_WORK_PANEL_PATH, "utf8");
const numberFieldInputSource = readFileSync(NUMBER_FIELD_INPUT_PATH, "utf8");
const combinedSource = `${appSource}\n${spaceFormDialogSource}\n${blockCreatePanelSource}\n${currentWorkPanelSource}\n${numberFieldInputSource}`;

describe("field-number-input-layout", () => {
  it("숫자 입력은 공통 파서를 사용하고 직접 Number 변환을 사용하지 않는다", () => {
    // Given / When
    const importsParser = numberFieldInputSource.includes(
      'import { parseFieldIntegerInput } from "@/lib/workspace/field-number-input";'
    );
    const hasDirectEventNumberParsing = combinedSource.includes("Number(event.target.value)");
    const hasNumberFieldComponent =
      numberFieldInputSource.includes("export function NumberFieldInput({") &&
      numberFieldInputSource.includes("setDraftValue(nextDraftValue)") &&
      numberFieldInputSource.includes("const result = parseFieldIntegerInput(nextDraftValue, { min })") &&
      numberFieldInputSource.includes("onValidValueChange(result.value)") &&
      numberFieldInputSource.includes("aria-invalid={Boolean(error)}") &&
      numberFieldInputSource.includes('className="field-error"') &&
      numberFieldInputSource.includes("onBlur={handleBlur}");
    const numberFieldUsageCount = (combinedSource.match(/<NumberFieldInput/g) ?? []).length;

    // Then
    assert.equal(importsParser, true);
    assert.equal(hasDirectEventNumberParsing, false);
    assert.equal(hasNumberFieldComponent, true);
    assert.equal(numberFieldUsageCount, 11);
  });

  it("수량 입력은 템플릿 등록이 아니라 작업 수량 단계에서 현장 단위와 접근성 라벨을 제공한다", () => {
    // Given / When
    const hasVisibleQuantityUnits =
      combinedSource.includes("이번 작업 수량(개)") &&
      combinedSource.includes("지정 수량(개)");
    const hasA11yQuantityUnits =
      combinedSource.includes('aria-label="이번 작업 수량 개"') &&
      combinedSource.includes("지정 수량");
    const hasRemovedTemplateDefaultQuantity =
      !combinedSource.includes("기본 수량(개)") && !combinedSource.includes('aria-label="박스 기본 수량 개"');
    const hasIntegerSteps = numberFieldInputSource.includes('step="1"');

    // Then
    assert.equal(hasVisibleQuantityUnits, true);
    assert.equal(hasA11yQuantityUnits, true);
    assert.equal(hasRemovedTemplateDefaultQuantity, true);
    assert.equal(hasIntegerSteps, true);
  });

  it("숫자 입력은 포커스 시 값을 선택하고 clear 후 재입력 가능한 임시 문자열 상태를 사용한다", () => {
    // Given / When
    const hasFocusHelper = numberFieldInputSource.includes(
      "function selectNumberFieldValue(event: FocusEvent<HTMLInputElement> | MouseEvent<HTMLInputElement>)"
    );
    const hasDraftStringState =
      numberFieldInputSource.includes("const [draftValue, setDraftValue] = useState(() => formatNumberFieldDraftValue(value))") &&
      numberFieldInputSource.includes("setDraftValue(nextDraftValue)") &&
      numberFieldInputSource.includes("value={draftValue}") &&
      numberFieldInputSource.includes("onClick={selectNumberFieldValue}") &&
      numberFieldInputSource.includes("function formatNumberFieldDraftValue(value: NumberFieldFormValue)");

    // Then
    assert.equal(hasFocusHelper, true);
    assert.equal(hasDraftStringState, true);
  });

  it("박스 등록 치수는 빈 값으로 시작하고 저장 시 필수 치수를 검증한다", () => {
    // Given / When
    const hasEmptyBlockDefaults =
      blockCreatePanelSource.includes("export const DEFAULT_BLOCK_FORM: BlockForm =") &&
      blockCreatePanelSource.includes('widthMm: ""') &&
      blockCreatePanelSource.includes('depthMm: ""') &&
      blockCreatePanelSource.includes('heightMm: ""');
    const hasEmptyNumberFieldPath =
      blockCreatePanelSource.includes("allowEmpty") &&
      blockCreatePanelSource.includes("onEmptyValueChange={() => onChange({ ...form, widthMm: \"\" })}") &&
      blockCreatePanelSource.includes("onEmptyValueChange={() => onChange({ ...form, depthMm: \"\" })}") &&
      blockCreatePanelSource.includes("onEmptyValueChange={() => onChange({ ...form, heightMm: \"\" })}");
    const hasSaveValidation =
      appSource.includes("const dimensions = createBlockFormDimensions(blockForm)") &&
      appSource.includes("가로, 세로, 높이를 모두 1 이상의 정수로 입력해 주세요.");

    // Then
    assert.equal(hasEmptyBlockDefaults, true);
    assert.equal(hasEmptyNumberFieldPath, true);
    assert.equal(hasSaveValidation, true);
  });

  it("현재 작업 카드의 총 부피는 비정상 숫자를 작업자 문구로 처리한다", () => {
    // Given / When
    const importsMeasurements =
      currentWorkPanelSource.includes('calculateBlockVolumeM3,') &&
      currentWorkPanelSource.includes('isValidBlockMeasurementInput') &&
      currentWorkPanelSource.includes('from "@/lib/workspace/block-measurements";');
    const usesSafeFormatter =
      currentWorkPanelSource.includes("<strong>{formatBlockVolumeM3(block)}</strong>") &&
      currentWorkPanelSource.includes("function formatBlockVolumeM3(block: BlockDefinition)") &&
      currentWorkPanelSource.includes('"입력 확인 필요"');

    // Then
    assert.equal(importsMeasurements, true);
    assert.equal(usesSafeFormatter, true);
  });
});
