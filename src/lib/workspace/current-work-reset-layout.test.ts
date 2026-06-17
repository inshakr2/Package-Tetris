import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const CURRENT_WORK_PANEL_PATH = join(process.cwd(), "src/components/workspace/current-work-blocks-panel.tsx");
const RESET_CURRENT_WORK_DIALOG_PATH = join(process.cwd(), "src/components/workspace/reset-current-work-dialog.tsx");
const DRAFT_UNDO_TOAST_PATH = join(process.cwd(), "src/components/workspace/draft-undo-toast.tsx");

describe("current-work-reset-layout", () => {
  it("현재 작업 영역은 저장 라이브러리를 보존하는 새 작업 시작 액션과 확인 dialog를 제공한다", () => {
    // Given
    const appSource = readFileSync(WORKSPACE_APP_PATH, "utf8");
    const panelSource = readFileSync(CURRENT_WORK_PANEL_PATH, "utf8");
    const resetDialogSource = readFileSync(RESET_CURRENT_WORK_DIALOG_PATH, "utf8");

    // When
    const hasResetState =
      appSource.includes("resetWorkDialogOpen") &&
      appSource.includes("setResetWorkDialogOpen") &&
      appSource.includes("hasCurrentWorkToReset(workspace)");
    const hasResetAction =
      panelSource.includes("onRequestResetCurrentWork") &&
      panelSource.includes('className="secondary-button current-work-reset-action"') &&
      panelSource.includes("새 작업 시작");
    const hasConfirmDialog =
      appSource.includes("@/components/workspace/reset-current-work-dialog") &&
      resetDialogSource.includes("export function ResetCurrentWorkDialog") &&
      resetDialogSource.includes("현재 작업을 새로 시작할까요?") &&
      resetDialogSource.includes("저장된 공간과 박스는 그대로 둡니다.") &&
      resetDialogSource.includes("현재 작업 비우기") &&
      resetDialogSource.includes('role="alertdialog"');

    // Then
    assert.ok(hasResetState, "workspace should track whether current work can be reset");
    assert.ok(hasResetAction, "current work panel should expose a reset action");
    assert.ok(hasConfirmDialog, "reset action should require a clear field-language confirmation");
  });

  it("현재 작업 제거 되돌리기 toast는 워크스페이스 컴포넌트로 분리되어 복구 행동을 유지한다", () => {
    // Given
    const appSource = readFileSync(WORKSPACE_APP_PATH, "utf8");
    const toastSource = readFileSync(DRAFT_UNDO_TOAST_PATH, "utf8");

    // When
    const hasToastContract =
      appSource.includes("@/components/workspace/draft-undo-toast") &&
      toastSource.includes("export function DraftUndoToast") &&
      toastSource.includes("이번 작업에서 제거했습니다.") &&
      toastSource.includes("되돌리기") &&
      toastSource.includes('aria-live="polite"') &&
      toastSource.includes('data-tone={undoDisabled ? "amber" : "green"}');

    // Then
    assert.ok(hasToastContract, "draft undo toast should remain a field-language recovery action");
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
