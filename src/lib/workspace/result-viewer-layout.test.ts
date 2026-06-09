import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("result-viewer-layout", () => {
  it("모바일 결과 보기 버튼은 가로 chip row로 고정해 줄바꿈 흔들림을 줄인다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileViewRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.projection-toolbar\s+\.view-buttons,\s*\.three-camera-buttons\s*{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?overflow-x:\s*auto;[\s\S]*?}/
    );

    // Then
    assert.ok(mobileViewRule, "mobile result view controls should use a non-wrapping horizontal chip row");
  });

  it("모바일 결과 뷰어 버튼은 가로와 세로 모두 48px 이상 터치 타깃을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileButtonRule = css.match(
      /\.projection-toolbar\s+\.view-buttons\s+\.secondary-button,\s*\.three-camera-buttons\s+\.secondary-button\s*{[\s\S]*?flex:\s*0\s+0\s+auto;[\s\S]*?min-width:\s*48px;[\s\S]*?min-height:\s*48px;[\s\S]*?}/
    );

    // Then
    assert.ok(mobileButtonRule, "mobile result controls should keep 48px width and height touch targets");
  });

  it("모바일 결과 뷰어 버튼은 줄바꿈 대신 내부 스크롤로 페이지 가로 넘침을 피한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileButtonRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.projection-toolbar\s+\.view-buttons,\s*\.three-camera-buttons\s*{[\s\S]*?max-width:\s*100%;[\s\S]*?overscroll-behavior-inline:\s*contain;[\s\S]*?scroll-snap-type:\s*x\s+proximity;[\s\S]*?}/
    );

    // Then
    assert.ok(mobileButtonRule, "mobile result controls should contain horizontal scrolling inside the chip row");
  });
});
