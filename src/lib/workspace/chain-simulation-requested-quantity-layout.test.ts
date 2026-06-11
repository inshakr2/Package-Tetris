import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const workspaceSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

describe("chain-simulation-requested-quantity-layout", () => {
  it("추가 박스 시뮬레이션은 현장 사용자가 원하는 수량만 계산할 수 있는 입력과 버튼을 제공한다", () => {
    // Given
    const hasRequestedQuantityState =
      workspaceSource.includes("chainRequestedQuantity") &&
      workspaceSource.includes("setChainRequestedQuantity") &&
      workspaceSource.includes("calculateRequestedChainPreview");
    const hasRequestedQuantityInput =
      workspaceSource.includes('className="chain-quantity-control"') &&
      workspaceSource.includes('aria-label="추가할 수량"') &&
      workspaceSource.includes('inputMode="numeric"') &&
      workspaceSource.includes("개");
    const hasRequestedCalculateButton =
      workspaceSource.includes("지정 수량 계산") &&
      workspaceSource.includes("onCalculateRequested");

    // When
    const hasRequestedQuantityUi = hasRequestedQuantityState && hasRequestedQuantityInput && hasRequestedCalculateButton;

    // Then
    assert.equal(hasRequestedQuantityUi, true);
  });

  it("수량 직접 지정 컨트롤은 태블릿 이하에서 한 컬럼으로 접히고 터치 타깃을 유지한다", () => {
    // Given
    const hasBaseLayout =
      /\.chain-quantity-control\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[\s\S]*?}/.test(
        styles
      );
    const hasTouchTarget =
      /\.chain-quantity-control\s+input\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(styles) &&
      /\.chain-quantity-control\s+button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(styles);
    const hasMobileLayout =
      /@media\s*\(max-width:\s*1279px\)\s*{[\s\S]*?\.chain-quantity-control\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        styles
      );

    // When
    const hasResponsiveQuantityControl = hasBaseLayout && hasTouchTarget && hasMobileLayout;

    // Then
    assert.equal(hasResponsiveQuantityControl, true);
  });

  it("요청 수량을 바꾸면 이전 추가 결과 미리보기를 지우고 다시 계산하도록 안내한다", () => {
    // Given
    const hasQuantityChangeHandler =
      workspaceSource.includes("function changeChainRequestedQuantity") &&
      workspaceSource.includes("clearChainPreviewState()") &&
      workspaceSource.includes("setSelectedBlockTemplateId(null)");
    const hasRecalculateCopy = workspaceSource.includes("수량이 바뀌었습니다. 다시 계산하세요.");
    const handlerIsWired = workspaceSource.includes("onRequestedQuantityChange={changeChainRequestedQuantity}");

    // When
    const clearsStalePreviewAfterQuantityChange = hasQuantityChangeHandler && hasRecalculateCopy && handlerIsWired;

    // Then
    assert.equal(clearsStalePreviewAfterQuantityChange, true);
  });
});
