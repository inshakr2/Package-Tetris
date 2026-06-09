import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

function hasSelectorRuleWith(css: string, selector: string, declarationPattern: RegExp) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = css.match(new RegExp(`(^|\\n)${escapedSelector}\\s*{[\\s\\S]*?}`))?.[0] ?? "";
  return declarationPattern.test(rule);
}

describe("field-responsive-overflow-layout", () => {
  it("결과 화면 핵심 그리드는 작은 화면에서 가로 넘침을 만들지 않도록 min-width를 0으로 둔다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
    const resultGridSelectors = [
      ".result-hero-grid",
      ".result-lower-grid",
      ".result-workspace-grid",
      ".projection-board",
      ".result-three-shell",
      ".result-three-host",
      ".offset-preview-dialog-body .result-three-shell",
      ".result-three-dialog-body .result-three-shell",
    ];

    // When
    const selectorsMissingMinWidth = resultGridSelectors.filter(
      (selector) => !hasSelectorRuleWith(css, selector, /min-width:\s*0;/)
    );

    // Then
    assert.deepEqual(selectorsMissingMinWidth, []);
  });

  it("3D와 2D 결과 보드 컨테이너는 캔버스/박스가 부모 폭을 밀어내지 않도록 overflow를 숨긴다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
    const visualContainerSelectors = [
      ".projection-board",
      ".result-three-host",
      ".offset-preview-dialog-body",
      ".result-three-dialog-body",
    ];

    // When
    const selectorsMissingOverflowGuard = visualContainerSelectors.filter(
      (selector) => !hasSelectorRuleWith(css, selector, /overflow:\s*hidden;/)
    );

    // Then
    assert.deepEqual(selectorsMissingOverflowGuard, []);
  });
});
