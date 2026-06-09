import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("result-action-panel-layout", () => {
  it("결과 화면은 입력 수정과 다시 계산 액션을 같은 패널에서 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasActionPanel =
      source.includes('className="sub-panel result-action-panel"') &&
      source.includes("결과 작업") &&
      source.includes('className="secondary-button result-edit-input-action"') &&
      source.includes("입력 수정") &&
      source.includes('className="primary-button result-recalculate-action"') &&
      source.includes("다시 계산");

    // Then
    assert.ok(hasActionPanel, "result area should expose edit-input and recalculate actions");
  });

  it("입력 수정 액션은 현재 작업 영역으로 스크롤하고 포커스를 이동한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasCurrentWorkRef =
      source.includes("const currentWorkSectionRef = useRef<HTMLElement>(null);") &&
      source.includes("ref={currentWorkSectionRef}") &&
      source.includes("tabIndex={-1}");
    const hasFocusHandler =
      source.includes("function focusCurrentWorkInputs()") &&
      source.includes('scrollIntoView({ behavior: "smooth", block: "start" })') &&
      source.includes("focus({ preventScroll: true })") &&
      source.includes("onEditInputs={focusCurrentWorkInputs}");
    const resultStageAcceptsHandler =
      source.includes("onEditInputs,") &&
      source.includes("onEditInputs: () => void;");

    // Then
    assert.ok(hasCurrentWorkRef, "current work section should be focusable as a scroll target");
    assert.ok(hasFocusHandler, "result edit action should move the operator back to the input section");
    assert.ok(resultStageAcceptsHandler, "ResultStage should receive the edit-input handler explicitly");
  });

  it("결과 액션 버튼은 모바일 터치 타깃과 한 컬럼 줄바꿈을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const panelRule = /\.result-action-panel\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*10px;[\s\S]*?}/.test(css);
    const actionGridRule =
      /\.result-action-buttons\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?gap:\s*8px;[\s\S]*?}/.test(
        css
      );
    const touchTargetRule =
      /\.result-edit-input-action,\s*\.result-recalculate-action\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        css
      );
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-action-buttons\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );
    const scrollMarginRule =
      /\.current-work-row\s*{[\s\S]*?scroll-margin-top:\s*112px;[\s\S]*?}/.test(css);

    // Then
    assert.ok(panelRule, "result action panel should use a compact grid");
    assert.ok(actionGridRule, "result action buttons should share a balanced desktop/tablet row");
    assert.ok(touchTargetRule, "result action buttons should keep field-friendly touch targets");
    assert.ok(mobileRule, "result action buttons should stack on narrow screens");
    assert.ok(scrollMarginRule, "input section should avoid being hidden under sticky headers after scroll");
  });
});
