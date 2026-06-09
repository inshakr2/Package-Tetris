import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("chain-comparison-view-layout", () => {
  it("결과 뷰어는 체이닝 미리보기 중 눈에 띄는 추가 결과 안내와 비교 버튼을 표시한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasComparisonToggle =
      source.includes("resolveChainComparisonSpaces") &&
      source.includes("chainComparisonMode") &&
      source.includes("isChainComparisonActive") &&
      source.includes('className="chain-preview-notice"') &&
      source.includes('className="chain-preview-actions"') &&
      source.includes("추가 결과 미리보기") &&
      source.includes("원본 보기") &&
      source.includes("추가 결과 보기") &&
      source.includes("미리보기 취소") &&
      source.includes("onClick={clearChainSelection}") &&
      source.includes('aria-pressed={chainComparisonMode === "original"}') &&
      source.includes('aria-pressed={chainComparisonMode === "preview"}');

    // Then
    assert.equal(hasComparisonToggle, true);
  });

  it("추가 결과 안내와 비교 버튼은 현장 터치 타깃과 모바일 한 컬럼 배치를 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasNoticeStyle =
      /\.chain-preview-notice\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[\s\S]*?border:[\s\S]*?background:[\s\S]*?}/.test(
        css
      );
    const hasActionsStyle =
      /\.chain-preview-actions\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*auto\)\);[\s\S]*?}/.test(
        css
      );
    const hasTouchTargetStyle =
      /\.chain-preview-actions\s+button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        css
      );
    const hasMobileStyle =
      /@media\s*\(max-width:\s*900px\)\s*{[\s\S]*?\.chain-preview-notice\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.chain-preview-actions\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.chain-preview-actions\s+button\s*{[\s\S]*?width:\s*100%;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.equal(hasNoticeStyle && hasActionsStyle && hasTouchTargetStyle && hasMobileStyle, true);
  });
});
