import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("result-offset-recommendation-layout", () => {
  it("결과 화면은 안전 여유 조정 추천 카드를 결과 요약 근처에 표시한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const importsRecommendation = source.includes(
      "createOffsetAdjustmentRecommendation,\n  type OffsetAdjustmentRecommendation"
    );
    const hasRecommendationState =
      source.includes("const [offsetRecommendation, setOffsetRecommendation]") &&
      source.includes("createOffsetAdjustmentRecommendation({") &&
      source.includes("runPackingEngine: runPackingEngineInWorker");
    const hasRecommendationCard =
      source.includes('className="offset-recommendation-card"') &&
      source.includes("onReviewSpaceOffset") &&
      source.includes("focusSpaceInputs") &&
      source.includes("안전 여유 조정 추천") &&
      source.includes("현장 책임자 확인 후") &&
      source.includes('안전 여유를 조정하면{" "}') &&
      source.includes("공간을 더 적게 쓸 가능성이 있습니다.");

    // Then
    assert.ok(importsRecommendation, "ResultStage should import the offset recommendation helper");
    assert.ok(hasRecommendationState, "ResultStage should calculate recommendations asynchronously");
    assert.ok(hasRecommendationCard, "result area should render a field-language recommendation card");
  });

  it("안전 여유 추천 카드는 모바일에서 한 컬럼과 48px 보조 액션을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const cardRule =
      /\.offset-recommendation-card\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[\s\S]*?}/.test(
        css
      );
    const valueRule =
      /\.offset-recommendation-values\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        css
      );
    const actionRule =
      /\.offset-recommendation-card\s+\.secondary-button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        css
      );
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.offset-recommendation-card\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.offset-recommendation-values\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(cardRule, "recommendation card should align copy and action on wider screens");
    assert.ok(valueRule, "recommendation metrics should be easy to compare");
    assert.ok(actionRule, "recommendation action should keep a field touch target");
    assert.ok(mobileRule, "mobile recommendation card should avoid horizontal overflow");
  });
});
