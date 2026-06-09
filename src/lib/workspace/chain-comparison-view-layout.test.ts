import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("chain-comparison-view-layout", () => {
  it("결과 뷰어는 체이닝 미리보기 중 원본 비교 토글을 표시한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasComparisonToggle =
      source.includes("resolveChainComparisonSpaces") &&
      source.includes("chainComparisonMode") &&
      source.includes("isChainComparisonActive") &&
      source.includes('className="result-comparison-toggle"') &&
      source.includes("원본 비교") &&
      source.includes("원본") &&
      source.includes("추가 결과") &&
      source.includes('aria-pressed={chainComparisonMode === "original"}') &&
      source.includes('aria-pressed={chainComparisonMode === "preview"}');

    // Then
    assert.equal(hasComparisonToggle, true);
  });

  it("원본 비교 토글은 현장 터치 타깃과 모바일 한 컬럼 배치를 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasWrapperStyle =
      /\.result-comparison-toggle\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*6px;[\s\S]*?min-width:\s*0;[\s\S]*?}/.test(
        css
      );
    const hasSegmentedStyle =
      /\.comparison-segmented-control\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        css
      );
    const hasTouchTargetStyle =
      /\.comparison-segmented-control\s+button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        css
      );
    const hasMobileStyle =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-comparison-toggle\s*{[\s\S]*?width:\s*100%;[\s\S]*?}[\s\S]*?\.comparison-segmented-control\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.equal(hasWrapperStyle && hasSegmentedStyle && hasTouchTargetStyle && hasMobileStyle, true);
  });
});
