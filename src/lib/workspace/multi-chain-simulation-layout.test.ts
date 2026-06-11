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

  it("추가 박스가 6개를 넘으면 본문에 펼치지 않고 모달에서 페이지 단위로 선택한다", () => {
    // Given
    const hasInlineLimit =
      workspaceSource.includes("const CHAIN_INLINE_OPTION_LIMIT = 6") &&
      workspaceSource.includes("const CHAIN_PICKER_PAGE_SIZE = 10") &&
      workspaceSource.includes("const usePickerDialog = blockOptions.length > CHAIN_INLINE_OPTION_LIMIT");
    const hasPickerAction =
      workspaceSource.includes("저장된 박스 찾아 선택") &&
      workspaceSource.includes('aria-controls="chain-block-picker-dialog"') &&
      workspaceSource.includes("setChainPickerOpen(true)");
    const hasPickerDialog =
      workspaceSource.includes("function ChainBlockPickerDialog") &&
      workspaceSource.includes('id="chain-block-picker-dialog"') &&
      workspaceSource.includes("추가 시뮬레이션 박스 찾기") &&
      workspaceSource.includes("currentChainPickerPage") &&
      workspaceSource.includes("pagedTemplates.map");

    // When
    const hasScalablePickerContract = hasInlineLimit && hasPickerAction && hasPickerDialog;

    // Then
    assert.equal(hasScalablePickerContract, true);
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

  it("선택한 추가 결과는 박스별 조건, 추가 가능 수량, 상태를 비교 표로 보여준다", () => {
    // Given
    const hasQuantityTable =
      workspaceSource.includes('className="chain-variant-quantity-table"') &&
      workspaceSource.includes("selectedVariant.addedQuantities.map") &&
      workspaceSource.includes("<th>박스</th>") &&
      workspaceSource.includes("<th>추가 조건</th>") &&
      workspaceSource.includes("<th>추가 가능</th>") &&
      workspaceSource.includes("<th>상태</th>") &&
      workspaceSource.includes("createChainQuantityStatusCopy") &&
      workspaceSource.includes("총 추가") &&
      workspaceSource.includes("남은 부피");
    const hasTableStyles =
      /\.chain-variant-quantity-table\s*{[\s\S]*?width:\s*100%;[\s\S]*?border-collapse:\s*collapse;[\s\S]*?}/.test(
        styles
      ) &&
      /\.chain-variant-quantity-table\s+th,[\s\S]*?\.chain-variant-quantity-table\s+td\s*{[\s\S]*?padding:\s*8px;[\s\S]*?}/.test(
        styles
      ) &&
      /\.chain-variant-quantity-table\s+tfoot\s+th,[\s\S]*?\.chain-variant-quantity-table\s+tfoot\s+td\s*{[\s\S]*?font-weight:\s*800;[\s\S]*?}/.test(
        styles
      );

    // When
    const hasQuantityComparisonContract = hasQuantityTable && hasTableStyles;

    // Then
    assert.equal(hasQuantityComparisonContract, true);
  });

  it("추가 결과 비교 표와 계산 버튼은 선택 순서 우선순위 적용 여부를 현장 문구로 유지한다", () => {
    // Given
    const hasConditionCopyHelper =
      workspaceSource.includes("createChainConditionCopy(") &&
      workspaceSource.includes("createChainPriorityLabel(");
    const hasPriorityAwareTable =
      workspaceSource.includes("createChainPriorityScoreForIndex(selectedTemplateIds.indexOf(item.blockTemplateId))") &&
      workspaceSource.includes("createChainConditionCopy(requestedQuantity, priority)") &&
      workspaceSource.includes("수량+선택 순서 조건 포함");
    const hasPriorityAwareButton =
      workspaceSource.includes("createChainCalculateButtonLabel(") &&
      workspaceSource.includes("조건 반영 결과 계산") &&
      workspaceSource.includes("우선순위 결과 계산");
    const hasSelectionOrderCopy =
      workspaceSource.includes("박스를 선택한 순서가 추가 우선순위입니다.") &&
      workspaceSource.includes("먼저 선택한 박스가 1순위로 계산됩니다.");

    // When
    const keepsPriorityContext =
      hasConditionCopyHelper && hasPriorityAwareTable && hasPriorityAwareButton && hasSelectionOrderCopy;

    // Then
    assert.equal(keepsPriorityContext, true);
  });

  it("추가 박스 시뮬레이션은 박스를 누른 순서대로 우선순위를 계산하고 순서를 조정할 수 있다", () => {
    // Given
    const hasSelectionOrderPriority =
      workspaceSource.includes("createSelectedChainPriorityMap()");
    const removesAmbiguousPriorityState =
      !workspaceSource.includes("chainTemplatePrioritiesByTemplateId") &&
      !workspaceSource.includes("changeChainTemplatePriority") &&
      !workspaceSource.includes("CHAIN_TEMPLATE_PRIORITY_OPTIONS");
    const passesPriorityToEngine =
      workspaceSource.includes("const priorityByTemplateId = createSelectedChainPriorityMap();") &&
      workspaceSource.includes("priorityByTemplateId") &&
      workspaceSource.includes("선택 순서 결과");
    const hasPriorityScoreContract =
      workspaceSource.includes("createChainPriorityScoreForIndex(index)") &&
      workspaceSource.includes("(CHAIN_MAX_SELECTED_TEMPLATE_COUNT - index) * CHAIN_PRIORITY_SCORE_STEP");
    const hasReorderControls =
      workspaceSource.includes("onReorderSelectedTemplate") &&
      workspaceSource.includes("onMoveSelectedTemplate") &&
      workspaceSource.includes("draggable={selectedTemplates.length > 1}") &&
      workspaceSource.includes("dataTransfer.setData") &&
      workspaceSource.includes("dataTransfer.getData") &&
      workspaceSource.includes("chain-template-rank-badge") &&
      workspaceSource.includes("드래그 또는 버튼으로 순서 변경");
    const hasPriorityStyles =
      /\.chain-template-order-control\s*{[\s\S]*?display:\s*grid;[\s\S]*?}/.test(styles) &&
      /\.chain-template-order-control\s+button\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?white-space:\s*normal;[\s\S]*?}/.test(
        styles
      ) &&
      /\.chain-template-rank-badge\s*{[\s\S]*?border-radius:[\s\S]*?}/.test(styles);

    // When
    const hasPriorityContract =
      hasSelectionOrderPriority &&
      removesAmbiguousPriorityState &&
      passesPriorityToEngine &&
      hasPriorityScoreContract &&
      hasReorderControls &&
      hasPriorityStyles;

    // Then
    assert.equal(hasPriorityContract, true);
  });

  it("추가 박스별 조건 행은 순서 버튼을 우측에 고정해 카드 높이를 줄인다", () => {
    // Given
    const hasConditionCardMarkup =
      workspaceSource.includes('className="chain-template-summary"') &&
      workspaceSource.includes('className="chain-template-rank-badge"') &&
      workspaceSource.includes('className="chain-template-order-control"');
    const hasRightSideActionGrid =
      /\.chain-template-quantity-row\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(104px,\s*auto\);[\s\S]*?grid-template-areas:[\s\S]*?"summary order"[\s\S]*?"quantity order"[\s\S]*?"field order"[\s\S]*?background:\s*white;[\s\S]*?}/.test(
        styles
      ) &&
      /\.chain-template-order-control\s*{[\s\S]*?grid-area:\s*order;[\s\S]*?align-self:\s*stretch;[\s\S]*?}/.test(
        styles
      );
    const hasWrappingControlGrid =
      /\.chain-template-quantity-mode\s*{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(118px,\s*1fr\)\);[\s\S]*?}/.test(
        styles
      ) &&
      /\.chain-template-order-control\s+>\s+div\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        styles
      );
    const hasReadablePriorityButton =
      /\.chain-template-order-control\s*{[\s\S]*?min-width:\s*0;[\s\S]*?}/.test(styles) &&
      /\.chain-template-order-control\s+>\s+span\s*{[\s\S]*?font-size:\s*12px;[\s\S]*?}/.test(styles);
    const hasMobileFallback =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.chain-template-quantity-row\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?grid-template-areas:[\s\S]*?"summary"[\s\S]*?"quantity"[\s\S]*?"field"[\s\S]*?"order";[\s\S]*?}/.test(
        styles
      );

    // When
    const hasStableConditionLayout =
      hasConditionCardMarkup &&
      hasRightSideActionGrid &&
      hasWrappingControlGrid &&
      hasReadablePriorityButton &&
      hasMobileFallback;

    // Then
    assert.equal(hasStableConditionLayout, true);
  });

  it("추가 박스 계산 버튼은 비활성 사유를 버튼과 안내 문구로 제공한다", () => {
    // Given
    const hasDisabledReasonCopy =
      workspaceSource.includes("const chainCalculateDisabledReason =") &&
      workspaceSource.includes("추가할 박스를 먼저 선택하세요.") &&
      workspaceSource.includes("추가 가능 수량을 계산하고 있습니다.");
    const exposesReasonOnButton =
      workspaceSource.includes("title={chainCalculateDisabledReason ?? undefined}") &&
      /aria-label={[\s\S]*?chainCalculateDisabledReason[\s\S]*?`추가 박스 계산 비활성: \$\{chainCalculateDisabledReason\}`[\s\S]*?"추가 박스 추천 결과 계산"[\s\S]*?}/.test(
        workspaceSource
      );
    const rendersSingleGuidance =
      workspaceSource.includes('{chainCalculateDisabledReason && chainStatus !== "calculating" ? (') &&
      workspaceSource.includes("{chainCalculateDisabledReason}") &&
      !workspaceSource.includes('<p className="fine-print review-cta-hint">박스를 선택해야 계산할 수 있습니다.</p>');

    // When
    const hasAccessibleDisabledCalculation = hasDisabledReasonCopy && exposesReasonOnButton && rendersSingleGuidance;

    // Then
    assert.equal(hasAccessibleDisabledCalculation, true);
  });

  it("결과 변경 또는 선택 초기화 시 추가 박스별 수량 조건과 선택 순서를 함께 비운다", () => {
    // Given
    const latestResultEffect = workspaceSource.match(
      /useEffect\(\(\)\s*=>\s*{[\s\S]*?},\s*\[latestResult\?\.resultId\]\);/
    )?.[0] ?? "";
    const resultResetEffect =
      latestResultEffect.includes("previousLatestResultIdRef.current") &&
      latestResultEffect.includes("setSelectedChainTemplateIds([]);") &&
      latestResultEffect.includes("setChainRequestedQuantitiesByTemplateId({});") &&
      latestResultEffect.includes("기준 결과가 바뀌어 추가 박스 선택과 조건을 초기화했습니다.");
    const clearSelectionHandler =
      /function\s+clearChainSelection\(\)\s*{[\s\S]*?setSelectedChainTemplateIds\(\[\]\);[\s\S]*?setChainRequestedQuantitiesByTemplateId\(\{\}\);[\s\S]*?clearChainPreviewState\(\);[\s\S]*?추가 박스 선택과 조건을 모두 초기화했습니다\.[\s\S]*?}/.test(
        workspaceSource
      );

    // When
    const clearsStaleChainConditions = resultResetEffect && clearSelectionHandler;

    // Then
    assert.equal(clearsStaleChainConditions, true);
  });

  it("추가 박스 시뮬레이션 상태 문구는 조건 설정과 계산 모델을 일관되게 안내한다", () => {
    // Given
    const hasSelectionPrompt = workspaceSource.includes(
      "선택한 순서가 추가 우선순위입니다."
    );
    const hasQuantityCalculatingCopy = workspaceSource.includes(
      "박스별 지정 수량 조건으로 결과를 계산하고 있습니다."
    );
    const hasPriorityEmptyCopy = workspaceSource.includes(
      "선택 순서 조건의 박스를 더 넣을 수 없습니다."
    );

    // When
    const hasConsistentConditionCopy = hasSelectionPrompt && hasQuantityCalculatingCopy && hasPriorityEmptyCopy;

    // Then
    assert.equal(hasConsistentConditionCopy, true);
  });

  it("추가 결과는 반영 전 미리보기와 반영 후 취소 가능 상태를 같은 자리에서 안내한다", () => {
    // Given
    const hasApplyGuidance =
      workspaceSource.includes('className="chain-apply-guidance"') &&
      workspaceSource.includes("아직 원본 결과에는 반영되지 않았습니다.") &&
      workspaceSource.includes("이 결과 반영을 누르세요.") &&
      workspaceSource.includes("미리보기 취소로 원본 화면으로 돌아갈 수 있습니다.") &&
      workspaceSource.includes("직전 추가를 취소할 수 있습니다.");
    const hasGuidanceState =
      workspaceSource.includes('data-state={canConfirm ? "preview" : "applied"}') &&
      workspaceSource.includes("latestChainItem ? (") &&
      workspaceSource.includes("canConfirm ? (");
    const hasGuidanceStyles =
      /\.chain-apply-guidance\s*{[\s\S]*?display:\s*grid;[\s\S]*?border:[\s\S]*?background:[\s\S]*?}/.test(styles) &&
      /\.chain-apply-guidance\[data-state="preview"\]\s*{[\s\S]*?border-color:[\s\S]*?}/.test(styles) &&
      /\.chain-apply-guidance\[data-state="applied"\]\s*{[\s\S]*?border-color:[\s\S]*?}/.test(styles);

    // When
    const hasApplyGuidanceContract = hasApplyGuidance && hasGuidanceState && hasGuidanceStyles;

    // Then
    assert.equal(hasApplyGuidanceContract, true);
  });

  it("추가 결과 미리보기 취소는 선택 조건을 유지하고 추가 시뮬레이션 액션 영역에서도 제공한다", () => {
    // Given
    const cancelHandler = workspaceSource.match(/function\s+cancelChainPreview\(\)\s*{[\s\S]*?}\n/)?.[0] ?? "";
    const passesCancelAction = workspaceSource.includes("onCancelPreview={cancelChainPreview}");
    const hasPanelCancelAction =
      /<button\s+className="secondary-button chain-preview-cancel-action"[\s\S]*?onClick={onCancelPreview}[\s\S]*?미리보기 취소[\s\S]*?<\/button>/.test(
        workspaceSource
      );
    const keepsSelectionAndConditions =
      cancelHandler.includes("clearChainPreviewState();") &&
      cancelHandler.includes('setChainStatus("idle");') &&
      cancelHandler.includes("추가 결과 미리보기를 취소했습니다. 선택한 박스와 조건은 유지됩니다.") &&
      !/setSelectedChainTemplateIds\(\[\]\)|setChainRequestedQuantitiesByTemplateId\(\{\}\)/.test(cancelHandler);

    // When
    const hasAccessibleCancelContract = passesCancelAction && hasPanelCancelAction && keepsSelectionAndConditions;

    // Then
    assert.equal(hasAccessibleCancelContract, true);
  });

  it("추가 결과 미리보기 중 4번째 박스 선택 시 기존 미리보기 상태를 유지한다", () => {
    // Given
    const toggleSelectionHandler =
      workspaceSource.match(/function\s+toggleChainTemplateSelection\(blockTemplateId:\s*string\)\s*{[\s\S]*?}\n\n\s*function\s+updateSelectedChainTemplateOrder/)?.[0] ??
      "";

    const preservesActivePreview =
      toggleSelectionHandler.includes("selectedChainTemplateIds.length >= CHAIN_MAX_SELECTED_TEMPLATE_COUNT") &&
      toggleSelectionHandler.includes('chainStatus === "preview"') &&
      toggleSelectionHandler.includes("chainPreview") &&
      toggleSelectionHandler.includes('setChainStatus("preview");') &&
      toggleSelectionHandler.includes("현재 미리보기는 유지됩니다.");

    // When
    const hasPreviewPreservationContract = preservesActivePreview;

    // Then
    assert.equal(hasPreviewPreservationContract, true);
  });

  it("추가 결과 미리보기 전 4번째 박스 선택 제한은 계산 오류 상태로 바꾸지 않는다", () => {
    // Given
    const toggleSelectionHandler =
      workspaceSource.match(/function\s+toggleChainTemplateSelection\(blockTemplateId:\s*string\)\s*{[\s\S]*?}\n\n\s*function\s+updateSelectedChainTemplateOrder/)?.[0] ??
      "";
    const maxSelectionBranch =
      toggleSelectionHandler.match(/if\s*\(!isSelected\s*&&\s*selectedChainTemplateIds\.length\s*>=\s*CHAIN_MAX_SELECTED_TEMPLATE_COUNT\)\s*{[\s\S]*?setChainStatusMessage\("추가 시뮬레이션 박스는 최대 3개까지 선택할 수 있습니다\."\);[\s\S]*?return;\s*}/)?.[0] ??
      "";

    const keepsSelectionLimitAsGuidance =
      maxSelectionBranch.includes('setChainStatus("idle");') &&
      !maxSelectionBranch.includes('setChainStatus("error");');
    const doesNotExposeResultRecoveryAction =
      workspaceSource.includes('chainStatus === "error" ? (') &&
      maxSelectionBranch.includes("추가 시뮬레이션 박스는 최대 3개까지 선택할 수 있습니다.");

    // When
    const hasGuidanceOnlyMaxSelectionContract = keepsSelectionLimitAsGuidance && doesNotExposeResultRecoveryAction;

    // Then
    assert.equal(hasGuidanceOnlyMaxSelectionContract, true);
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
    const hasPickerDialogTouchTarget =
      /\.chain-picker-dialog\s*{[\s\S]*?width:\s*min\(820px,[\s\S]*?background:\s*var\(--surface\);[\s\S]*?}/.test(
        styles
      ) &&
      /\.chain-picker-dialog-list\s*{[\s\S]*?display:\s*grid;[\s\S]*?overflow:\s*auto;[\s\S]*?}/.test(styles);
    const hasFilterTouchTarget =
      /\.chain-filter-row\s*{[\s\S]*?display:\s*grid;[\s\S]*?}/.test(styles) &&
      /\.chain-filter-row\s+select\s*{[\s\S]*?min-height:\s*48px;[\s\S]*?}/.test(styles);
    const hasMobileLayout =
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.chain-variant-list\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        styles
      ) &&
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.chain-filter-row\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?}/.test(
        styles
      ) &&
      /@media\s*\(max-width:\s*767px\)\s*{[\s\S]*?\.chain-picker-dialog\s*{[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100dvh;[\s\S]*?}/.test(
        styles
      );

    // When
    const hasResponsiveContract =
      hasSelectionSummary &&
      hasSearchField &&
      hasVariantTouchTarget &&
      hasPickerDialogTouchTarget &&
      hasFilterTouchTarget &&
      hasMobileLayout;

    // Then
    assert.equal(hasResponsiveContract, true);
  });
});
