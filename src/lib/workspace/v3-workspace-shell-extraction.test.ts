import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const APP_PATH = join(process.cwd(), "src/components/tetris-workspace-app.tsx");
const SELECTED_SPACE_SUMMARY_PATH = join(process.cwd(), "src/components/workspace/selected-space-summary.tsx");
const SPACE_LIBRARY_PANEL_PATH = join(process.cwd(), "src/components/workspace/space-library-panel.tsx");
const BLOCK_LIBRARY_PANEL_PATH = join(process.cwd(), "src/components/workspace/block-library-panel.tsx");
const CURRENT_WORK_BLOCKS_PANEL_PATH = join(process.cwd(), "src/components/workspace/current-work-blocks-panel.tsx");
const NUMBER_FIELD_INPUT_PATH = join(process.cwd(), "src/components/workspace/number-field-input.tsx");
const BLOCK_GROUP_OPTIONS_PATH = join(process.cwd(), "src/lib/workspace/block-group-options.ts");
const DRAFT_LOAD_PRIORITY_OPTIONS_PATH = join(process.cwd(), "src/lib/workspace/draft-load-priority-options.ts");
const DIMENSION_FORMAT_PATH = join(process.cwd(), "src/lib/workspace/dimension-format.ts");
const PLAN_PATH = join(process.cwd(), "docs/plans/2026-06-16-v3-workspace-shell-extraction.md");

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("V3 workspace shell extraction", () => {
  it("선택된 공간 요약을 워크스페이스 leaf 컴포넌트로 분리한다", () => {
    // Given
    const appSource = read(APP_PATH);
    const spaceLibraryPanelSource = read(SPACE_LIBRARY_PANEL_PATH);
    const selectedSpaceSummarySource = read(SELECTED_SPACE_SUMMARY_PATH);

    // When / Then
    assert.equal(existsSync(SELECTED_SPACE_SUMMARY_PATH), true);
    assert.match(spaceLibraryPanelSource, /\.\/selected-space-summary/);
    assert.doesNotMatch(appSource, /function SelectedSpaceSummary/);
    assert.match(selectedSpaceSummarySource, /export function SelectedSpaceSummary/);
    assert.match(selectedSpaceSummarySource, /aria-live="polite"/);
  });

  it("공간 선택 섹션 패널을 워크스페이스 컴포넌트로 분리한다", () => {
    // Given
    const appSource = read(APP_PATH);
    const spaceLibraryPanelSource = read(SPACE_LIBRARY_PANEL_PATH);

    // When / Then
    assert.equal(existsSync(SPACE_LIBRARY_PANEL_PATH), true);
    assert.match(appSource, /@\/components\/workspace\/space-library-panel/);
    assert.doesNotMatch(appSource, /function SpaceLibraryPanel/);
    assert.match(spaceLibraryPanelSource, /export function SpaceLibraryPanel/);
    assert.match(spaceLibraryPanelSource, /getWorkspaceSectionTitle\("space"\)/);
  });

  it("저장된 박스 패널과 그룹 옵션 로직을 워크스페이스 단위로 분리한다", () => {
    // Given
    const appSource = read(APP_PATH);
    const blockLibraryPanelSource = read(BLOCK_LIBRARY_PANEL_PATH);
    const blockGroupOptionsSource = read(BLOCK_GROUP_OPTIONS_PATH);

    // When / Then
    assert.equal(existsSync(BLOCK_LIBRARY_PANEL_PATH), true);
    assert.equal(existsSync(BLOCK_GROUP_OPTIONS_PATH), true);
    assert.match(appSource, /@\/components\/workspace\/block-library-panel/);
    assert.match(appSource, /@\/lib\/workspace\/block-group-options/);
    assert.doesNotMatch(appSource, /function BlockLibraryPanel/);
    assert.doesNotMatch(appSource, /function BlockLibraryDialog/);
    assert.doesNotMatch(appSource, /function BlockTemplateImportDialog/);
    assert.doesNotMatch(appSource, /function BlockTemplateImportFormatDialog/);
    assert.doesNotMatch(appSource, /function createTopBlockGroups/);
    assert.match(blockLibraryPanelSource, /export function BlockLibraryPanel/);
    assert.match(blockLibraryPanelSource, /function BlockLibraryDialog/);
    assert.match(blockLibraryPanelSource, /function BlockTemplateImportDialog/);
    assert.match(blockLibraryPanelSource, /function BlockTemplateImportFormatDialog/);
    assert.match(blockGroupOptionsSource, /export function createTopBlockGroups/);
  });

  it("현재 작업 패널, 숫자 입력, 배치 우선 옵션을 워크스페이스 단위로 분리한다", () => {
    // Given
    const appSource = read(APP_PATH);
    const currentWorkPanelSource = read(CURRENT_WORK_BLOCKS_PANEL_PATH);
    const numberFieldInputSource = read(NUMBER_FIELD_INPUT_PATH);
    const priorityOptionsSource = read(DRAFT_LOAD_PRIORITY_OPTIONS_PATH);

    // When / Then
    assert.equal(existsSync(CURRENT_WORK_BLOCKS_PANEL_PATH), true);
    assert.equal(existsSync(NUMBER_FIELD_INPUT_PATH), true);
    assert.equal(existsSync(DRAFT_LOAD_PRIORITY_OPTIONS_PATH), true);
    assert.match(appSource, /@\/components\/workspace\/current-work-blocks-panel/);
    assert.match(appSource, /@\/components\/workspace\/number-field-input/);
    assert.match(appSource, /@\/lib\/workspace\/draft-load-priority-options/);
    assert.doesNotMatch(appSource, /function CurrentWorkBlocksPanel/);
    assert.doesNotMatch(appSource, /function DraftBlockImportDialog/);
    assert.doesNotMatch(appSource, /function DraftBlockImportFormatDialog/);
    assert.doesNotMatch(appSource, /function NumberFieldInput/);
    assert.doesNotMatch(appSource, /const DRAFT_LOAD_PRIORITY_OPTIONS/);
    assert.match(currentWorkPanelSource, /export function CurrentWorkBlocksPanel/);
    assert.match(currentWorkPanelSource, /function DraftBlockImportDialog/);
    assert.match(currentWorkPanelSource, /function DraftBlockImportFormatDialog/);
    assert.match(numberFieldInputSource, /export function NumberFieldInput/);
    assert.match(priorityOptionsSource, /export const DRAFT_LOAD_PRIORITY_OPTIONS/);
    assert.match(priorityOptionsSource, /export function normalizeDraftLoadPriorityOptionValue/);
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
    assert.match(plan, /SpaceLibraryPanel/);
    assert.match(plan, /BlockLibraryPanel/);
    assert.match(plan, /CurrentWorkBlocksPanel/);
    assert.match(plan, /NumberFieldInput/);
    assert.match(plan, /formatDimensions/);
    assert.match(plan, /문서\/구현 불일치/);
  });
});
