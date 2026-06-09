import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("result-viewer-expanded-layout", () => {
  it("3D 크게 보기 버튼은 dialog를 여는 터치 가능한 컨트롤로 표시된다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasDialogButton =
      source.includes('className="secondary-button result-three-expand-button"') &&
      source.includes('aria-haspopup="dialog"') &&
      source.includes("크게 보기");
    const hasTouchTarget = css.match(
      /\.result-three-expand-button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/
    );

    // Then
    assert.ok(hasDialogButton, "3D viewer should expose a clear button that opens the dialog");
    assert.ok(hasTouchTarget, "expanded 3D button should keep a field-friendly 48px touch target");
  });

  it("확대 3D dialog는 top layer backdrop과 큰 canvas 영역을 가진다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasDialogMarkup =
      source.includes("function ExpandedThreeViewDialog") &&
      source.includes('className="result-three-dialog"') &&
      source.includes('aria-modal="true"');
    const hasDialogRule = css.match(
      /\.result-three-dialog\s*{[\s\S]*?width:\s*min\(1040px,\s*calc\(100vw\s*-\s*24px\)\);[\s\S]*?max-height:\s*calc\(100dvh\s*-\s*24px\);[\s\S]*?}/
    );
    const hasBackdropRule = css.match(
      /\.result-three-dialog::backdrop\s*{[\s\S]*?background:\s*rgba\(15,\s*23,\s*42,\s*0\.42\);[\s\S]*?}/
    );
    const hasShellRule = css.match(
      /\.result-three-dialog-body\s+\.result-three-shell\s*{[\s\S]*?height:\s*100%;[\s\S]*?max-height:\s*none;[\s\S]*?}/
    );

    // Then
    assert.ok(hasDialogMarkup, "expanded 3D view should use an accessible native dialog");
    assert.ok(hasDialogRule, "expanded 3D dialog should fit inside the viewport");
    assert.ok(hasBackdropRule, "expanded 3D dialog should visually separate from the page");
    assert.ok(hasShellRule, "expanded 3D canvas should fill the dialog body");
  });

  it("모바일 확대 3D dialog는 거의 전체 화면 높이와 안전 영역을 사용한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileDialogRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-three-dialog\s*{[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100dvh;[\s\S]*?max-height:\s*100dvh;[\s\S]*?}/
    );
    const mobileSheetRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-three-dialog-sheet\s*{[\s\S]*?padding:\s*max\(10px,\s*env\(safe-area-inset-top\)\)\s+12px\s+max\(12px,\s*env\(safe-area-inset-bottom\)\);[\s\S]*?}/
    );

    // Then
    assert.ok(mobileDialogRule, "mobile expanded 3D dialog should use the available viewport height");
    assert.ok(mobileSheetRule, "mobile expanded 3D dialog should account for safe areas");
  });
});
