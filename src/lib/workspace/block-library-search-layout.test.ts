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

  it("그룹 등록 영역은 등록된 그룹 삭제 버튼을 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasGroupManager =
      source.includes('className="block-group-manager"') &&
      source.includes('aria-label="등록된 그룹 관리"') &&
      source.includes("onDeleteBlockGroup") &&
      source.includes("등록된 그룹이 아직 없습니다.");
    const hasDeleteLabels =
      source.includes("aria-label={`상위 그룹 ${group.name} 삭제`}") &&
      source.includes("aria-label={`하위 그룹 ${childGroup.name} 삭제`}");

    // Then
    assert.ok(hasGroupManager, "registered groups should be visible in the group register area");
    assert.ok(hasDeleteLabels, "registered group delete buttons should have readable accessible names");
  });
});
