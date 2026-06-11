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
      source.includes("먼저 바닥에") &&
      source.includes("가장 먼저");
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
      source.includes('label="하단 우선"') &&
      source.includes('value={priorityBlockCount > 0 ? `${priorityBlockCount}개 항목` : "없음"}');

    // Then
    assert.ok(hasPriorityCount, "workspace should count only draft items with explicit floor-priority settings");
    assert.ok(passesSummaryToReview, "review card should receive the priority summary count");
    assert.ok(hasReviewSummaryTile, "review card should summarize priority settings without adding more inputs");
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
});
