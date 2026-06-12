import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const V2_VERIFICATION_REPORT_PATH = join(
  process.cwd(),
  "docs/verification/2026-06-13-v2-field-patch-verification.md"
);

describe("v2 verification report document", () => {
  it("V2 현장 패치 검증 리포트는 자동 검증과 대표 현장 케이스를 추적 가능하게 남긴다", () => {
    // Given / When
    const exists = existsSync(V2_VERIFICATION_REPORT_PATH);
    const document = exists ? readFileSync(V2_VERIFICATION_REPORT_PATH, "utf8") : "";

    // Then
    assert.equal(exists, true);
    assert.match(document, /Package Tetris V2 현장 패치 검증 리포트/);
    assert.match(document, /브랜치[\s\S]*`v2`/);
    assert.match(document, /커밋[\s\S]*`1418a37`/);
    assert.match(document, /npm test[\s\S]*431개 테스트[\s\S]*통과/);
    assert.match(document, /npx tsc --noEmit[\s\S]*통과/);
    assert.match(document, /npm run field:audit[\s\S]*Package Tetris 현장 audit 통과/);
    assert.match(document, /npm run build[\s\S]*Compiled successfully/);
    assert.match(document, /현장 바람개비 적재 검증 - 기본 8개[\s\S]*1공간[\s\S]*적재 8개[\s\S]*미적재 0개/);
    assert.match(document, /현장 바람개비 적재 검증 - 치수 순서 변형/);
    assert.match(document, /현장 바람개비 적재 검증 - 9개 경계/);
    assert.match(document, /현장 바람개비 적재 검증 - 주변 치수/);
    assert.match(document, /현장 바람개비 적재 검증 - 혼합 추가 시뮬레이션 결과/);
    assert.match(document, /결과 최대치수[\s\S]*가로\/세로\/높이/);
    assert.doesNotMatch(document, /가로\/깊이\/높이/);
    assert.doesNotMatch(document, /작업 지시서/);
    assert.doesNotMatch(document, /배치 상세/);
    assert.doesNotMatch(document, /쌓는 순서/);
  });
});
