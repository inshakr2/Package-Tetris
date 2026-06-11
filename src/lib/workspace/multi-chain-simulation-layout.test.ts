import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const workspaceSource = readFileSync("src/components/tetris-workspace-app.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

describe("multi-chain-simulation-layout", () => {
  it("추가 박스 시뮬레이션은 저장된 박스 전체에서 최대 3개까지 체크 선택한다", () => {
    // Given
    const usesAllSavedTemplates =
      workspaceSource.includes("blockTemplates={workspace.blockTemplates}") &&
      workspaceSource.includes("searchBlockTemplates(chainBlockOptions, chainSearchTerm)");
    const hasMultiSelectState =
      workspaceSource.includes("selectedChainTemplateIds") &&
      workspaceSource.includes("toggleChainTemplateSelection") &&
      workspaceSource.includes("추가 시뮬레이션 박스는 최대 3개까지 선택할 수 있습니다.");
    const hasCheckboxOptions =
      workspaceSource.includes('role="checkbox"') &&
      workspaceSource.includes("selectedTemplateIds.includes(template.blockTemplateId)") &&
      workspaceSource.includes('aria-label="추가 시뮬레이션 박스 검색"');

    // When
    const hasMultiSelectContract = usesAllSavedTemplates && hasMultiSelectState && hasCheckboxOptions;

    // Then
    assert.equal(hasMultiSelectContract, true);
  });

  it("추가 박스 시뮬레이션은 상위/하위 그룹 필터로 저장 박스를 좁혀 찾는다", () => {
    // Given
    const hasGroupFilterState =
      workspaceSource.includes("chainGroup1Filter") &&
      workspaceSource.includes("chainGroup2Filter") &&
      workspaceSource.includes("createTopBlockGroups(blockGroups)") &&
      workspaceSource.includes("createChildBlockGroups(blockGroups, chainGroup1Filter)");
    const passesGroupsToPanel =
      workspaceSource.includes("blockGroups={blockGroups}") &&
      workspaceSource.includes("group1Filter={chainGroup1Filter}") &&
      workspaceSource.includes("group2Filter={chainGroup2Filter}");
    const hasFilterControls =
      workspaceSource.includes('aria-label="추가 시뮬레이션 그룹 필터"') &&
      workspaceSource.includes('aria-label="추가 시뮬레이션 상위그룹 필터"') &&
      workspaceSource.includes('aria-label="추가 시뮬레이션 하위그룹 필터"') &&
      workspaceSource.includes("전체 상위그룹") &&
      workspaceSource.includes("전체 하위그룹");

    // When
    const hasGroupFilterContract = hasGroupFilterState && passesGroupsToPanel && hasFilterControls;

    // Then
    assert.equal(hasGroupFilterContract, true);
  });

  it("추천 결과와 각 박스 우선 결과를 현장 터치 가능한 variant 버튼으로 전환한다", () => {
    // Given
    const usesMultiSimulation =
      workspaceSource.includes("runMultiChainSimulationV0") &&
      workspaceSource.includes("chainMultiPreview") &&
      workspaceSource.includes("selectedChainVariantId");
    const hasVariantUi =
      workspaceSource.includes('className="chain-variant-list"') &&
      workspaceSource.includes('className="chain-variant-button"') &&
      workspaceSource.includes('aria-pressed={selectedVariantId === variant.variantId}') &&
      workspaceSource.includes("추천 결과") &&
      workspaceSource.includes("남은 부피");
    const hasApplySelectedVariant =
      workspaceSource.includes("selectedChainVariant") &&
      workspaceSource.includes("convertMultiChainVariantToPreview") &&
      workspaceSource.includes("이 결과 반영");

    // When
    const hasVariantContract = usesMultiSimulation && hasVariantUi && hasApplySelectedVariant;

    // Then
    assert.equal(hasVariantContract, true);
  });

  it("선택한 추가 결과는 박스별 추가 수량을 비교 표로 보여준다", () => {
    // Given
    const hasQuantityTable =
      workspaceSource.includes('className="chain-variant-quantity-table"') &&
      workspaceSource.includes("selectedVariant.addedQuantities.map") &&
      workspaceSource.includes("<th>박스</th>") &&
      workspaceSource.includes("<th>추가 수량</th>") &&
      workspaceSource.includes("총 추가");
    const hasTableStyles =
      /\.chain-variant-quantity-table\s*{[\s\S]*?width:\s*100%;[\s\S]*?border-collapse:\s*collapse;[\s\S]*?}/.test(
        styles
      ) &&
      /\.chain-variant-quantity-table\s+th,[\s\S]*?\.chain-variant-quantity-table\s+td\s*{[\s\S]*?padding:\s*8px;[\s\S]*?}/.test(
        styles
      );

    // When
    const hasQuantityComparisonContract = hasQuantityTable && hasTableStyles;

    // Then
    assert.equal(hasQuantityComparisonContract, true);
  });

  it("다중 선택과 variant 영역은 태블릿/모바일에서 한 컬럼으로 접히고 버튼 터치 타깃을 유지한다", () => {
    // Given
    const hasSelectionSummary =
      /\.chain-selection-summary\s*{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?}/.test(styles);
    const hasSearchField =
      /\.chain-search-field\s*{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*5px;[\s\S]*?}/.test(styles) &&
      /\.chain-search-field\s+input\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(styles);
    const hasVariantTouchTarget =
      /\.chain-variant-list\s*{[\s\S]*?display:\s*grid;[\s\S]*?}/.test(styles) &&
      /\.chain-variant-button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(styles);
    const hasFilterTouchTarget =
      /\.chain-filter-row\s*{[\s\S]*?display:\s*grid;[\s\S]*?}/.test(styles) &&
      /\.chain-filter-row\s+select\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(styles);
    const hasMobileLayout =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.chain-variant-list\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        styles
      ) &&
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.chain-filter-row\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        styles
      );

    // When
    const hasResponsiveContract =
      hasSelectionSummary && hasSearchField && hasVariantTouchTarget && hasFilterTouchTarget && hasMobileLayout;

    // Then
    assert.equal(hasResponsiveContract, true);
  });
});
