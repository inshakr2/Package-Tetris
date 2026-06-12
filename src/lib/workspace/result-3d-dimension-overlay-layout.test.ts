import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const RESULT_3D_CANVAS_PATH = join(process.cwd(), "src/components/result-stage/result-3d-canvas.client.tsx");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("result-3d-dimension-overlay-layout", () => {
  it("3D 결과 안에서 현재 결과의 최대 사용 가로, 세로, 높이를 현장 단위로 표시한다", () => {
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
      source.includes("세로") &&
      source.includes("높이") &&
      !source.includes("<strong>깊이</strong>") &&
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

  it("3D 치수 오버레이는 캔버스 조작을 막지 않는 상단 compact bar로 표시된다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
    const overlayRule = css.match(/\.three-dimension-overlay\s*{[^}]*}/)?.[0] ?? "";
    const overlayItemRule = css.match(/\.three-dimension-overlay span\s*{[^}]*}/)?.[0] ?? "";
    const overlayTitleRule =
      css.match(/\.three-dimension-overlay \.three-dimension-overlay-title\s*{[^}]*}/)?.[0] ?? "";

    // When
    const hasBaseLayout =
      overlayRule.includes("position: absolute;") &&
      overlayRule.includes("top: 8px;") &&
      overlayRule.includes("left: 8px;") &&
      overlayRule.includes("right: 8px;") &&
      overlayRule.includes("pointer-events: none;") &&
      overlayRule.includes("display: flex;") &&
      overlayRule.includes("flex-wrap: wrap;") &&
      overlayRule.includes("align-items: center;") &&
      overlayRule.includes("max-width: none;");
    const hasCompactChipLayout =
      overlayItemRule.includes("display: inline-flex;") &&
      overlayItemRule.includes("min-height: 26px;") &&
      overlayItemRule.includes("padding: 4px 7px;") &&
      !overlayTitleRule.includes("grid-column: 1 / -1;");

    // Then
    assert.equal(hasBaseLayout && hasCompactChipLayout, true);
  });

  it("모바일 3D 치수 오버레이는 작은 캔버스를 덜 가리도록 더 낮은 chip 높이를 사용한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
    const mobileRule = css.match(/@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.three-dimension-overlay span\s*{[^}]*}/)?.[0] ?? "";

    // When
    const hasMobileCompactHeight =
      mobileRule.includes("min-height: 22px;") &&
      mobileRule.includes("padding: 2px 5px;") &&
      mobileRule.includes("font-size: 11px;");

    // Then
    assert.equal(hasMobileCompactHeight, true);
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
