import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const SELECTED_SPACE_SUMMARY_PATH = join(process.cwd(), "src/components/workspace/selected-space-summary.tsx");
const DIMENSION_FORMAT_PATH = join(process.cwd(), "src/lib/workspace/dimension-format.ts");
const PLAN_PATH = join(process.cwd(), "docs/plans/2026-06-16-v3-workspace-shell-extraction.md");

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("V3 workspace shell extraction", () => {
  it("선택된 공간 요약을 워크스페이스 leaf 컴포넌트로 분리한다", () => {
    // Given
    const appSource = read(APP_PATH);
    const selectedSpaceSummarySource = read(SELECTED_SPACE_SUMMARY_PATH);

    // When / Then
    assert.equal(existsSync(SELECTED_SPACE_SUMMARY_PATH), true);
    assert.match(appSource, /@\/components\/workspace\/selected-space-summary/);
    assert.doesNotMatch(appSource, /function SelectedSpaceSummary/);
    assert.match(selectedSpaceSummarySource, /export function SelectedSpaceSummary/);
    assert.match(selectedSpaceSummarySource, /aria-live="polite"/);
  });

  it("치수 표시 포맷을 공통 유틸로 관리한다", () => {
    // Given
    const appSource = read(APP_PATH);
    const formatSource = read(DIMENSION_FORMAT_PATH);

    // When / Then
    assert.equal(existsSync(DIMENSION_FORMAT_PATH), true);
    assert.match(appSource, /@\/lib\/workspace\/dimension-format/);
    assert.doesNotMatch(appSource, /function formatDimensions/);
    assert.match(formatSource, /export function formatDimensions/);
    assert.match(formatSource, /입력 확인 필요/);
  });

  it("V3 구조 분해 계획은 문서와 실제 구현 범위를 함께 고정한다", () => {
    // Given
    const plan = read(PLAN_PATH);

    // When / Then
    assert.match(plan, /V3 워크스페이스 구조 분해/);
    assert.match(plan, /SelectedSpaceSummary/);
    assert.match(plan, /formatDimensions/);
    assert.match(plan, /문서\/구현 불일치/);
  });
});
