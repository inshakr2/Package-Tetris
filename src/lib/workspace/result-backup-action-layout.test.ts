import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");
const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");

describe("result-backup-action-layout", () => {
  it("결과 영역은 최신 백업이 필요할 때 결과 요약 근처에 백업 CTA를 표시한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasNeedsExportProp =
      source.includes("needsExport={needsExport}") &&
      source.includes("needsExport: boolean;");
    const hasResultScopedCallout =
      source.includes("latestResult && needsExport") &&
      source.includes('className="result-backup-callout"') &&
      source.includes("결과를 다른 기기로 옮기거나 복구하려면 백업 파일을 만들어 두세요.");

    // Then
    assert.ok(hasNeedsExportProp, "ResultStage should receive the existing export reminder state");
    assert.ok(hasResultScopedCallout, "result backup CTA should only appear when a result needs backup");
  });

  it("결과 백업 CTA는 기존 백업 파일 만들기 흐름을 재사용한다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When
    const hasBackupButton =
      source.includes('className="primary-button result-backup-action"') &&
      source.includes("onClick={onExportJson}") &&
      source.includes("백업 파일 만들기");

    // Then
    assert.ok(hasBackupButton, "result backup button should call the existing JSON export action");
  });

  it("모바일 결과 백업 CTA는 한 컬럼과 48px 터치 타깃을 유지한다", () => {
    // Given
    const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

    // When
    const calloutRule = css.match(
      /\.result-backup-callout\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[\s\S]*?}/
    );
    const actionRule = css.match(
      /\.result-backup-action\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/
    );
    const mobileRule = css.match(
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.result-backup-callout\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/
    );

    // Then
    assert.ok(calloutRule, "backup callout should align copy and action on wider screens");
    assert.ok(actionRule, "backup action should keep a field-friendly touch target");
    assert.ok(mobileRule, "mobile backup callout should stack to avoid horizontal overflow");
  });
});
