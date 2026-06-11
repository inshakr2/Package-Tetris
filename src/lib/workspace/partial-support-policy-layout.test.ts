import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("partial-support-policy-layout", () => {
  it("실행 전 확인은 부분 지지 허용 토글과 55% 현장 판단 설명을 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasReviewPolicyCard =
      source.includes('className="partial-support-policy-card"') &&
      source.includes('aria-label="부분 지지 허용"') &&
      source.includes("onPartialSupportChange") &&
      source.includes("받침면 55% 이상") &&
      source.includes("현장 책임자 판단");

    // Then
    assert.equal(hasReviewPolicyCard, true);
  });

  it("추가 박스 시뮬레이션은 현재 부분 지지 정책 적용 상태를 같은 문구로 보여준다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasChainPolicyNotice =
      source.includes('className="chain-policy-notice"') &&
      source.includes("부분 지지 허용 적용 중") &&
      source.includes("부분 지지 허용 꺼짐") &&
      source.includes("추가 박스도 현재 실행 전 확인 정책과 같은 기준으로 계산합니다.");

    // Then
    assert.equal(hasChainPolicyNotice, true);
  });

  it("부분 지지 정책 UI는 모바일에서 한 컬럼과 48px 터치 타깃을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const hasCardLayout =
      /\.partial-support-policy-card\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[\s\S]*?}/.test(
        css
      );
    const hasToggleTouchTarget =
      /\.partial-support-toggle\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?display:\s*inline-flex;[\s\S]*?}/.test(css);
    const hasMobileLayout =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.partial-support-policy-card\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.partial-support-toggle\s*{[\s\S]*?width:\s*100%;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.equal(hasCardLayout && hasToggleTouchTarget && hasMobileLayout, true);
  });
});
