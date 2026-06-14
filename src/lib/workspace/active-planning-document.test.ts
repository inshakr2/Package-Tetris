import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ACTIVE_PLANNING_DOC_PATH = join(process.cwd(), "docs/tetris-ui-planning-draft.md");

describe("active planning document", () => {
  it("V2 활성 기획서는 파레트와 3D 강조 기준을 현행 계약으로 설명한다", () => {
    // Given
    const planningDoc = readFileSync(ACTIVE_PLANNING_DOC_PATH, "utf8");

    // When / Then
    assert.match(planningDoc, /V2 현장 피드백 기준이 우선/);
    assert.match(planningDoc, /기본 파레트[\s\S]*1100 x 1100 x 1550mm/);
    assert.match(planningDoc, /오버행 파레트[\s\S]*1150 x 1150 x 1550mm/);
    assert.match(planningDoc, /V2 현장 acceptance 폭[\s\S]*360px[\s\S]*390px[\s\S]*768px[\s\S]*1280px/);
    assert.match(planningDoc, /3D 캔버스 클릭은 박스 유형 강조 상태를 바꾸지 않고/);
    assert.match(planningDoc, /강조 상태는 범례와 2D 보기에서 제어/);
    assert.doesNotMatch(planningDoc, /팔레트 기본값은 요구사항의 `1150 x 1150 x 1550mm`를 유지한다/);
    assert.doesNotMatch(planningDoc, /표준 파레트 preset은 후속 확장 항목/);
    assert.doesNotMatch(planningDoc, /3D 박스 클릭과 범례 선택은 같은 박스 유형 강조 상태를 공유한다/);
  });
});
