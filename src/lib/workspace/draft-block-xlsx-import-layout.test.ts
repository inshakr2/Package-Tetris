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
      source.includes("현재 작업 포맷 보기") &&
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

  it("현재 작업 엑셀 등록은 파일 선택 전 포맷 안내 dialog와 샘플 다운로드를 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasFormatAction =
      source.includes("현재 작업 포맷 보기") &&
      source.includes('aria-controls="draft-block-import-format-dialog"') &&
      source.includes("setDraftImportFormatDialogOpen(true)");
    const hasFormatDialog =
      source.includes("function DraftBlockImportFormatDialog") &&
      source.includes('id="draft-block-import-format-dialog"') &&
      source.includes("현재 작업 엑셀 등록 포맷") &&
      source.includes("현재 작업 샘플 다운로드") &&
      source.includes("DRAFT_BLOCK_XLSX_COLUMNS.join") &&
      source.includes("DRAFT_BLOCK_IMPORT_SAMPLE_ROWS");
    const hasAutomationCopy =
      source.includes("이번 작업 물량 자동화 기준") &&
      source.includes("저장 박스 컬럼에 수량과 아래층우선이 추가됩니다.") &&
      source.includes("이 포맷으로 파일 선택");
    const hasFormatStyles =
      /\.block-template-format-callout\s*{[\s\S]*?display:\s*grid;[\s\S]*?background:\s*#f7fbff;[\s\S]*?}/.test(css) &&
      /\.block-template-format-table-wrap\s*{[\s\S]*?overflow:\s*auto;[\s\S]*?background:\s*white;[\s\S]*?}/.test(css);

    // Then
    assert.ok(hasFormatAction, "current work xlsx import should expose a format guide before picking a file");
    assert.ok(hasFormatDialog, "current work format guide should render required headers and sample rows");
    assert.ok(hasAutomationCopy, "current work format guide should explain automation-friendly work order columns");
    assert.ok(hasFormatStyles, "format guide should reuse readable xlsx table styles");
  });

  it("현재 작업 카드의 총 부피 타일과 제거 버튼은 좁은 화면에서도 그리드 밖으로 넘치지 않는다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasVolumeClass =
      source.includes('className="summary-tile compact draft-block-volume-tile"') &&
      source.includes("<strong>{formatBlockVolumeM3(block)}</strong>");
    const hasGridRule =
      /\.block-detail-grid\s*{[\s\S]*?grid-template-columns:\s*minmax\(120px,\s*0\.8fr\)\s+minmax\(240px,\s*1\.35fr\)\s+minmax\(130px,\s*0\.75fr\);[\s\S]*?}/.test(
        css
      );
    const hasVolumeRule =
      /\.draft-block-volume-tile\s*{[\s\S]*?min-width:\s*130px;[\s\S]*?align-self:\s*stretch;[\s\S]*?}/.test(css) &&
      /\.draft-block-volume-tile\s+strong\s*{[\s\S]*?white-space:\s*normal;[\s\S]*?line-height:\s*1\.2;[\s\S]*?}/.test(
        css
      );
    const hasRemoveActionRule =
      source.includes('className="danger-button draft-block-remove-action"') &&
      /\.draft-block-remove-action\s*{[\s\S]*?grid-column:\s*1\s*\/\s*-1;[\s\S]*?min-height:\s*48px;[\s\S]*?justify-content:\s*center;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(hasVolumeClass, "current work volume tile should use a dedicated class");
    assert.ok(hasGridRule, "current work detail grid should avoid a four-column minimum-width squeeze");
    assert.ok(hasVolumeRule, "current work volume tile should keep a readable minimum size and wrapping");
    assert.ok(hasRemoveActionRule, "remove action should move to a full-width row instead of overflowing");
  });
});
