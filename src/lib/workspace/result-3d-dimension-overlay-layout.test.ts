import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const RESULT_3D_CANVAS_PATH = join(process.cwd(), "src/components/result-stage/result-3d-canvas.client.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("result-3d-dimension-overlay-layout", () => {
  it("3D 결과 안에서 공간 가로, 깊이, 높이를 현장 단위로 표시한다", () => {
    // Given
    const source = readFileSync(RESULT_3D_CANVAS_PATH, "utf8");

    // When
    const hasDimensionOverlay =
      source.includes('className="three-dimension-overlay"') &&
      source.includes('aria-label="3D 공간 치수"') &&
      source.includes("가로") &&
      source.includes("깊이") &&
      source.includes("높이") &&
      source.includes("formatThreeDimensionMm(bounds.widthMm)") &&
      source.includes("formatThreeDimensionMm(bounds.depthMm)") &&
      source.includes("formatThreeDimensionMm(bounds.heightMm)");

    // Then
    assert.equal(hasDimensionOverlay, true);
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
});
