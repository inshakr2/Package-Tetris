import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROADMAP_PATH = join(process.cwd(), "docs/plans/2026-06-10-v2-field-feedback-roadmap.md");

describe("v2 roadmap document", () => {
  it("브랜치 운영 기준은 main을 검증된 시연 기준, v2를 다음 개발 기준으로 안내한다", () => {
    // Given
    const roadmap = readFileSync(ROADMAP_PATH, "utf8");

    // When / Then
    assert.match(roadmap, /`main`은 검증된 현장 시연 기준/);
    assert.match(roadmap, /`v2`는 다음 현장 피드백 개발 기준/);
    assert.match(roadmap, /검증이 끝난 변경만 원격 `v2`에 push/);
    assert.match(roadmap, /통합 검증을 통과한 변경만 `main`으로 병합/);
    assert.doesNotMatch(roadmap, /V1은 현장 테스트용 안정 버전으로 동결/);
    assert.doesNotMatch(roadmap, /V1은 현장 작업자가 `main` 브랜치 기준으로 테스트하는 버전/);
    assert.doesNotMatch(roadmap, /`main`은 현장 테스트 안정 브랜치로 유지/);
  });

  it("Phase 7 추가박스 시뮬레이션은 선택 순서 기반 우선순위 UI를 최신 기준으로 안내한다", () => {
    // Given
    const roadmap = readFileSync(ROADMAP_PATH, "utf8");

    // When / Then
    assert.match(roadmap, /선택 순서가 추가 우선순위/);
    assert.match(roadmap, /드래그하거나 위\/아래 버튼/);
    assert.match(roadmap, /선택 순서 결과/);
    assert.doesNotMatch(roadmap, /`기본` \/ `먼저 추가` \/ `최우선 추가`/);
    assert.doesNotMatch(roadmap, /지정 우선 결과/);
  });

  it("Open Risks는 구현 완료된 V2 결정을 재논의 상태로 남기지 않는다", () => {
    // Given
    const roadmap = readFileSync(ROADMAP_PATH, "utf8");

    // When / Then
    assert.match(roadmap, /9\.2 `\.xlsx` Library Decision/);
    assert.match(roadmap, /read-excel-file@9\.1\.1/);
    assert.match(roadmap, /9\.3 Partial Support Area Decision/);
    assert.match(roadmap, /2D rectangle union-area/);
    assert.match(roadmap, /9\.4 Additional Simulation Optimization Decision/);
    assert.match(roadmap, /bounded priority permutations/);
    assert.doesNotMatch(roadmap, /Decision needed during Phase 4/);
    assert.doesNotMatch(roadmap, /Decision needed during Phase 5/);
    assert.doesNotMatch(roadmap, /Decision needed during Phase 7/);
  });

  it("현재 작업 엑셀 import는 저장된 박스명을 기준으로만 작업 물량을 추가한다고 안내한다", () => {
    // Given
    const roadmap = readFileSync(ROADMAP_PATH, "utf8");

    // When / Then
    assert.match(roadmap, /현재 작업 물량 컬럼을 확정한다: `박스명`, `작업수량`, `아래층우선타입` 3개 컬럼만 받는다/);
    assert.match(roadmap, /저장된 박스명과 정확히 일치하는 행만 현재 작업에 추가/);
    assert.match(roadmap, /없는 박스명은 오류 행으로 안내/);
    assert.doesNotMatch(roadmap, /저장 박스에 없는 현재 작업 import 행은 저장 박스 템플릿을 만들고 바로 현재 작업에 추가한다/);
  });
});
