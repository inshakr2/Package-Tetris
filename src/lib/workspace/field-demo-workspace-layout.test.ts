import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("field-demo-workspace-layout", () => {
  it("현재 작업 영역은 현장 시연 예제 버튼을 더 이상 노출하지 않는다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const removedDemoLoader = !source.includes(
      'import { loadFieldDemoCurrentWork } from "@/lib/workspace/field-demo-workspace";'
    );
    const removedDemoHandler =
      !source.includes("function loadFieldDemoCurrentWorkIntoDraft()") &&
      !source.includes("loadFieldDemoCurrentWork(current, now)");
    const removedDemoButton =
      !source.includes("onLoadFieldDemo") &&
      !source.includes('className="secondary-button current-work-demo-action"') &&
      !source.includes("시연 예제 불러오기");
    const removedLockedCopy = !source.includes("최신본을 불러온 뒤 시연 예제를 불러올 수 있습니다.");

    // Then
    assert.ok(removedDemoLoader, "workspace app should not import the demo current work loader");
    assert.ok(removedDemoHandler, "workspace app should not expose a demo loading handler");
    assert.ok(removedDemoButton, "current work panel should not expose a field demo action");
    assert.ok(removedLockedCopy, "removed demo action should not keep locked workspace copy");
  });

  it("현재 작업 액션은 남은 버튼만 모바일 48px 터치 타깃과 한 컬럼 배치를 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const actionGroupRule =
      /\.current-work-actions\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*auto\)\);[\s\S]*?}/.test(
        css
      );
    const currentWorkActionRule =
      /\.current-work-format-action,\s*[\s\S]*?\.current-work-import-action,\s*[\s\S]*?\.current-work-reset-action\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        css
      );
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.current-work-actions\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.current-work-format-action,\s*[\s\S]*?\.current-work-import-action,\s*[\s\S]*?\.current-work-reset-action\s*{[\s\S]*?width:\s*100%;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(actionGroupRule, "current work actions should be grouped without stretching copy");
    assert.ok(currentWorkActionRule, "remaining current work actions should keep the field touch target");
    assert.ok(mobileRule, "mobile should stack current work actions as full-width buttons");
  });
});
