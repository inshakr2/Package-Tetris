import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("field-demo-workspace-layout", () => {
  it("현재 작업 영역은 현장 시연 예제를 바로 불러오는 버튼을 제공한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const importsDemoLoader = source.includes(
      'import { loadFieldDemoCurrentWork } from "@/lib/workspace/field-demo-workspace";'
    );
    const hasDemoHandler =
      source.includes("function loadFieldDemoCurrentWorkIntoDraft()") &&
      source.includes("loadFieldDemoCurrentWork(current, now)");
    const hasDemoButton =
      source.includes("onLoadFieldDemo") &&
      source.includes('className="secondary-button current-work-demo-action"') &&
      source.includes("시연 예제 불러오기");
    const hasLockedCopy = source.includes("최신본을 불러온 뒤 시연 예제를 불러올 수 있습니다.");

    // Then
    assert.ok(importsDemoLoader, "workspace app should import the demo current work loader");
    assert.ok(hasDemoHandler, "workspace app should expose a demo loading handler");
    assert.ok(hasDemoButton, "current work panel should expose a field demo action");
    assert.ok(hasLockedCopy, "demo action should explain locked workspace state");
  });

  it("현장 시연 예제 버튼은 모바일에서 48px 터치 타깃과 한 컬럼 배치를 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const actionGroupRule =
      /\.current-work-actions\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*auto\)\);[\s\S]*?}/.test(
        css
      );
    const demoActionRule =
      /\.current-work-demo-action,\s*[\s\S]*?\.current-work-reset-action\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        css
      );
    const mobileRule =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.current-work-actions\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}[\s\S]*?\.current-work-demo-action,\s*[\s\S]*?\.current-work-reset-action\s*{[\s\S]*?width:\s*100%;[\s\S]*?}/.test(
        css
      );

    // Then
    assert.ok(actionGroupRule, "demo and reset actions should be grouped without stretching copy");
    assert.ok(demoActionRule, "demo action should keep the same field touch target as reset");
    assert.ok(mobileRule, "mobile should stack current work actions as full-width buttons");
  });
});
