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
    const importsRecommendation =
      source.includes("createOffsetAdjustmentRecommendation") &&
      source.includes("type ResultSpaceAdjustmentRecommendation");
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
      source.includes("안전 여유를 조정하면") &&
      source.includes("공간을 더 적게 쓸 가능성이 있습니다.");
    const hasPreviewAction =
      source.includes('className="offset-recommendation-actions"') &&
      source.includes("openOffsetPreviewDialog") &&
      source.includes('aria-controls="offset-preview-dialog"') &&
      source.includes("추천 미리보기") &&
      source.includes("OffsetRecommendationPreviewDialog");

    // Then
    assert.ok(importsRecommendation, "ResultStage should import the offset recommendation helper");
    assert.ok(hasRecommendationState, "ResultStage should calculate recommendations asynchronously");
    assert.ok(hasRecommendationCard, "result area should render a field-language recommendation card");
    assert.ok(hasPreviewAction, "recommendation card should expose a preview dialog action");
  });

  it("결과 화면은 기본 파레트 결과에서 오버행 파레트 검토 추천을 계산하고 현장 문구로 표시한다", () => {
    // Given
    const source = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");

    // When
    const importsOverhangRecommendation =
      source.includes("createOverhangPalletRecommendation") &&
      source.includes("type ResultSpaceAdjustmentRecommendation");
    const calculatesOverhangRecommendation =
      source.includes("const overhangRecommendation = await createOverhangPalletRecommendation") &&
      source.includes("unloadedBlockCount: latestResult.unloadedBlockCount");
    const hasFieldCopy =
      source.includes("오버행 파레트 검토") &&
      source.includes("자동으로 바꾸지 않습니다") &&
      source.includes("현장 책임자 확인 후 오버행 파레트를 선택해 다시 계산하세요");

    // Then
    assert.ok(importsOverhangRecommendation, "ResultStage should import the overhang recommendation helper");
    assert.ok(calculatesOverhangRecommendation, "ResultStage should calculate overhang recommendations");
    assert.ok(hasFieldCopy, "overhang recommendation should use field review wording");
  });

  it("추천 미리보기 dialog는 실제 설정을 바꾸지 않는 3D 미리보기로 구성된다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasPreviewDialog =
      source.includes('id="offset-preview-dialog"') &&
      source.includes('className="offset-preview-dialog"') &&
      source.includes("추천 적용 미리보기") &&
      source.includes("실제 공간 설정은 아직 바뀌지 않았습니다.") &&
      source.includes("추천값 기준 3D 보기") &&
      source.includes("Result3DCanvas") &&
      source.includes("previewSpaces");

    // Then
    assert.ok(hasPreviewDialog, "preview dialog should show a non-mutating 3D recommendation preview");
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
      /\.offset-recommendation-actions\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*8px;[\s\S]*?}/.test(
        css
      ) &&
      /\.offset-recommendation-card\s+\.secondary-button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        css
      );
    const dialogRule =
      /\.offset-preview-dialog\s*{[\s\S]*?width:\s*min\(1040px,\s*calc\(100vw\s*-\s*24px\)\);[\s\S]*?max-height:\s*calc\(100dvh\s*-\s*24px\);[\s\S]*?}/.test(
        css
      ) &&
      /\.offset-preview-dialog-body\s+\.result-three-shell\s*{[\s\S]*?height:\s*100%;[\s\S]*?}/.test(css);
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.offset-recommendation-card\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.offset-recommendation-values\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.offset-preview-dialog\s*{[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100dvh;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(cardRule, "recommendation card should align copy and action on wider screens");
    assert.ok(valueRule, "recommendation metrics should be easy to compare");
    assert.ok(actionRule, "recommendation action should keep a field touch target");
    assert.ok(dialogRule, "preview dialog should fit inside the viewport and give 3D enough space");
    assert.ok(mobileRule, "mobile recommendation card should avoid horizontal overflow");
  });
});
