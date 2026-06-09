import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const workspaceSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const cssSource = readFileSync("src/app/globals.css", "utf8");

describe("import-conflict-panel-layout", () => {
  it("백업 가져오기 충돌 패널은 copy helper와 현장 버튼 문구를 사용한다", () => {
    // Given / When
    const hasCopyContract =
      workspaceSource.includes("getImportConflictCopy") &&
      workspaceSource.includes("const importConflictCopy = getImportConflictCopy(pendingImport.conflict)") &&
      workspaceSource.includes("{importConflictCopy.title}") &&
      workspaceSource.includes("{importConflictCopy.description}") &&
      workspaceSource.includes("{importConflictCopy.actionLabels.replace}") &&
      !workspaceSource.includes("충돌 유형: {pendingImport.conflict.kind}");

    // Then
    assert.equal(hasCopyContract, true);
  });

  it("백업 가져오기 충돌 버튼은 모바일에서 한 줄 폭을 넘기지 않는 큰 터치 타깃이다", () => {
    // Given / When
    const hasMobileSafeLayout =
      workspaceSource.includes('className="form-actions import-conflict-actions"') &&
      /\.import-conflict-actions\s+\.primary-button,\s*\.import-conflict-actions\s+\.secondary-button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        cssSource
      ) &&
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.import-conflict-actions\s+\.primary-button,\s*\.import-conflict-actions\s+\.secondary-button\s*{[\s\S]*?width:\s*100%;[\s\S]*?}/.test(
        cssSource
      );

    // Then
    assert.equal(hasMobileSafeLayout, true);
  });
});
