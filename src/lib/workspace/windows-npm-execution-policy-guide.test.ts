import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const FIELD_GUIDE_PATH = join(process.cwd(), "docs/field-demo-user-guide.md");
const NON_DEVELOPER_GUIDE_PATH = join(process.cwd(), "docs/non-developer-start-guide.md");
const WINDOWS_CMD_GUIDE_PATH = join(process.cwd(), "docs/windows-cmd-launch-guide.md");
const WINDOWS_CMD_SCRIPT_PATH = join(process.cwd(), "scripts/windows-start-package-tetris.cmd");

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

  it("비개발자 시작 가이드는 Windows 자동 실행 가이드로 연결된다", () => {
    // Given
    const nonDeveloperGuide = readFileSync(NON_DEVELOPER_GUIDE_PATH, "utf8");

    // When / Then
    assert.match(nonDeveloperGuide, /\[field-demo-user-guide\.md]\(field-demo-user-guide\.md\)/);
    assert.match(nonDeveloperGuide, /\[windows-cmd-launch-guide\.md]\(windows-cmd-launch-guide\.md\)/);
    assert.doesNotMatch(nonDeveloperGuide, /\]\(docs\//);
  });

  it("Windows CMD 가이드는 exe가 아니라 cmd 파일로 자동 실행하도록 안내한다", () => {
    // Given
    const windowsGuide = readFileSync(WINDOWS_CMD_GUIDE_PATH, "utf8");
    const cmdScript = readFileSync(WINDOWS_CMD_SCRIPT_PATH, "utf8");

    // When / Then
    assert.match(windowsGuide, /windows-start-package-tetris\.cmd/);
    assert.match(windowsGuide, /\.cmd/);
    assert.match(windowsGuide, /npm\.cmd/);
    assert.match(windowsGuide, /실행 파일처럼 보이더라도 \.exe로 저장하지 않는다/);
    assert.match(cmdScript, /cd \/d "%~dp0\\\.\."/);
    assert.match(cmdScript, /npm\.cmd install/);
    assert.match(cmdScript, /npm\.cmd run field:audit/);
    assert.match(cmdScript, /npm\.cmd run dev/);
  });
});
