import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("inline-action-touch-target-layout", () => {
  it("실행 전 검토 인라인 액션은 현장 터치 타깃을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasInlineActions =
      source.includes('className="inline-action"') &&
      source.includes("최신본 불러오기") &&
      source.includes("백업 만들기") &&
      source.includes("보호 강화");
    const hasBaseTouchTarget =
      /\.inline-action\s*{[\s\S]*?min-height:\s*44px;[\s\S]*?display:\s*inline-flex;[\s\S]*?align-items:\s*center;[\s\S]*?}/
        .test(css);
    const hasMobileTouchTarget =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.inline-action\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/
        .test(css);

    // Then
    assert.equal(hasInlineActions && hasBaseTouchTarget && hasMobileTouchTarget, true);
  });

  it("인라인 액션 묶음은 좁은 화면에서 한 줄 폭을 넘기지 않도록 줄바꿈을 허용한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasContentWrap =
      /\.review-message-content\s*{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?min-width:\s*0;[\s\S]*?}/
        .test(css);
    const hasInlineWrap =
      /\.inline-action\s*{[\s\S]*?max-width:\s*100%;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(css);

    // Then
    assert.equal(hasContentWrap && hasInlineWrap, true);
  });
});
