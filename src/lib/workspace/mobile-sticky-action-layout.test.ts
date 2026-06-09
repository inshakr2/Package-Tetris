import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const workspaceSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

describe("mobile-sticky-action-layout", () => {
  it("모바일 하단 주요 액션은 상태 설명과 버튼을 접근성 속성으로 연결한다", () => {
    // Given
    const hasStickyRegion =
      workspaceSource.includes('className="sticky-mobile-actions"') &&
      workspaceSource.includes('role="region"') &&
      workspaceSource.includes('aria-label="모바일 주요 작업"');
    const hasLiveCopy =
      workspaceSource.includes('className="sticky-mobile-copy"') &&
      workspaceSource.includes('role="status"') &&
      workspaceSource.includes('aria-live="polite"') &&
      workspaceSource.includes('aria-atomic="true"');
    const hasDescribedButton =
      workspaceSource.includes("MOBILE_STICKY_STATUS_ID") &&
      workspaceSource.includes("MOBILE_STICKY_HELPER_ID") &&
      workspaceSource.includes('aria-describedby={`${MOBILE_STICKY_STATUS_ID} ${MOBILE_STICKY_HELPER_ID}`}');

    // When
    const isAccessibleStickyAction = hasStickyRegion && hasLiveCopy && hasDescribedButton;

    // Then
    assert.equal(isAccessibleStickyAction, true);
  });

  it("모바일 하단 주요 액션은 데스크톱과 태블릿에서 숨기고 모바일에서만 고정 표시한다", () => {
    // Given
    const baseHiddenRule = /\.sticky-mobile-actions\s*{[\s\S]*?display:\s*none;[\s\S]*?}/.test(styles);
    const mobileVisibleRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.sticky-mobile-actions\s*{[\s\S]*?display:\s*grid;[\s\S]*?}/.test(
        styles
      );
    const shellPaddingRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.workspace-stack\s*{[\s\S]*?padding-bottom:\s*148px;[\s\S]*?}/.test(
        styles
      );

    // When
    const hasResponsiveStickyContract = baseHiddenRule && mobileVisibleRule && shellPaddingRule;

    // Then
    assert.equal(hasResponsiveStickyContract, true);
  });
});
