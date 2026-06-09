import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("result-remaining-volume-layout", () => {
  it("결과 상단 요약은 남은 부피 KPI를 표시한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasRemainingVolumeImport =
      source.includes("calculateResultRemainingVolumeM3") &&
      source.includes("formatVolumeM3");
    const hasRemainingVolumeTile =
      source.includes('label="남은 부피"') &&
      source.includes("remainingVolumeLabel");

    // Then
    assert.equal(hasRemainingVolumeImport, true);
    assert.equal(hasRemainingVolumeTile, true);
  });

  it("결과 요약 5개 타일은 데스크톱 한 줄과 모바일 한 컬럼을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const desktopGrid =
      /\.result-hero-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/
        .test(css);
    const mobileGrid =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-hero-grid,[\s\S]*?\.result-lower-grid\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/
        .test(css);

    // Then
    assert.equal(desktopGrid, true);
    assert.equal(mobileGrid, true);
  });
});
