import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("result-action-accessibility-layout", () => {
  it("반복 노출되는 결과 만들기 CTA는 보이는 문구를 유지하면서 위치별 접근성 이름을 구분한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasReviewCardActionLabel = source.includes("실행 전 확인에서 결과 만들기");
    const hasEmptyResultActionLabel = source.includes("결과 대기 화면에서 결과 만들기");
    const hasResultPanelActionLabel = source.includes(
      'aria-label={latestResult ? "현재 입력으로 다시 계산" : "결과 작업에서 결과 만들기"}'
    );
    const hasMobileStickyActionLabel = source.includes(
      "getMobileStickyActionAriaLabel(mobileStickyAction.action, mobileStickyAction.buttonLabel)"
    );
    const keepsVisibleResultCopy = source.includes(
      '{creatingResult ? resultCalculationProgress.buttonLabel : "결과 만들기"}'
    );

    // Then
    assert.equal(hasReviewCardActionLabel, true);
    assert.equal(hasEmptyResultActionLabel, true);
    assert.equal(hasResultPanelActionLabel, true);
    assert.equal(hasMobileStickyActionLabel, true);
    assert.equal(keepsVisibleResultCopy, true);
  });
});
