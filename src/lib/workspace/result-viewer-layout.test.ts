import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("result-viewer-layout", () => {
  it("모바일 결과 보기 버튼은 2열 그리드로 배치해 작은 화면에서도 잘리지 않는다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileViewRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.projection-toolbar\s+\.view-buttons,\s*\.three-camera-buttons\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?max-width:\s*100%;[\s\S]*?}/
    );

    // Then
    assert.ok(mobileViewRule, "mobile result view controls should use a two-column grid");
  });

  it("모바일 결과 뷰어 버튼은 가로와 세로 모두 48px 이상 터치 타깃을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileButtonRule = css.match(
      /\.projection-toolbar\s+\.view-buttons\s+\.secondary-button,\s*\.three-camera-buttons\s+\.secondary-button\s*{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*48px;[\s\S]*?min-height:\s*48px;[\s\S]*?}/
    );

    // Then
    assert.ok(mobileButtonRule, "mobile result controls should keep 48px width and height touch targets");
  });

  it("모바일 3D 크게 보기 버튼은 전체 행을 사용해 내부 넘침을 피한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileButtonRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.three-camera-buttons\s+\.result-three-expand-button\s*{[\s\S]*?grid-column:\s*1\s*\/\s*-1;[\s\S]*?}/
    );

    // Then
    assert.ok(mobileButtonRule, "mobile expanded viewer action should occupy a full grid row");
  });
});
