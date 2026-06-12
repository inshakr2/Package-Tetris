import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const RESULT_3D_CANVAS_PATH = join(process.cwd(), "src/components/result-stage/result-3d-canvas.client.tsx");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("result-3d-dimension-overlay-layout", () => {
  it("3D 결과 안에서 현재 결과의 최대 사용 가로, 깊이, 높이를 현장 단위로 표시한다", () => {
    // Given
    const source = readFileSync(RESULT_3D_CANVAS_PATH, "utf8");

    // When
    const hasDimensionOverlay =
      source.includes("calculatePackedBlocksFootprint") &&
      source.includes("occupiedSize") &&
      source.includes('className="three-dimension-overlay"') &&
      source.includes('aria-label="3D 결과 최대치수"') &&
      source.includes("결과 최대치수") &&
      source.includes("가로") &&
      source.includes("깊이") &&
      source.includes("높이") &&
      source.includes("formatThreeDimensionMm(occupiedSize.widthMm)") &&
      source.includes("formatThreeDimensionMm(occupiedSize.depthMm)") &&
      source.includes("formatThreeDimensionMm(occupiedSize.heightMm)") &&
      !source.includes('aria-label="3D 공간 치수"');

    // Then
    assert.equal(hasDimensionOverlay, true);
  });

  it("결과 뷰어 상단 문구도 공간 치수 대신 결과 최대치수를 표시한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasResultHeaderFootprint =
      source.includes("selectedPackedSpaceFootprint") &&
      source.includes("calculatePackedBlocksFootprint(selectedPackedSpace?.blocks ?? [])") &&
      source.includes("결과 최대치수") &&
      source.includes("formatDimensions(selectedPackedSpaceFootprint)") &&
      source.includes("spaceDescription={`${resultSpace?.name ?? \"공간 미선택\"} · 결과 최대치수");

    // Then
    assert.equal(hasResultHeaderFootprint, true);
  });

  it("3D 치수 오버레이는 캔버스 조작을 막지 않고 모바일에서 한 컬럼으로 접힌다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasBaseLayout =
      /\.three-dimension-overlay\s*{[\s\S]*?position:\s*absolute;[\s\S]*?pointer-events:\s*none;[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/.test(
        css
      );
    const hasMobileLayout =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.three-dimension-overlay\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?max-width:\s*min\(220px,\s*calc\(100%\s*-\s*20px\)\);[\s\S]*?}/.test(
        css
      );

    // Then
    assert.equal(hasBaseLayout && hasMobileLayout, true);
  });

  it("3D 툴팁은 모바일에서도 캔버스 안쪽에 머물도록 위치를 보정한다", () => {
    // Given
    const source = readFileSync(RESULT_3D_CANVAS_PATH, "utf8");
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasTooltipPositionGuard =
      source.includes("function calculateTooltipPosition") &&
      source.includes("hostWidth") &&
      source.includes("hostHeight") &&
      source.includes("...calculateTooltipPosition(point)");
    const tooltipDoesNotUseRawTransform =
      /\.three-tooltip\s*{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/.test(css) &&
      !css.includes("transform: translate(10px, 10px)");

    // Then
    assert.equal(hasTooltipPositionGuard && tooltipDoesNotUseRawTransform, true);
  });
});
