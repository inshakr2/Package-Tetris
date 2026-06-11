import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROADMAP_PATH = join(process.cwd(), "docs/plans/2026-06-10-v2-field-feedback-roadmap.md");

describe("v2 roadmap document", () => {
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
});
