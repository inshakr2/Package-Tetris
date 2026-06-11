import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("draft block xlsx import layout", () => {
  it("실행 전 확인은 현재 작업 박스 .xlsx 샘플과 미리보기 import 흐름을 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasActions =
      source.includes("현재 작업 엑셀 등록") &&
      source.includes("현재 작업 샘플") &&
      source.includes('accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"');
    const hasPreviewDialog =
      source.includes("현재 작업 엑셀 미리보기") &&
      source.includes("추가할 박스") &&
      source.includes("오류 행") &&
      source.includes("현재 작업에 추가");
    const hasFormatUtilities =
      source.includes("readDraftBlockXlsxFile") &&
      source.includes("createDraftBlockImportSampleWorkbook") &&
      source.includes("importDraftBlocks");

    // Then
    assert.ok(hasActions, "current work section should expose xlsx import and sample actions");
    assert.ok(hasPreviewDialog, "current work import should preview rows before applying");
    assert.ok(hasFormatUtilities, "current work import should use the dedicated draft xlsx parser");
  });

  it("현재 작업 카드의 총 부피 타일은 좁은 화면에서도 깨지지 않도록 전용 레이아웃을 가진다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasVolumeClass =
      source.includes('className="summary-tile compact draft-block-volume-tile"') &&
      source.includes("<strong>{formatBlockVolumeM3(block)}</strong>");
    const hasGridRule =
      /\.block-detail-grid\s*{[\s\S]*?grid-template-columns:\s*minmax\(120px,\s*0\.7fr\)\s+minmax\(260px,\s*1\.4fr\)\s+minmax\(140px,\s*0\.75fr\)\s+minmax\(150px,\s*auto\);[\s\S]*?}/.test(
        css
      );
    const hasVolumeRule =
      /\.draft-block-volume-tile\s*{[\s\S]*?min-width:\s*140px;[\s\S]*?align-self:\s*stretch;[\s\S]*?}/.test(css) &&
      /\.draft-block-volume-tile\s+strong\s*{[\s\S]*?white-space:\s*normal;[\s\S]*?line-height:\s*1\.2;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(hasVolumeClass, "current work volume tile should use a dedicated class");
    assert.ok(hasGridRule, "current work detail grid should reserve a stable volume column");
    assert.ok(hasVolumeRule, "current work volume tile should keep a readable minimum size and wrapping");
  });
});
