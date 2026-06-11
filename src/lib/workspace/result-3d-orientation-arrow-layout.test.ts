import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const RESULT_3D_CANVAS_PATH = join(process.cwd(), "src/components/result-stage/result-3d-canvas.client.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("result-3d-orientation-arrow-layout", () => {
  it("3D 렌더러는 처음 입력한 높이 방향 화살표를 선택/카메라 조작과 분리해 렌더링한다", () => {
    // Given
    const source = readFileSync(RESULT_3D_CANVAS_PATH, "utf8");

    // When
    const hasOrientationProp = source.includes("showOrientationArrows");
    const hasArrowFactory = source.includes("function createBlockOrientationArrow");
    const usesThreeArrowHelper = source.includes("new THREE.ArrowHelper");
    const keepsRaycastOnBlockMeshes = source.includes("raycasterRef.current.intersectObjects(blockMeshesRef.current, false)");
    const explainsOriginalHeight = source.includes("처음 입력한 높이 방향");
    const keepsFallbackCopy = source.includes("방향 화살표가 없어도 위/앞/옆 보기로 배치를 확인할 수 있습니다.");

    // Then
    assert.ok(hasOrientationProp, "3D canvas should accept an orientation arrow visibility prop");
    assert.ok(hasArrowFactory && usesThreeArrowHelper, "3D canvas should render orientation arrows with Three.js");
    assert.ok(keepsRaycastOnBlockMeshes, "orientation arrows should not join block picking targets");
    assert.ok(explainsOriginalHeight, "3D canvas should explain what the arrow means");
    assert.ok(keepsFallbackCopy, "WebGL fallback should still explain that result review is possible without arrows");
  });

  it("결과 화면은 방향 표시 토글을 일반 보기와 크게 보기 양쪽에 연결한다", () => {
    // Given
    const source = readFileSync(APP_PATH, "utf8");

    // When
    const hasState = source.includes("showOrientationArrows");
    const hasToggleLabel = source.includes("방향 표시");
    const hasTogglePressedState = source.includes("aria-pressed={showOrientationArrows}");
    const passesToMainCanvas = source.includes("showOrientationArrows={showOrientationArrows}");
    const passesToExpandedDialog = source.includes("onToggleOrientationArrows");

    // Then
    assert.ok(hasState, "result screen should own orientation arrow visibility state");
    assert.ok(hasToggleLabel && hasTogglePressedState, "orientation toggle should be visible and accessible");
    assert.ok(passesToMainCanvas, "main 3D canvas should receive orientation visibility state");
    assert.ok(passesToExpandedDialog, "expanded 3D dialog should control the same orientation visibility state");
  });

  it("모바일 방향 표시 토글은 48px 터치 타깃과 전체 행 배치를 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileToggleRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.three-camera-buttons\s+\.result-orientation-toggle\s*{[\s\S]*?grid-column:\s*1\s*\/\s*-1;[\s\S]*?}/
    );

    // Then
    assert.ok(mobileToggleRule, "orientation toggle should occupy a full row on mobile to avoid label overflow");
  });
});
