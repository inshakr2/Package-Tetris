import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const V2_VERIFICATION_REPORT_PATH = join(
  process.cwd(),
  "docs/verification/2026-06-13-v2-field-patch-verification.md"
);
const V2_VERIFICATION_METADATA_PATH = join(
  process.cwd(),
  "docs/verification/2026-06-13-v2-field-patch-verification.meta.json"
);

interface V2VerificationMetadata {
  verifiedImplementationCommit: string;
  npmTestPassCount: number;
}

describe("v2 verification report document", () => {
  it("V2 현장 패치 검증 리포트는 자동 검증과 대표 현장 케이스를 추적 가능하게 남긴다", () => {
    // Given / When
    const exists = existsSync(V2_VERIFICATION_REPORT_PATH);
    const metadataExists = existsSync(V2_VERIFICATION_METADATA_PATH);
    const document = exists ? readFileSync(V2_VERIFICATION_REPORT_PATH, "utf8") : "";
    const metadata = metadataExists
      ? (JSON.parse(readFileSync(V2_VERIFICATION_METADATA_PATH, "utf8")) as V2VerificationMetadata)
      : null;

    // Then
    assert.equal(exists, true);
    assert.equal(metadataExists, true);
    assert.ok(metadata);
    assert.match(metadata.verifiedImplementationCommit, /^[0-9a-f]{7,40}$/);
    assert.equal(metadata.verifiedImplementationCommit, "10c1f31");
    assert.equal(gitCommandSucceeds(["cat-file", "-e", `${metadata.verifiedImplementationCommit}^{commit}`]), true);
    assert.equal(gitCommandSucceeds(["merge-base", "--is-ancestor", metadata.verifiedImplementationCommit, "HEAD"]), true);
    assert.equal(Number.isInteger(metadata.npmTestPassCount), true);
    assert.ok(metadata.npmTestPassCount > 0);
    assert.equal(metadata.npmTestPassCount, 442);
    assert.match(document, /Package Tetris V2 현장 패치 검증 리포트/);
    assert.match(document, /브랜치[\s\S]*`v2`/);
    assert.match(
      document,
      new RegExp(`제품 구현 검증 기준 커밋[\\s\\S]*\`${metadata.verifiedImplementationCommit}\``)
    );
    assert.match(document, /런타임 UI[\s\S]*적재 엔진[\s\S]*저장\/백업 동작 변경은 포함하지 않는다/);
    assert.match(document, /보증하는 대상[\s\S]*verified implementation commit[\s\S]*검증 결과/);
    assert.match(document, /수동 브라우저 검증 생략[\s\S]*문서\/테스트\/검증 스크립트만 변경된 경우에만 허용/);
    assert.doesNotMatch(document, /기준 커밋:\s*`1418a37`/);
    assert.doesNotMatch(document, /431개 테스트/);
    assert.doesNotMatch(document, /439개 테스트/);
    assert.match(document, new RegExp(`npm test[\\s\\S]*${metadata.npmTestPassCount}개 테스트[\\s\\S]*통과`));
    assert.match(document, /최신 HEAD를 자동 보증하지 않는다/);
    assert.match(document, /npx next typegen[\s\S]*통과/);
    assert.match(document, /npx tsc --noEmit[\s\S]*통과/);
    assert.match(document, /npm run field:audit[\s\S]*Package Tetris 현장 audit 통과/);
    assert.match(document, /npm run build[\s\S]*Compiled successfully/);
    assert.match(document, /다음 사이클 체크리스트[\s\S]*npx next typegen/);
    assert.match(document, /다음 사이클 체크리스트[\s\S]*npx tsc --noEmit/);
    assert.match(document, /다음 사이클 체크리스트[\s\S]*npm run build/);
    assert.match(document, /다음 사이클 체크리스트[\s\S]*git diff --check/);
    assert.match(document, /다음 사이클 체크리스트[\s\S]*문서\/테스트\/검증 스크립트만 변경/);
    assert.match(document, /다음 사이클 체크리스트[\s\S]*수동 브라우저 검증 생략은 문서\/테스트\/검증 스크립트만 변경된 경우에만 허용/);
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

function gitCommandSucceeds(args: string[]) {
  try {
    execFileSync("git", args, { cwd: process.cwd(), stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
