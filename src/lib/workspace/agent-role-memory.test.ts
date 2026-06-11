import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const agentDir = "docs/agents";

function readDoc(path: string) {
  return readFileSync(path, "utf8");
}

describe("agent role memory", () => {
  it("PM 루프에 필요한 통합 역할 메모리를 모두 보관한다", () => {
    // Given
    const expectedFiles = [
      "business-analyst.md",
      "ui-designer.md",
      "nextjs-developer.md",
      "product-manager.md",
      "code-reviewer.md",
      "ui-ux-tester.md"
    ];

    // When
    const existingFiles = expectedFiles.filter((fileName) => existsSync(`${agentDir}/${fileName}`));

    // Then
    assert.deepEqual(existingFiles, expectedFiles);
  });

  it("각 역할 메모리는 Package Tetris V1과 현장 작업자 기준을 공유한다", () => {
    // Given
    const roleFiles = [
      "business-analyst.md",
      "ui-designer.md",
      "nextjs-developer.md",
      "product-manager.md",
      "code-reviewer.md",
      "ui-ux-tester.md"
    ];

    // When
    const docs = roleFiles.map((fileName) => readDoc(`${agentDir}/${fileName}`));

    // Then
    for (const doc of docs) {
      assert.match(doc, /Package Tetris/);
      assert.match(doc, /V1/);
      assert.match(doc, /현장 작업자|현장 사용자|현장 기준/);
    }
  });

  it("product-manager 메모리는 증분 선정, 역할 검토, 검증, 커밋 푸시 흐름을 고정한다", () => {
    // Given
    const productManagerDoc = readDoc(`${agentDir}/product-manager.md`);

    // When / Then
    assert.match(productManagerDoc, /다음 증분/);
    assert.match(productManagerDoc, /business-analyst/);
    assert.match(productManagerDoc, /ui-ux-tester/);
    assert.match(productManagerDoc, /code-reviewer/);
    assert.match(productManagerDoc, /npm test/);
    assert.match(productManagerDoc, /커밋/);
    assert.match(productManagerDoc, /푸시/);
  });

  it("product-manager 메모리는 버튼과 기능 추가 전 UI 역할 협의를 강제한다", () => {
    // Given
    const productManagerDoc = readDoc(`${agentDir}/product-manager.md`);

    // When / Then
    assert.match(productManagerDoc, /단독으로 UI를 결정하지 않는다/);
    assert.match(productManagerDoc, /버튼|기능/);
    assert.match(productManagerDoc, /business-analyst/);
    assert.match(productManagerDoc, /ui-designer/);
    assert.match(productManagerDoc, /ui-ux-tester/);
    assert.match(productManagerDoc, /피드백을 반영/);
  });

  it("code-reviewer와 ui-ux-tester 메모리는 엔진 정합성과 화면 검증 기준을 나눠 가진다", () => {
    // Given
    const codeReviewerDoc = readDoc(`${agentDir}/code-reviewer.md`);
    const uiUxTesterDoc = readDoc(`${agentDir}/ui-ux-tester.md`);

    // When / Then
    assert.match(codeReviewerDoc, /공중에 떠 있는|지지/);
    assert.match(codeReviewerDoc, /경계|충돌/);
    assert.match(codeReviewerDoc, /회귀/);
    assert.match(uiUxTesterDoc, /360px/);
    assert.match(uiUxTesterDoc, /390px/);
    assert.match(uiUxTesterDoc, /768px/);
    assert.match(uiUxTesterDoc, /1280px/);
    assert.match(uiUxTesterDoc, /가로 넘침|horizontal overflow/);
    assert.match(uiUxTesterDoc, /실제 브라우저/);
    assert.match(uiUxTesterDoc, /좌표|bounding/);
    assert.match(uiUxTesterDoc, /삭제 버튼|CTA|버튼/);
  });

  it("기획서와 UI 메모리는 구현된 3D 크게 보기와 치수 오버레이를 후속으로 남기지 않는다", () => {
    // Given
    const planningDoc = readDoc("docs/tetris-ui-planning-draft.md");
    const uiDesignerDoc = readDoc(`${agentDir}/ui-designer.md`);

    // When / Then
    assert.doesNotMatch(planningDoc, /모바일 전체화면 3D 시트, 치수 오버레이/);
    assert.doesNotMatch(uiDesignerDoc, /전체화면 `크게 보기`는 후속 작업으로 둔다/);
    assert.match(planningDoc, /크게 보기/);
    assert.match(planningDoc, /치수 오버레이/);
  });
});
