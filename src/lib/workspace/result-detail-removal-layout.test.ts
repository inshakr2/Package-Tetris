import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const WORKSPACE_APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const ACTIVE_PLANNING_DOC_PATH = join(process.cwd(), "docs/tetris-ui-planning-draft.md");
const PLANS_DIR = join(process.cwd(), "docs/plans");

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
    assert.match(planningDoc, /3D와 공간 확인/);
    assert.match(planningDoc, /방향 표시/);
  });

  it("V1 결과 상세와 지시서 관련 과거 계획서는 V2 기준 배너를 먼저 보여준다", () => {
    // Given
    const legacyTerms = /배치상세|배치 상세|쌓는순서|쌓는 순서|작업지시서|작업 지시서|작업 순서|지시서/;
    const planFiles = readdirSync(PLANS_DIR)
      .filter((fileName) => fileName.startsWith("2026-06-09-") && fileName.endsWith(".md"))
      .map((fileName) => join(PLANS_DIR, fileName));

    // When
    const filesWithLegacyTerms = planFiles.filter((filePath) =>
      legacyTerms.test(readFileSync(filePath, "utf8"))
    );
    const filesMissingBanner = filesWithLegacyTerms.filter((filePath) => {
      const document = readFileSync(filePath, "utf8");
      return !/V2 기준: 이 문서는 2026-06-09 V1 구현 이력입니다/.test(document);
    });

    // Then
    assert.equal(filesMissingBanner.length, 0);
  });
});
