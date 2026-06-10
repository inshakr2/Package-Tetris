import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("block-library-search-layout", () => {
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
      source.includes("blockLibraryGroup2Filter");
    const hasEmptyResultCopy = source.includes("검색 결과가 없습니다. 다른 이름이나 치수로 찾아보세요.");

    // Then
    assert.ok(hasSearchState, "block library should keep local search state and filtered templates");
    assert.ok(hasSearchInput, "block library should expose a field-friendly search input");
    assert.ok(hasGroupFilters, "block library should expose group filters for large saved-box libraries");
    assert.ok(hasEmptyResultCopy, "empty search results should explain the next action");
  });

  it("신규 박스 등록은 기본 수량 대신 무게와 상위/하위 그룹 입력을 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasRemovedDefaultQuantity =
      !source.includes("기본 수량(개)") && !source.includes('aria-label="박스 기본 수량 개"');
    const hasOptionalMetadataFields =
      source.includes("무게(kg)") &&
      source.includes('aria-label="박스 무게 kg"') &&
      source.includes("상위그룹") &&
      source.includes("하위그룹") &&
      source.includes('placeholder="예: 금영"') &&
      source.includes('placeholder="예: 스피커"');
    const hasPlaceholderName = source.includes('placeholder="예: 스피커 박스"');

    // Then
    assert.ok(hasRemovedDefaultQuantity, "template form should not ask for a default quantity");
    assert.ok(hasOptionalMetadataFields, "template form should collect optional weight and group metadata");
    assert.ok(hasPlaceholderName, "box name should use an example placeholder instead of prefilled text");
  });

  it("저장된 박스 검색 입력은 모바일에서 48px 터치 타깃과 한 컬럼 배치를 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const searchRule =
      /\.block-library-search\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*6px;[\s\S]*?}/.test(css);
    const filterRule =
      /\.block-library-filters\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        css
      );
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
    assert.ok(inputRule, "search input and filters should keep field-friendly touch targets");
    assert.ok(mobileRule, "search input and filters should remain one column on mobile");
  });
});
