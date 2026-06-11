import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const DEVELOPMENT_DELIVERABLES_PATH = join(process.cwd(), "docs/development-deliverables.md");
const NON_DEVELOPER_GUIDE_PATH = join(process.cwd(), "docs/non-developer-start-guide.md");

describe("development deliverables document", () => {
  it("개발 산출물 문서는 기술 스택, 구조, 검증, V1 범위를 추적 가능하게 정리한다", () => {
    // Given / When
    const exists = existsSync(DEVELOPMENT_DELIVERABLES_PATH);
    const document = exists ? readFileSync(DEVELOPMENT_DELIVERABLES_PATH, "utf8") : "";

    // Then
    assert.equal(exists, true);
    assert.match(document, /Next\.js 16\.2\.7/);
    assert.match(document, /React 19\.2\.7/);
    assert.match(document, /Three\.js 0\.184\.0/);
    assert.match(document, /TypeScript 6\.0\.3/);
    assert.match(document, /IndexedDB/);
    assert.match(document, /JSON 백업/);
    assert.match(document, /Web Worker/);
    assert.match(document, /Service Worker/);
    assert.match(document, /Node test runner/);
    assert.match(document, /npm run v1:verify/);
    assert.match(document, /src\/components\/tetris-workspace-app\.tsx/);
    assert.match(document, /src\/lib\/workspace\/packing-engine\.ts/);
    assert.match(document, /V1 제외 범위/);
    assert.doesNotMatch(document, /작업 지시서/);
    assert.doesNotMatch(document, /배치 상세/);
    assert.doesNotMatch(document, /쌓는 순서/);
  });

  it("비개발자 시작 가이드는 현장 시연 가이드와 Windows 자동 실행 가이드를 분리해서 안내한다", () => {
    // Given / When
    const exists = existsSync(NON_DEVELOPER_GUIDE_PATH);
    const document = exists ? readFileSync(NON_DEVELOPER_GUIDE_PATH, "utf8") : "";

    // Then
    assert.equal(exists, true);
    assert.match(document, /개발 지식이 없는 사용자/);
    assert.match(document, /docs\/field-demo-user-guide\.md/);
    assert.match(document, /docs\/windows-cmd-launch-guide\.md/);
    assert.match(document, /scripts\/windows-start-package-tetris\.cmd/);
    assert.doesNotMatch(document, /작업 지시서/);
  });
});
