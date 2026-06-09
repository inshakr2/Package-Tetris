import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const SOURCE_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const LOADING_INSTRUCTION_FILE_PATH = join(process.cwd(), "src/lib/workspace/loading-instruction-file.ts");

const source = readFileSync(SOURCE_PATH, "utf8");
const styles = readFileSync(GLOBALS_CSS_PATH, "utf8");
const loadingInstructionFileSource = readFileSync(LOADING_INSTRUCTION_FILE_PATH, "utf8");

describe("stacking-layer-summary-layout", () => {
  it("결과 화면은 선택 공간 기준의 쌓는 순서 패널을 표시한다", () => {
    // Given / When
    const hasStackingPanel =
      source.includes("createStackingLayerSummaries") &&
      source.includes("stackingLayerSummaries") &&
      source.includes('className="sub-panel stacking-layer-panel"') &&
      source.includes("쌓는 순서") &&
      source.includes('className="stacking-layer-list"') &&
      source.includes('className="stacking-layer-row"') &&
      source.includes("선택한 ${stackingInstructionSpaceLabel} 기준");

    // Then
    assert.equal(hasStackingPanel, true);
  });

  it("층별 요약 행은 긴 박스명을 줄바꿈하고 모바일에서 한 컬럼으로 접힌다", () => {
    // Given / When
    const hasPanelStyle =
      /\.stacking-layer-panel\s*{[\s\S]*?grid-column:\s*1\s*\/\s*-1;[\s\S]*?min-width:\s*0;[\s\S]*?}/.test(
        styles
      );
    const hasBaseListStyle =
      /\.stacking-layer-list\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*8px;[\s\S]*?}/.test(styles);
    const hasBaseRowStyle =
      /\.stacking-layer-row\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)\s+auto;[\s\S]*?min-width:\s*0;[\s\S]*?}/
        .test(styles);
    const hasWrapStyle =
      /\.stacking-layer-row\s+strong,\s*\.stacking-layer-row\s+span,\s*\.stacking-layer-row\s+small\s*{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/
        .test(styles);
    const hasMobileStyle =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.stacking-layer-row\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/
        .test(styles);

    // Then
    assert.equal(hasPanelStyle && hasBaseListStyle && hasBaseRowStyle && hasWrapStyle && hasMobileStyle, true);
  });

  it("결과 화면은 현장 적재 지시 문장을 별도 목록으로 표시한다", () => {
    // Given / When
    const hasInstructionList =
      source.includes("createStackingInstructionSteps") &&
      source.includes("stackingInstructionSteps") &&
      source.includes('className="loading-instruction-list"') &&
      source.includes('className="loading-instruction-row"') &&
      source.includes('className="loading-instruction-copy"') &&
      source.includes("현장 작업 순서");

    // Then
    assert.equal(hasInstructionList, true);
  });

  it("현장 적재 지시 목록은 모바일에서 한 컬럼과 긴 문구 줄바꿈을 유지한다", () => {
    // Given / When
    const hasListStyle =
      /\.loading-instruction-list\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*8px;[\s\S]*?}/.test(styles);
    const hasRowStyle =
      /\.loading-instruction-row\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\);[\s\S]*?min-width:\s*0;[\s\S]*?}/
        .test(styles);
    const hasCopyStyle =
      /\.loading-instruction-copy\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*4px;[\s\S]*?min-width:\s*0;[\s\S]*?}/
        .test(styles);
    const hasWrapStyle =
      /\.loading-instruction-row\s+strong,\s*\.loading-instruction-row\s+p,\s*\.loading-instruction-row\s+small\s*{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/
        .test(styles);
    const hasMobileStyle =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.loading-instruction-row\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/
        .test(styles);

    // Then
    assert.equal(hasListStyle && hasRowStyle && hasCopyStyle && hasWrapStyle && hasMobileStyle, true);
  });

  it("현장 적재 지시는 복사 버튼과 상태 안내를 제공한다", () => {
    // Given / When
    const hasCopyAction =
      source.includes("createStackingInstructionText") &&
      source.includes("stackingInstructionText") &&
      source.includes("copyStackingInstructions") &&
      source.includes("writeClipboardText") &&
      source.includes("작업 순서 복사") &&
      source.includes('className="secondary-button loading-instruction-copy-button"') &&
      source.includes('role="status"');
    const hasCopyActionStyle =
      /\.stacking-layer-head\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[\s\S]*?}/.test(
        styles
      ) &&
      /\.loading-instruction-copy-button,\s*\.loading-instruction-download-button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        styles
      ) &&
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.stacking-layer-head\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.loading-instruction-copy-button,\s*\.loading-instruction-download-button\s*{[\s\S]*?width:\s*100%;[\s\S]*?}/
        .test(styles);

    // Then
    assert.equal(hasCopyAction && hasCopyActionStyle, true);
  });

  it("복사용 현장 적재 지시는 결과의 미적재와 경고 요약을 함께 전달한다", () => {
    // Given / When
    const hasWarningAwareCopy =
      source.includes("createStackingInstructionSpaceLabel") &&
      source.includes("stackingInstructionSpaceLabel") &&
      source.includes("resultSpace?.name") &&
      source.includes("stackingInstructionWarningMessages") &&
      source.includes("resultWarningSummary.map") &&
      source.includes("safetySpaceSplitWarning") &&
      source.includes("unloadedBlockCount: latestResult?.unloadedBlockCount ?? 0") &&
      source.includes("warnings: stackingInstructionWarningMessages");

    // Then
    assert.equal(hasWarningAwareCopy, true);
  });

  it("현장 적재 지시는 클립보드가 막힌 현장을 위해 텍스트 파일 저장 버튼을 제공한다", () => {
    // Given / When
    const hasDownloadAction =
      source.includes("downloadStackingInstructions") &&
      source.includes("downloadTextFile") &&
      source.includes("createStackingInstructionDownloadSuccessMessage") &&
      source.includes("createStackingInstructionFilename(selectedPackedSpaceIndex, new Date(), resultSpace?.name)") &&
      source.includes("작업 지시서 저장") &&
      source.includes("loading-instruction-download-button") &&
      source.includes("instructionDownloadStatus") &&
      source.includes("instructionDownloadFilename") &&
      loadingInstructionFileSource.includes("다운로드 폴더에서");
    const hasDownloadActionStyle =
      /\.loading-instruction-actions\s*{[\s\S]*?display:\s*flex;[\s\S]*?gap:\s*8px;[\s\S]*?}/.test(
        styles
      ) &&
      /\.loading-instruction-copy-button,\s*\.loading-instruction-download-button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(
        styles
      ) &&
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.loading-instruction-actions\s*{[\s\S]*?display:\s*grid;[\s\S]*?}[\s\S]*?\.loading-instruction-copy-button,\s*\.loading-instruction-download-button\s*{[\s\S]*?width:\s*100%;[\s\S]*?}/
        .test(styles);

    // Then
    assert.equal(hasDownloadAction && hasDownloadActionStyle, true);
  });
});
