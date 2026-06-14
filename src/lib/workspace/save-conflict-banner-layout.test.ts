import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("save-conflict-banner-layout", () => {
  it("저장 충돌 readonly pointer 차단 규칙에서 충돌 banner는 제외한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasReadonlyRuntimeContract =
      source.includes("data-readonly={isWorkspaceLocked}") &&
      source.includes('className="workspace-readonly-banner"') &&
      source.includes("saveConflictBannerCopy?.primaryLabel ?? \"최신본 불러오기\"") &&
      source.includes("saveConflictBannerCopy?.secondaryLabel ?? \"현재 화면 백업\"");
    const readonlyRule = css.match(
      /\.workspace-stack\[data-readonly="true"\][^{]+{[\s\S]*?pointer-events:\s*none;[\s\S]*?}/
    );

    // Then
    assert.ok(hasReadonlyRuntimeContract, "readonly conflict banner should keep reload and backup actions");
    assert.ok(readonlyRule, "readonly pointer-events selector should stay explicit");
    assert.ok(readonlyRule[0].includes(".workspace-readonly-banner"));
  });

  it("모바일에서는 banner를 한 컬럼으로 내려 CTA 가로 넘침을 줄인다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const mobileReadonlyRule = css.match(
      /@media\s*\(max-width:\s*1279px\)\s*{[\s\S]*?\.workspace-readonly-banner\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/
    );

    // Then
    assert.ok(mobileReadonlyRule, "readonly banner should become one column on tablet/mobile widths");
  });

  it("충돌 banner CTA는 현장 터치를 위해 48px 이상 높이를 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const actionButtonRule = css.match(
      /\.workspace-readonly-actions\s+\.primary-button,\s*\.workspace-readonly-actions\s+\.secondary-button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/
    );

    // Then
    assert.ok(actionButtonRule, "readonly banner action buttons should keep 48px touch targets");
  });
});
