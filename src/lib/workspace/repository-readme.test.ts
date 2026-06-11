import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const README_PATH = join(process.cwd(), "README.md");

describe("repository README", () => {
  it("프로젝트 소개와 목적별 문서 허브를 제공하고 직접 실행 매뉴얼은 분리한다", () => {
    // Given / When
    const readmeExists = existsSync(README_PATH);
    const readme = readmeExists ? readFileSync(README_PATH, "utf8") : "";

    // Then
    assert.equal(readmeExists, true);
    assert.match(readme, /Package Tetris/);
    assert.match(readme, /프론트엔드 단독 적재 시뮬레이션 도구/);
    assert.match(readme, /main.*검증된 현장 시연 기준/);
    assert.match(readme, /v2.*다음 현장 피드백 개발 브랜치/);
    assert.match(readme, /적재 공간/);
    assert.match(readme, /3D/);
    assert.match(readme, /docs\/non-developer-start-guide\.md/);
    assert.match(readme, /docs\/development-deliverables\.md/);
    assert.match(readme, /docs\/v1-readiness\.md/);
    assert.match(readme, /docs\/plans\/2026-06-10-v2-field-feedback-roadmap\.md/);
    assert.match(readme, /https:\/\/github\.com\/inshakr2\/Package-Tetris/);
    assert.doesNotMatch(readme, /main`은 V1 현장 테스트 안정 브랜치/);
    assert.doesNotMatch(readme, /main`은 현장 작업자가 테스트 중인 V1 안정 기준/);
    assert.doesNotMatch(readme, /프론트엔드 단독 V1 도구/);
    assert.doesNotMatch(readme, /작업 지시서/);
    assert.doesNotMatch(readme, /배치 상세/);
    assert.doesNotMatch(readme, /쌓는 순서/);
    assert.doesNotMatch(readme, /npm install/);
    assert.doesNotMatch(readme, /npm run dev/);
  });
});
