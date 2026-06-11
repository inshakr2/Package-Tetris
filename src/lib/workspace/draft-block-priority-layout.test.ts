import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("draft-block-priority-layout", () => {
  it("현재 작업 박스마다 현장 문구 기반 하단 우선 설정을 노출한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasUpdatePath =
      source.includes("updateDraftBlockItemLoadPriority") &&
      source.includes("function updateCurrentLoadPriority") &&
      source.includes("onLoadPriorityChange={updateCurrentLoadPriority}");
    const hasFieldCopy =
      source.includes("아래층 우선") &&
      source.includes("기본") &&
      source.includes('displayLabel: "먼저\\n바닥에"') &&
      source.includes("맨 아래 우선");
    const hasAccessibleGroup =
      source.includes('className="draft-priority-control"') &&
      source.includes('role="group"') &&
      source.includes('aria-label={`${block.name} 아래층 우선 설정`}') &&
      source.includes("DRAFT_LOAD_PRIORITY_OPTIONS.map");

    // Then
    assert.ok(hasUpdatePath, "draft priority should be wired from UI to workspace update helper");
    assert.ok(hasFieldCopy, "priority options should use field-readable Korean labels");
    assert.ok(hasAccessibleGroup, "priority controls should be grouped with a block-specific label");
  });

  it("실행 전 확인은 하단 우선으로 지정한 현재 작업 항목 수를 요약한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasPriorityCount =
      source.includes("const priorityBlockCount = draftBlocks.filter") &&
      source.includes("normalizeDraftLoadPriorityOptionValue(block.loadPriority) > 0");
    const passesSummaryToReview =
      source.includes("priorityBlockCount={priorityBlockCount}") &&
      source.includes("priorityBlockCount: number;");
    const hasReviewSummaryTile =
      source.includes('className="summary-grid compact-summary review-summary-grid"') &&
      source.includes('label="하단 우선"') &&
      source.includes('value={priorityBlockCount > 0 ? `${priorityBlockCount}개 항목` : "없음"}');

    // Then
    assert.ok(hasPriorityCount, "workspace should count only draft items with explicit floor-priority settings");
    assert.ok(passesSummaryToReview, "review card should receive the priority summary count");
    assert.ok(hasReviewSummaryTile, "review card should summarize priority settings without adding more inputs");
  });

  it("실행 전 확인은 하단 우선 박스명과 우선 단계를 함께 보여준다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const createsPrioritySummaries =
      source.includes("const priorityBlockSummaries = draftBlocks.flatMap") &&
      source.includes("createDraftLoadPrioritySummary(block)") &&
      source.includes("`${block.name} ${block.quantity}개 · ${getDraftLoadPriorityLabel(priority)}`");
    const passesPrioritySummaries =
      source.includes("priorityBlockSummaries={priorityBlockSummaries}") &&
      source.includes("priorityBlockSummaries: string[];");
    const rendersPrioritySummaries =
      source.includes('className="review-priority-summary"') &&
      source.includes("priorityBlockSummaries.map") &&
      source.includes("하단 우선 박스");

    // Then
    assert.ok(createsPrioritySummaries, "workspace should create readable priority summaries from draft blocks");
    assert.ok(passesPrioritySummaries, "review card should receive the readable priority summaries");
    assert.ok(rendersPrioritySummaries, "review card should render names and priority levels, not only a count");
  });

  it("실행 전 확인 요약은 6개 타일을 위한 전용 그리드로 부피 타일 압축을 피한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasReviewGrid =
      /\.review-summary-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        css
      );
    const hasTabletGrid =
      /@media\s*\(max-width:\s*1279px\)\s*{[\s\S]*?\.review-summary-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        css
      );
    const hasMobileGrid =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.review-summary-grid\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(hasReviewGrid, "review summary should use a three-column grid on wide screens");
    assert.ok(hasTabletGrid, "review summary should fall back to two columns on tablet widths");
    assert.ok(hasMobileGrid, "review summary should stack to one column on mobile");
  });

  it("하단 우선 설정은 모바일에서도 48px 터치 타깃과 줄바꿈 가능한 버튼을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const controlRule =
      /\.draft-priority-control\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*6px;[\s\S]*?}/.test(css);
    const buttonRule =
      /\.draft-priority-options\s+button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        css
      );
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.draft-priority-options\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(controlRule, "priority control should use stable grid layout");
    assert.ok(buttonRule, "priority buttons should keep field-friendly touch targets");
    assert.ok(mobileRule, "priority buttons should stack on narrow screens");
  });

  it("현재 작업 영역은 1280px 현장 PC 폭에서 한 컬럼으로 접혀 입력 카드 압축을 피한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasFieldPcLayout =
      /@media\s*\(max-width:\s*1360px\)\s*{[\s\S]*?\.current-work-layout\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(hasFieldPcLayout, "current work cards should remain readable around 1280px field PC widths");
  });
});
