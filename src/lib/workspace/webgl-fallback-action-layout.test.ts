import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const RESULT_3D_CANVAS_PATH = join(process.cwd(), "src/components/result-stage/result-3d-canvas.client.tsx");

describe("webgl-fallback-action-layout", () => {
  it("3D 렌더링 오류 상태는 2D 보기로 전환하는 명시적 CTA를 제공한다", () => {
    // Given
    const source = readFileSync(RESULT_3D_CANVAS_PATH, "utf8");

    // When
    const hasFallbackContract =
      source.includes("fallbackAction?:") &&
      source.includes("fallbackAction.label") &&
      source.includes('className="secondary-button three-fallback-action"');
    const hasErrorOnlyRendering =
      source.includes('renderState === "error" && fallbackAction') &&
      source.includes("방향 화살표가 없어도 위/앞/옆 보기로 배치를 확인할 수 있습니다.");

    // Then
    assert.ok(hasFallbackContract, "3D canvas should expose an optional fallback action contract");
    assert.ok(hasErrorOnlyRendering, "fallback CTA should only appear when the WebGL renderer is in error state");
  });

  it("결과 화면과 확대 3D dialog는 WebGL 실패 시 위 보기 fallback으로 연결된다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const inlineFallback =
      source.includes('fallbackAction={{') &&
      source.includes('label: "위 보기로 확인"') &&
      source.includes('onClick: () => selectProjectionView("top")');
    const expandedFallback =
      source.includes("openTopFallbackFromExpanded") &&
      source.includes('onOpenFallbackView={openTopFallbackFromExpanded}') &&
      source.includes("onOpenFallbackView();");

    // Then
    assert.ok(inlineFallback, "inline 3D view should switch to top projection when WebGL fails");
    assert.ok(expandedFallback, "expanded 3D dialog should close and switch to top projection when WebGL fails");
  });

  it("fallback CTA는 현장 터치 타깃과 모바일 줄바꿈을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const fallbackButtonRule = css.match(
      /\.three-fallback-action\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/
    );
    const mobileStatusRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.three-status\s*{[\s\S]*?display:\s*grid;[\s\S]*?}/
    );

    // Then
    assert.ok(fallbackButtonRule, "fallback action should be easy to tap and able to wrap");
    assert.ok(mobileStatusRule, "mobile fallback status row should stack without horizontal overflow");
  });
});
