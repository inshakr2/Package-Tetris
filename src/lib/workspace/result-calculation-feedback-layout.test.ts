import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");

describe("result-calculation-feedback-layout", () => {
  it("결과 생성은 계산 중 상태를 켜고 완료 후 해제한다", () => {
    // Given / When
    const hasCalculationState =
      source.includes("const [creatingResult, setCreatingResult] = useState(false)") &&
      source.includes("setCreatingResult(true)") &&
      source.includes("setCreatingResult(false)") &&
      source.includes("window.setTimeout(() => {");

    // Then
    assert.equal(hasCalculationState, true);
  });

  it("결과 생성 CTA들은 계산 중 같은 문구와 비활성 상태를 사용한다", () => {
    // Given / When
    const hasReviewCardFeedback =
      source.includes("creatingResult: boolean;") &&
      source.includes('aria-live="polite"') &&
      source.includes("creatingResult ? \"결과 계산 중...\" : \"결과 만들기\"");
    const hasResultStageFeedback =
      source.includes("resultCreating: boolean;") &&
      source.includes("resultCreating || resultFreshnessState.ctaDisabled") &&
      source.includes("resultCreating ? \"계산 중...\" : resultFreshnessState.ctaLabel");
    const hasEmptyStateFeedback =
      source.includes("resultCreating ? \"결과 계산 중...\" : \"결과 만들기\"");

    // Then
    assert.equal(hasReviewCardFeedback && hasResultStageFeedback && hasEmptyStateFeedback, true);
  });

  it("결과 계산 대기 중 저장 충돌이 들어오면 최신 충돌 상태로 결과 기록을 막는다", () => {
    // Given / When
    const hasConflictRef =
      /const\s+saveConflictRef\s*=\s*useRef<WorkspaceSaveConflictNotice\s*\|\s*null>\(null\)/.test(source) &&
      /const\s+setWorkspaceSaveConflict\s*=\s*useCallback\(\(nextConflict:\s*WorkspaceSaveConflictNotice\s*\|\s*null\)/.test(
        source
      ) &&
      source.includes("saveConflictRef.current = nextConflict") &&
      /if\s*\(\s*saveConflictRef\.current\s*\)\s*{\s*return;\s*}/.test(source) &&
      /if\s*\(\s*saveConflictRef\.current\s*\)\s*{\s*return current;\s*}/.test(source);

    // Then
    assert.equal(hasConflictRef, true);
  });
});
