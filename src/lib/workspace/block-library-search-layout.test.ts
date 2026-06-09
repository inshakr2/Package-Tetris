import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("block-library-search-layout", () => {
  it("저장된 박스 영역은 현장 사용자가 이름과 치수로 필터링할 수 있는 검색 입력을 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasSearchState =
      source.includes("const [blockLibrarySearchTerm, setBlockLibrarySearchTerm] = useState(\"\")") &&
      source.includes("const visibleTemplates = searchBlockTemplates(templates, blockLibrarySearchTerm)");
    const hasSearchInput =
      source.includes('className="block-library-search"') &&
      source.includes('aria-label="저장된 박스 검색"') &&
      source.includes('placeholder="박스명, 치수, 깨짐주의 검색"') &&
      source.includes("onChange={(event) => setBlockLibrarySearchTerm(event.target.value)}");
    const hasEmptyResultCopy = source.includes("검색 결과가 없습니다. 다른 이름이나 치수로 찾아보세요.");

    // Then
    assert.ok(hasSearchState, "block library should keep local search state and filtered templates");
    assert.ok(hasSearchInput, "block library should expose a field-friendly search input");
    assert.ok(hasEmptyResultCopy, "empty search results should explain the next action");
  });

  it("저장된 박스 검색 입력은 모바일에서 48px 터치 타깃과 한 컬럼 배치를 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const searchRule =
      /\.block-library-search\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*6px;[\s\S]*?}/.test(css);
    const inputRule =
      /\.block-library-search\s+input\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?width:\s*100%;[\s\S]*?}/.test(css);
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.block-library-search\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(searchRule, "search wrapper should be a compact grid");
    assert.ok(inputRule, "search input should keep a field-friendly touch target");
    assert.ok(mobileRule, "search input should remain one column on mobile");
  });
});
