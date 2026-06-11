import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("block-library-search-layout", () => {
  it("내 공간 추가 모달은 공간명, 치수, 안전 여유를 행 단위로 묶는다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasSpaceRows =
      source.includes('className="space-form-rows space-form"') &&
      source.includes('className="form-row space-form-name-row"') &&
      source.includes('className="form-row form-row-three space-form-dimension-row"') &&
      source.includes('className="form-row form-row-three space-form-offset-row"');
    const nameBeforeDimensions =
      source.indexOf('className="form-row space-form-name-row"') <
      source.indexOf('className="form-row form-row-three space-form-dimension-row"');
    const dimensionsBeforeOffsets =
      source.indexOf('className="form-row form-row-three space-form-dimension-row"') <
      source.indexOf('className="form-row form-row-three space-form-offset-row"');

    // Then
    assert.ok(hasSpaceRows, "space dialog should expose explicit name, dimensions, and offset rows");
    assert.ok(nameBeforeDimensions, "space name row should appear before dimensions");
    assert.ok(dimensionsBeforeOffsets, "space dimensions should appear before safety offsets");
  });

  it("박스 등록은 박스명/무게, 치수, 그룹을 행 단위로 묶는다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasBlockRows =
      source.includes('className="block-template-form-rows block-template-form"') &&
      source.includes('className="form-row form-row-two block-template-name-row"') &&
      source.includes('className="form-row form-row-three block-template-dimension-row"') &&
      source.includes('className="form-row form-row-two block-template-group-row"');
    const nameBeforeDimensions =
      source.indexOf('className="form-row form-row-two block-template-name-row"') <
      source.indexOf('className="form-row form-row-three block-template-dimension-row"');
    const dimensionsBeforeGroups =
      source.indexOf('className="form-row form-row-three block-template-dimension-row"') <
      source.indexOf('className="form-row form-row-two block-template-group-row"');

    // Then
    assert.ok(hasBlockRows, "block template form should expose explicit name, dimensions, and group rows");
    assert.ok(nameBeforeDimensions, "block name and weight row should appear before dimensions");
    assert.ok(dimensionsBeforeGroups, "block dimensions should appear before group selects");
  });

  it("박스명/무게 행은 좁은 데스크톱 컬럼에서도 박스명 입력이 눌리지 않게 전용 그리드를 사용한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const labelCanShrink =
      /\.form-grid label,[\s\S]*?\.form-row label,[\s\S]*?\.field-row label\s*{[\s\S]*?min-width:\s*0;[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?}/.test(
        css
      );
    const nameRowUsesDedicatedColumns =
      /\.block-template-name-row\s*{[\s\S]*?grid-template-columns:\s*minmax\(220px,\s*1\.6fr\)\s+minmax\(150px,\s*0\.7fr\);[\s\S]*?align-items:\s*start;[\s\S]*?}/.test(
        css
      );
    const mobileNameRowStacks =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.block-template-name-row\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(labelCanShrink, "form labels should not force their grid columns wider than the parent");
    assert.ok(nameRowUsesDedicatedColumns, "box name should get more room than optional weight in narrow desktop columns");
    assert.ok(mobileNameRowStacks, "box name and weight should stack on mobile");
  });

  it("저장된 박스 영역은 현장 사용자가 이름, 치수, 무게, 그룹으로 필터링할 수 있는 검색 입력을 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasSearchState =
      source.includes("const [blockLibrarySearchTerm, setBlockLibrarySearchTerm] = useState(\"\")") &&
      source.includes("const searchedTemplates = searchBlockTemplates(templates, blockLibrarySearchTerm)") &&
      source.includes("const visibleTemplates = searchedTemplates.filter((template) =>");
    const hasSearchInput =
      source.includes('className="block-library-search"') &&
      source.includes('aria-label="저장된 박스 검색"') &&
      source.includes('placeholder="박스명, 치수, 무게, 그룹 검색"') &&
      source.includes("onChange={(event) => setBlockLibrarySearchTerm(event.target.value)}");
    const hasGroupFilters =
      source.includes('aria-label="상위그룹 필터"') &&
      source.includes('aria-label="하위그룹 필터"') &&
      source.includes("blockLibraryGroup1Filter") &&
      source.includes("blockLibraryGroup2Filter") &&
      source.includes("function BlockLibraryDialog");
    const hasEmptyResultCopy = source.includes("검색 결과가 없습니다. 다른 이름이나 치수로 찾아보세요.");

    // Then
    assert.ok(hasSearchState, "block library should keep local search state and filtered templates");
    assert.ok(hasSearchInput, "block library should expose a field-friendly search input");
    assert.ok(hasGroupFilters, "block library should expose group filters for large saved-box libraries");
    assert.ok(hasEmptyResultCopy, "empty search results should explain the next action");
  });

  it("신규 박스 등록은 기본 수량 대신 무게 입력과 등록된 상위/하위 그룹 선택을 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasRemovedDefaultQuantity =
      !source.includes("기본 수량(개)") && !source.includes('aria-label="박스 기본 수량 개"');
    const hasOptionalMetadataFields =
      source.includes("무게(kg)") &&
      source.includes('aria-label="박스 무게 kg"') &&
      source.includes('aria-label="박스 상위그룹 선택"') &&
      source.includes('aria-label="박스 하위그룹 선택"') &&
      source.includes("blockGroupRegister") &&
      source.includes("onAddBlockGroup");
    const hasPlaceholderName = source.includes('placeholder="예: 스피커 박스"');

    // Then
    assert.ok(hasRemovedDefaultQuantity, "template form should not ask for a default quantity");
    assert.ok(hasOptionalMetadataFields, "template form should collect optional weight and select registered groups");
    assert.ok(hasPlaceholderName, "box name should use an example placeholder instead of prefilled text");
  });

  it("무게 입력은 현재 적재 계산에 반영되지 않는 선택 정보임을 입력 근처에서 안내한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasAccessibleHelp =
      source.includes('aria-describedby="block-weight-help"') &&
      source.includes('id="block-weight-help"') &&
      source.includes("검색과 엑셀/백업용 정보입니다. 현재 적재 계산에는 반영하지 않습니다.");
    const helpAppearsNearWeightInput =
      source.indexOf('aria-label="박스 무게 kg"') < source.indexOf('id="block-weight-help"') &&
      source.indexOf('id="block-weight-help"') < source.indexOf('className="form-row form-row-three block-template-dimension-row"');

    // Then
    assert.ok(hasAccessibleHelp, "weight input should explain that weight is metadata only in V2");
    assert.ok(helpAppearsNearWeightInput, "weight help should appear before dimension fields");
  });

  it("저장된 박스는 대량 목록을 본문에 펼치지 않고 dialog에서 검색하고 선택한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasLibraryOpenAction =
      source.includes("저장된 박스 찾아 추가") &&
      source.includes('aria-haspopup="dialog"') &&
      source.includes('aria-controls="block-library-dialog"');
    const hasDialog =
      source.includes("function BlockLibraryDialog") &&
      source.includes('id="block-library-dialog"') &&
      source.includes('className="block-library-dialog"') &&
      source.includes("block-library-dialog-body");
    const hasDialogActions =
      source.includes('aria-label="저장된 박스 찾기 닫기"') &&
      source.includes("aria-label={`저장된 박스 ${template.name} 삭제`}");
    const hasPagination =
      source.includes("BLOCK_LIBRARY_PAGE_SIZE") &&
      source.includes("block-library-pagination") &&
      source.includes("이전 페이지") &&
      source.includes("다음 페이지");
    const inlinePanelIsCompact =
      source.includes("block-library-summary-card") && source.includes("저장된 박스 0개");

    // Then
    assert.ok(hasLibraryOpenAction, "saved boxes should be opened through a clear dialog action");
    assert.ok(hasDialog, "saved boxes should render in an accessible lookup dialog");
    assert.ok(hasDialogActions, "saved-box dialog icon actions should have field-readable accessible names");
    assert.ok(hasPagination, "saved-box dialog should include pagination for 200+ templates");
    assert.ok(inlinePanelIsCompact, "inline saved-box area should stay compact for 200+ templates");
  });

  it("저장된 박스는 .xlsx 파일을 선택하고 미리보기 dialog에서 확인한 뒤 일괄등록한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasImportAction =
      source.includes("엑셀로 박스 일괄등록") &&
      source.includes('accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"') &&
      source.includes("readBlockTemplateXlsxFile(file, {") &&
      source.includes("existingTemplateNames: templates.map((template) => template.name)");
    const hasPreviewDialog =
      source.includes("function BlockTemplateImportDialog") &&
      source.includes('id="block-template-import-dialog"') &&
      source.includes('className="block-template-import-dialog"') &&
      source.includes("가져올 박스") &&
      source.includes("오류 행");
    const hasExplicitCommit =
      source.includes("preview.canImport") &&
      source.includes("onImportTemplates(preview.rows)") &&
      source.includes("일괄등록 적용");
    const hasRowLevelFeedback =
      source.includes("block-template-import-error-list") &&
      source.includes("error.rowNumber ? `${error.rowNumber}행 · ` : \"\"") &&
      source.includes("createImportCandidateMeta(row)");

    // Then
    assert.ok(hasImportAction, "saved-box panel should expose a .xlsx-only import action");
    assert.ok(hasPreviewDialog, "xlsx import should use a preview dialog before saving");
    assert.ok(hasExplicitCommit, "xlsx import should require an explicit apply action");
    assert.ok(hasRowLevelFeedback, "xlsx import should show row-level errors and candidate summaries");
  });

  it("엑셀 일괄등록은 파일 선택 전 포맷 안내 dialog를 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasFormatAction =
      source.includes("엑셀 포맷 보기") &&
      source.includes('aria-controls="block-template-import-format-dialog"') &&
      source.includes("setBlockImportFormatDialogOpen(true)");
    const hasFormatDialog =
      source.includes("function BlockTemplateImportFormatDialog") &&
      source.includes('id="block-template-import-format-dialog"') &&
      source.includes("엑셀 박스 일괄등록 포맷") &&
      source.includes("샘플 파일 다운로드") &&
      source.includes("createBlockTemplateImportSampleWorkbook") &&
      source.includes("BLOCK_TEMPLATE_XLSX_COLUMNS.join") &&
      source.includes("BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS");
    const hasAutomationCopy =
      source.includes("업무 자동화 기준") &&
      source.includes("첫 행은 아래 열 이름과 동일해야 하며 .xlsx 파일만 지원합니다.") &&
      source.includes("이 포맷으로 파일 선택");
    const hasFormatStyles =
      /\.block-template-format-callout\s*{[\s\S]*?display:\s*grid;[\s\S]*?background:\s*#f7fbff;[\s\S]*?}/.test(css) &&
      /\.block-template-format-table-wrap\s*{[\s\S]*?overflow:\s*auto;[\s\S]*?background:\s*white;[\s\S]*?}/.test(css) &&
      /\.block-template-format-table\s*{[\s\S]*?min-width:\s*680px;[\s\S]*?border-collapse:\s*collapse;[\s\S]*?}/.test(css);

    // Then
    assert.ok(hasFormatAction, "xlsx import should expose a format guide before picking a file");
    assert.ok(hasFormatDialog, "format guide should render required headers and sample rows");
    assert.ok(hasAutomationCopy, "format guide should explain automation-friendly .xlsx requirements");
    assert.ok(hasFormatStyles, "format guide should stay readable with wide Excel columns");
  });

  it("저장된 박스 dialog는 불투명 배경, pagination, 모바일 48px 터치 타깃을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const searchRule =
      /\.block-library-search\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*6px;[\s\S]*?}/.test(css);
    const filterRule =
      /\.block-library-filters\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        css
      );
    const dialogRule =
      /\.block-library-dialog\s*{[\s\S]*?width:\s*min\(920px,\s*calc\(100vw\s*-\s*24px\)\);[\s\S]*?max-height:\s*calc\(100dvh\s*-\s*24px\);[\s\S]*?background:\s*var\(--surface\);[\s\S]*?}/.test(
        css
      );
    const paginationRule =
      /\.block-library-pagination\s*{[\s\S]*?display:\s*flex;[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(css);
    const inputRule =
      /\.block-library-search\s+input,[\s\S]*?\.block-library-filters\s+select\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?width:\s*100%;[\s\S]*?}/.test(
        css
      );
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.block-library-search,[\s\S]*?\.block-library-filters\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(searchRule, "search wrapper should be a compact grid");
    assert.ok(filterRule, "group filters should use two compact columns on desktop");
    assert.ok(dialogRule, "saved-box dialog should fit in the viewport with an opaque surface");
    assert.ok(paginationRule, "saved-box pagination should keep field-friendly touch targets");
    assert.ok(inputRule, "search input and filters should keep field-friendly touch targets");
    assert.ok(mobileRule, "search input and filters should remain one column on mobile");
  });

  it(".xlsx 일괄등록 dialog는 불투명 배경, 스크롤 목록, 모바일 전체 화면을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const dialogRule =
      /\.block-template-import-dialog\s*{[\s\S]*?width:\s*min\(820px,\s*calc\(100vw\s*-\s*24px\)\);[\s\S]*?max-height:\s*calc\(100dvh\s*-\s*24px\);[\s\S]*?background:\s*var\(--surface\);[\s\S]*?}/.test(
        css
      );
    const backdropRule =
      /\.block-template-import-dialog::backdrop\s*{[\s\S]*?background:\s*rgba\(15,\s*23,\s*42,\s*0\.42\);[\s\S]*?}/.test(
        css
      );
    const listRule =
      /\.block-template-import-list\s*{[\s\S]*?display:\s*grid;[\s\S]*?overflow:\s*auto;[\s\S]*?}/.test(
        css
      );
    const actionRule =
      /\.block-template-import-actions\s*{[\s\S]*?display:\s*flex;[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(
        css
      );
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.block-template-import-dialog\s*{[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100dvh;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(dialogRule, "xlsx import dialog should fit in the viewport with an opaque surface");
    assert.ok(backdropRule, "xlsx import dialog should dim the background");
    assert.ok(listRule, "xlsx import dialog should keep long previews scrollable");
    assert.ok(actionRule, "xlsx import dialog actions should keep field-friendly touch targets");
    assert.ok(mobileRule, "xlsx import dialog should become full-screen on mobile");
  });

  it("등록된 그룹 관리는 대량 그룹을 대비해 본문에 펼치지 않고 dialog에서 검색하고 삭제한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasGroupManageAction =
      source.includes("등록된 그룹 관리") &&
      source.includes('aria-haspopup="dialog"') &&
      source.includes('aria-controls="block-group-management-dialog"');
    const hasGroupManagementDialog =
      source.includes("function BlockGroupManagementDialog") &&
      source.includes('id="block-group-management-dialog"') &&
      source.includes('className="block-group-management-dialog"') &&
      source.includes('aria-label="등록된 그룹 검색"') &&
      source.includes("검색 결과가 없습니다. 다른 그룹명으로 찾아보세요.");
    const hasDialogControls =
      source.includes("BLOCK_GROUP_PAGE_SIZE") &&
      source.includes("block-group-pagination") &&
      source.includes("onDeleteBlockGroup") &&
      source.includes("등록된 그룹이 아직 없습니다.");
    const hasDeleteLabels =
      source.includes("aria-label={`상위 그룹 ${group.name} 삭제`}") &&
      source.includes("aria-label={`하위 그룹 ${childGroup.name} 삭제`}");

    // Then
    assert.ok(hasGroupManageAction, "registered groups should open through a clear management dialog action");
    assert.ok(hasGroupManagementDialog, "registered groups should render in an accessible management dialog");
    assert.ok(hasDialogControls, "registered group dialog should support pagination and delete actions");
    assert.ok(hasDeleteLabels, "registered group delete buttons should have readable accessible names");
  });

  it("등록된 그룹 관리 dialog는 불투명 배경, 스크롤 목록, pagination, 모바일 전체 화면을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const dialogRule =
      /\.block-group-management-dialog\s*{[\s\S]*?width:\s*min\(720px,\s*calc\(100vw\s*-\s*24px\)\);[\s\S]*?max-height:\s*calc\(100dvh\s*-\s*24px\);[\s\S]*?background:\s*var\(--surface\);[\s\S]*?}/.test(
        css
      );
    const listRule =
      /\.block-group-management-dialog-list\s*{[\s\S]*?display:\s*grid;[\s\S]*?overflow:\s*auto;[\s\S]*?}/.test(
        css
      );
    const paginationRule =
      /\.block-group-pagination\s*{[\s\S]*?display:\s*flex;[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(css);
    const inputRule =
      /\.block-group-management-search\s+input\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?width:\s*100%;[\s\S]*?}/.test(
        css
      );
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.block-group-management-dialog\s*{[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100dvh;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(dialogRule, "group management dialog should fit in the viewport with an opaque surface");
    assert.ok(listRule, "group management dialog should keep long lists scrollable");
    assert.ok(paginationRule, "group management pagination should keep field-friendly touch targets");
    assert.ok(inputRule, "group management search should keep field-friendly touch targets");
    assert.ok(mobileRule, "group management dialog should become full-screen on mobile");
  });
});
