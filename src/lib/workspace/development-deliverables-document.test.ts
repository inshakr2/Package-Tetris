import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const DEVELOPMENT_DELIVERABLES_PATH = join(process.cwd(), "docs/development-deliverables.md");
const NON_DEVELOPER_GUIDE_PATH = join(process.cwd(), "docs/non-developer-start-guide.md");

describe("development deliverables document", () => {
  it("개발 산출물 문서는 기술 스택, 구조, 검증, V2 현재 범위를 추적 가능하게 정리한다", () => {
    // Given / When
    const exists = existsSync(DEVELOPMENT_DELIVERABLES_PATH);
    const document = exists ? readFileSync(DEVELOPMENT_DELIVERABLES_PATH, "utf8") : "";

    // Then
    assert.equal(exists, true);
    assert.match(document, /V2 현재 산출물/);
    assert.match(document, /현장 피드백 기반 V2/);
    assert.match(document, /Next\.js 16\.2\.7/);
    assert.match(document, /React 19\.2\.7/);
    assert.match(document, /Three\.js 0\.184\.0/);
    assert.match(document, /TypeScript 6\.0\.3/);
    assert.match(document, /read-excel-file 9\.1\.1/);
    assert.match(document, /IndexedDB/);
    assert.match(document, /JSON 백업/);
    assert.match(document, /Web Worker/);
    assert.match(document, /Service Worker/);
    assert.match(document, /개발 모드[\s\S]*서비스워커[\s\S]*자동 새로고침/);
    assert.match(document, /src\/components\/pwa-service-worker-registrar\.tsx[\s\S]*개발 모드[\s\S]*정리/);
    assert.match(document, /Node test runner/);
    assert.match(document, /기본 파레트/);
    assert.match(document, /오버행 파레트/);
    assert.match(document, /부분 지지 허용/);
    assert.match(document, /\.xlsx 일괄등록/);
    assert.match(document, /컬럼명 기준으로 값을 읽어 열 순서가 바뀌어도 동작/);
    assert.match(document, /중복 행은 오류가 아니라 합산 미리보기/);
    assert.match(document, /적재위치타입이 다르면 기존 설정 유지 경고/);
    assert.match(document, /선택 순서 기반 우선순위/);
    assert.match(document, /부분 지지 허용 55% 현장 검증/);
    assert.match(document, /오버행 파레트 추천 현장 검증/);
    assert.match(document, /저장 박스 엑셀 일괄등록 현장 검증/);
    assert.match(document, /현재 작업 엑셀 등록 현장 검증/);
    assert.match(document, /추가 박스 시뮬레이션 현장 검증/);
    assert.match(document, /현장 바람개비 적재 검증 - 혼합 추가 시뮬레이션 결과/);
    assert.match(document, /npm run v1:verify/);
    assert.match(document, /npm run v2:verify/);
    assert.match(document, /src\/components\/tetris-workspace-app\.tsx/);
    assert.match(document, /src\/lib\/workspace\/packing-engine\.ts/);
    assert.match(document, /V2 현재 제외 범위/);
    assert.doesNotMatch(document, /V1 개발 과정/);
    assert.doesNotMatch(document, /Package Tetris V1은/);
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
