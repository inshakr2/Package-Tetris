import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("current-work-reset-layout", () => {
  it("현재 작업 영역은 저장 라이브러리를 보존하는 새 작업 시작 액션과 확인 dialog를 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasResetState =
      source.includes("resetWorkDialogOpen") &&
      source.includes("setResetWorkDialogOpen") &&
      source.includes("hasCurrentWorkToReset(workspace)");
    const hasResetAction =
      source.includes("onRequestResetCurrentWork") &&
      source.includes('className="secondary-button current-work-reset-action"') &&
      source.includes("새 작업 시작");
    const hasConfirmDialog =
      source.includes("function ResetCurrentWorkDialog") &&
      source.includes("현재 작업을 새로 시작할까요?") &&
      source.includes("저장된 공간과 박스는 그대로 둡니다.") &&
      source.includes("현재 작업 비우기");

    // Then
    assert.ok(hasResetState, "workspace should track whether current work can be reset");
    assert.ok(hasResetAction, "current work panel should expose a reset action");
    assert.ok(hasConfirmDialog, "reset action should require a clear field-language confirmation");
  });

  it("새 작업 시작 액션과 확인 dialog는 모바일 터치 타깃과 한 컬럼 배치를 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const resetActionRule =
      /\.current-work-reset-action\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(css);
    const headerActionsRule =
      /\.current-work-head\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[\s\S]*?}/.test(
        css
      );
    const dialogActionRule =
      /\.reset-work-actions\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        css
      );
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.current-work-head\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.reset-work-actions\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(resetActionRule, "reset action should be a 48px touch target");
    assert.ok(headerActionsRule, "current work header should keep copy and action aligned");
    assert.ok(dialogActionRule, "confirm dialog actions should be balanced before mobile collapse");
    assert.ok(mobileRule, "mobile should stack the reset action and dialog actions");
  });
});
