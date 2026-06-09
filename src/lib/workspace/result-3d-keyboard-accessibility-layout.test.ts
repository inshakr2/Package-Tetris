import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const RESULT_3D_CANVAS_PATH = join(process.cwd(), "src/components/result-stage/result-3d-canvas.client.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("result-3d-keyboard-accessibility-layout", () => {
  it("3D host는 키보드 조작 가능한 영역과 스크린리더 안내를 연결한다", () => {
    // Given
    const source = readFileSync(RESULT_3D_CANVAS_PATH, "utf8");

    // When
    const hasKeyboardContract =
      source.includes("getResult3DKeyboardAction") &&
      source.includes("RESULT_3D_KEYBOARD_HELP_TEXT") &&
      source.includes("const keyboardHelpId = useId();");
    const hasAccessibleHost =
      source.includes('role="region"') &&
      source.includes('aria-roledescription="3D 적재 보기"') &&
      source.includes("aria-describedby={keyboardHelpId}") &&
      source.includes('className="three-keyboard-help"') &&
      source.includes("id={keyboardHelpId}");

    // Then
    assert.equal(hasKeyboardContract, true);
    assert.equal(hasAccessibleHost, true);
  });

  it("3D 키보드 조작은 선택 해제, 시점, 확대 축소, 회전을 명령별로 실행한다", () => {
    // Given
    const source = readFileSync(RESULT_3D_CANVAS_PATH, "utf8");

    // When
    const handlesActions =
      source.includes('action.type === "clearSelection"') &&
      source.includes('action.type === "reset"') &&
      source.includes('action.type === "preset"') &&
      source.includes('action.type === "zoom"') &&
      source.includes('action.type === "rotate"');
    const usesTargetCenteredHelpers =
      source.includes("zoomCameraAroundTarget(") &&
      source.includes("rotateCameraAroundTarget(") &&
      source.includes("event.preventDefault();");

    // Then
    assert.equal(handlesActions, true);
    assert.equal(usesTargetCenteredHelpers, true);
  });

  it("스크린리더 전용 3D 키보드 안내는 화면 레이아웃을 차지하지 않는다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasHiddenHelpRule =
      /\.three-keyboard-help\s*{[\s\S]*?position:\s*absolute;[\s\S]*?width:\s*1px;[\s\S]*?height:\s*1px;[\s\S]*?overflow:\s*hidden;[\s\S]*?clip:\s*rect\(0\s+0\s+0\s+0\);[\s\S]*?white-space:\s*nowrap;[\s\S]*?}/
        .test(css);

    // Then
    assert.equal(hasHiddenHelpRule, true);
  });
});
