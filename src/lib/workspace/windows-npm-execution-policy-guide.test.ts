import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const FIELD_GUIDE_PATH = join(process.cwd(), "docs/field-demo-user-guide.md");
const README_PATH = join(process.cwd(), "README.md");

describe("windows npm execution policy guide", () => {
  it("현장 가이드는 PowerShell npm.ps1 차단 오류와 안전한 조치 명령을 안내한다", () => {
    // Given
    const fieldGuide = readFileSync(FIELD_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(fieldGuide, /npm\.ps1/);
    assert.match(fieldGuide, /Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser/);
    assert.match(fieldGuide, /Get-ExecutionPolicy -List/);
    assert.match(fieldGuide, /npm\.cmd install/);
    assert.match(fieldGuide, /about_Execution_Policies/);
  });

  it("README 빠른 실행은 Windows PowerShell npm 차단 오류를 현장 가이드로 연결한다", () => {
    // Given
    const readme = readFileSync(README_PATH, "utf8");

    // When / Then
    assert.match(readme, /npm\.ps1/);
    assert.match(readme, /docs\/field-demo-user-guide\.md/);
  });
});
