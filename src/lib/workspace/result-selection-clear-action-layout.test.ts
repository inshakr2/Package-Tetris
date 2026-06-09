import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspaceSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const threeSource = readFileSync("src/components/result-stage/result-3d-canvas.client.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

describe("result-selection-clear-action-layout", () => {
  it("2D 결과 상태줄은 강조 중일 때 전체 보기 버튼을 제공한다", () => {
    const hasClearAction =
      workspaceSource.includes("selectedLegendItem ? (") &&
      workspaceSource.includes('className="secondary-button selection-clear-action"') &&
      workspaceSource.includes("onClick={clearSelectedBlockTemplate}") &&
      workspaceSource.includes("전체 보기");

    assert.equal(hasClearAction, true);
  });

  it("3D 결과 상태 영역은 강조 중일 때 전체 보기 버튼을 제공한다", () => {
    const hasThreeClearAction =
      threeSource.includes("selectedBlock ? (") &&
      threeSource.includes('className="secondary-button three-selection-clear-action"') &&
      threeSource.includes("onClick={onClearSelection}") &&
      threeSource.includes("전체 보기");

    assert.equal(hasThreeClearAction, true);
  });

  it("강조 해제 버튼은 현장 터치 타깃과 모바일 줄바꿈을 유지한다", () => {
    const hasSharedTouchTarget =
      /\.selection-clear-action,\s*\.three-selection-clear-action\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/
        .test(styles);
    const hasThreeActionLayout =
      /\.three-selection-actions\s*{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*flex-end;[\s\S]*?}/
        .test(styles);
    const hasMobileLayout =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.three-selection-actions\s*{[\s\S]*?justify-content:\s*stretch;[\s\S]*?}[\s\S]*?\.selection-clear-action,\s*\.three-selection-clear-action\s*{[\s\S]*?width:\s*100%;[\s\S]*?}/
        .test(styles);

    assert.equal(hasSharedTouchTarget && hasThreeActionLayout && hasMobileLayout, true);
  });
});
