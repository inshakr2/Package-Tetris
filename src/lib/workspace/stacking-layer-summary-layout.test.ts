import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const SOURCE_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

const source = readFileSync(SOURCE_PATH, "utf8");
const styles = readFileSync(GLOBALS_CSS_PATH, "utf8");

describe("stacking-layer-summary-layout", () => {
  it("결과 화면은 선택 공간 기준의 쌓는 순서 패널을 표시한다", () => {
    // Given / When
    const hasStackingPanel =
      source.includes("createStackingLayerSummaries") &&
      source.includes("stackingLayerSummaries") &&
      source.includes('className="sub-panel stacking-layer-panel"') &&
      source.includes("쌓는 순서") &&
      source.includes("선택한 Space") &&
      source.includes('className="stacking-layer-list"') &&
      source.includes('className="stacking-layer-row"');

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
});
