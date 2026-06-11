import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const ACTIVE_PLANNING_DOC_PATH = join(process.cwd(), "docs/tetris-ui-planning-draft.md");

describe("result-detail-removal-layout", () => {
  it("V2 결과 화면은 배치 상세와 쌓는 순서 모달 액션을 노출하지 않는다", () => {
    // Given
    const source = readFileSync(WORKSPACE_APP_PATH, "utf8");

    // When / Then
    assert.doesNotMatch(source, /className="result-inspection-actions"/);
    assert.doesNotMatch(source, /openResultInspectionDialog\("placement"/);
    assert.doesNotMatch(source, /openResultInspectionDialog\("stacking"/);
    assert.doesNotMatch(source, /function ResultInspectionDialog/);
    assert.doesNotMatch(source, /function PlacementDetailContent/);
    assert.doesNotMatch(source, /function StackingOrderContent/);
    assert.doesNotMatch(source, /배치 상세/);
    assert.doesNotMatch(source, /쌓는 순서/);
    assert.doesNotMatch(source, /작업 지시서/);
  });

  it("V2 활성 기획서는 결과 상세 테이블 흐름 대신 3D 확인 중심으로 설명한다", () => {
    // Given
    const planningDoc = readFileSync(ACTIVE_PLANNING_DOC_PATH, "utf8");

    // When / Then
    assert.doesNotMatch(planningDoc, /배치 테이블/);
    assert.doesNotMatch(planningDoc, /배치상세/);
    assert.doesNotMatch(planningDoc, /쌓는순서/);
    assert.match(planningDoc, /방향 표시/);
  });
});
