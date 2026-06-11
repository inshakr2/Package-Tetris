import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const workspaceSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

describe("chain-simulation-requested-quantity-layout", () => {
  it("추가 박스 시뮬레이션은 선택 박스별로 최대/수량 지정 조건을 제공한다", () => {
    // Given
    const hasRequestedQuantityState =
      workspaceSource.includes("chainRequestedQuantitiesByTemplateId") &&
      workspaceSource.includes("setChainRequestedQuantitiesByTemplateId") &&
      workspaceSource.includes("changeChainTemplateQuantityLimit") &&
      workspaceSource.includes("createSelectedChainQuantityLimitMap");
    const hasRequestedQuantityInput =
      workspaceSource.includes('className="chain-template-quantity-list"') &&
      workspaceSource.includes('className="chain-template-quantity-row"') &&
      workspaceSource.includes("최대") &&
      workspaceSource.includes("수량 지정") &&
      workspaceSource.includes('aria-label={`${template.name} 지정 수량`}') &&
      workspaceSource.includes('inputMode="numeric"') &&
      workspaceSource.includes("개");
    const hasCalculationContract =
      workspaceSource.includes("requestedQuantitiesByTemplateId") &&
      workspaceSource.includes("runMultiChainSimulationV0({") &&
      workspaceSource.includes("지정 조건 기준 총");

    // When
    const hasRequestedQuantityUi = hasRequestedQuantityState && hasRequestedQuantityInput && hasCalculationContract;

    // Then
    assert.equal(hasRequestedQuantityUi, true);
  });

  it("박스별 수량 조건 컨트롤은 태블릿 이하에서 한 컬럼으로 접히고 터치 타깃을 유지한다", () => {
    // Given
    const hasBaseLayout =
      /\.chain-template-quantity-list\s*{[\s\S]*?display:\s*grid;[\s\S]*?}/.test(styles) &&
      /\.chain-template-quantity-row\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(120px,\s*150px\);[\s\S]*?}/.test(
        styles
      );
    const hasTouchTarget =
      /\.chain-quantity-field\s+input\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(styles) &&
      /\.chain-template-quantity-mode\s+button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(styles);
    const hasMobileLayout =
      /@media\s*\(max-width:\s*1279px\)\s*{[\s\S]*?\.chain-template-quantity-row\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        styles
      ) &&
      /@media\s*\(max-width:\s*1279px\)\s*{[\s\S]*?\.chain-template-quantity-mode\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?}/.test(
        styles
      );

    // When
    const hasResponsiveQuantityControl = hasBaseLayout && hasTouchTarget && hasMobileLayout;

    // Then
    assert.equal(hasResponsiveQuantityControl, true);
  });

  it("박스별 추가 조건을 바꾸면 이전 추가 결과 미리보기를 지우고 다시 계산하도록 안내한다", () => {
    // Given
    const hasQuantityChangeHandler =
      workspaceSource.includes("function changeChainTemplateQuantityLimit") &&
      workspaceSource.includes("clearChainPreviewState()") &&
      workspaceSource.includes("setSelectedBlockTemplateId(null)");
    const hasRecalculateCopy = workspaceSource.includes("추가 조건이 바뀌었습니다. 다시 계산하세요.");
    const handlerIsWired = workspaceSource.includes("onTemplateQuantityLimitChange={changeChainTemplateQuantityLimit}");

    // When
    const clearsStalePreviewAfterQuantityChange = hasQuantityChangeHandler && hasRecalculateCopy && handlerIsWired;

    // Then
    assert.equal(clearsStalePreviewAfterQuantityChange, true);
  });
});
