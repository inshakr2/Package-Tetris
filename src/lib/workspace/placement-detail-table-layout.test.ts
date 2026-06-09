import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("placement-detail-table-layout", () => {
  it("결과 화면은 선택 공간의 배치 상세표를 표시한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasPlacementPanel =
      source.includes("createPlacementDetailRows") &&
      source.includes("placementDetailRows") &&
      source.includes('className="sub-panel placement-detail-panel"') &&
      source.includes('id="placement-detail-title"') &&
      source.includes("배치 상세") &&
      source.includes('role="table"') &&
      source.includes('role="row"') &&
      source.includes('role="columnheader"') &&
      source.includes('role="cell"') &&
      source.includes("회전 후 크기");

    // Then
    assert.equal(hasPlacementPanel, true);
  });

  it("배치 상세표는 모바일에서 가로 스크롤 없이 카드형 행으로 접힌다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasPanelStyle =
      /\.placement-detail-panel\s*{[\s\S]*?grid-column:\s*1\s*\/\s*-1;[\s\S]*?min-width:\s*0;[\s\S]*?}/.test(
        css
      );
    const hasTableStyle =
      /\.placement-detail-table\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*8px;[\s\S]*?min-width:\s*0;[\s\S]*?}/
        .test(css);
    const hasRowStyle =
      /\.placement-detail-header,\s*\.placement-detail-row\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:[\s\S]*?minmax\(0,\s*1fr\)[\s\S]*?min-width:\s*0;[\s\S]*?}/
        .test(css);
    const hasWrapStyle =
      /\.placement-detail-row\s+\[role="cell"\],\s*\.placement-detail-header\s+\[role="columnheader"\]\s*{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/
        .test(css);
    const hasMobileStyle =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.placement-detail-header\s*{[\s\S]*?display:\s*none;[\s\S]*?}[\s\S]*?\.placement-detail-row\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/
        .test(css);

    // Then
    assert.equal(hasPanelStyle && hasTableStyle && hasRowStyle && hasWrapStyle && hasMobileStyle, true);
  });
});
