import type { OptimizationInput, OptimizationOutput } from "./engine-contract";
import {
  BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS,
  BLOCK_TEMPLATE_XLSX_COLUMNS,
  createBlockTemplateImportPreview
} from "./block-template-xlsx-import";
import {
  DRAFT_BLOCK_IMPORT_SAMPLE_ROWS,
  DRAFT_BLOCK_XLSX_COLUMNS,
  createDraftBlockImportPreview
} from "./draft-block-xlsx-import";
import { runMultiChainSimulationV0 } from "./multi-chain-simulation";
import { createPackedSpaceSignature } from "./packed-space-signature";
import { validateOptimizationOutputInvariants, validatePackedSpacesInvariants } from "./packing-engine-invariants";
import { validatePackedSpace } from "./packed-result-validation";
import { calculateUsableSize, DEFAULT_PALLET_SPACE_ID, OVERHANG_PALLET_SPACE_ID, PRESET_SPACES } from "./presets";
import {
  DEFAULT_MINIMUM_SUPPORT_RATIO,
  PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO,
  type BlockDefinition,
  type BlockTemplate,
  type PackedBlock,
  type ResultSummary,
  type SpaceDefinition
} from "./types";

export interface FieldPackingScenario {
  name: string;
  input: OptimizationInput;
}

export interface FieldPackingScenarioAudit {
  scenarioCount: number;
  totalPackedBlockCount: number;
  totalUsedSpaceCount: number;
  failedScenarioNames: string[];
}

export interface FieldFeatureCheckResult {
  name: string;
  detail: string;
  isSafe: boolean;
  isExpected: boolean;
}

export interface FieldPackingScenarioPerformanceResult {
  name: string;
  elapsedMs: number;
  packedBlockCount: number;
  usedSpaceCount: number;
  unloadedBlockCount: number;
  isSafe: boolean;
  isWithinBudget: boolean;
  detail: string;
}

export interface FieldPackingScenarioPerformanceAudit extends FieldPackingScenarioAudit {
  totalElapsedMs: number;
  slowScenarioNames: string[];
  scenarioResults: FieldPackingScenarioPerformanceResult[];
  failedFeatureCheckNames: string[];
  featureCheckResults: FieldFeatureCheckResult[];
}

interface FieldPackingPerformanceAuditOptions {
  nowMs?: () => number;
  scenarioBudgetMs?: number;
}

type PackingEngineRunner = (input: OptimizationInput) => OptimizationOutput;

const TIMESTAMP = "2026-06-09T00:00:00.000Z";
const DEFAULT_SCENARIO_BUDGET_MS = 5000;

export function createFieldPackingScenarios(): FieldPackingScenario[] {
  return [
    createScenario({
      name: "파레트 기본 대량 혼합 박스",
      runId: "field-pallet-mixed",
      spaceId: DEFAULT_PALLET_SPACE_ID,
      blocks: [
        createBlock("pallet-normal-500", "일반 박스 500", { widthMm: 500, depthMm: 500, heightMm: 450 }, 8),
        createBlock("pallet-flat-1000", "받침 판형 박스", { widthMm: 1000, depthMm: 1000, heightMm: 180 }, 2),
        createBlock("pallet-fragile-400", "깨짐주의 소형 박스", { widthMm: 400, depthMm: 400, heightMm: 320 }, 6, true)
      ]
    }),
    createScenario({
      name: "20ft GP 장척 박스 혼합",
      runId: "field-container-long-mixed",
      spaceId: "preset-container-20ft-gp",
      blocks: [
        createBlock("container-long-1200", "장척 박스 1200", { widthMm: 1200, depthMm: 800, heightMm: 600 }, 18),
        createBlock("container-normal-900", "중형 박스 900", { widthMm: 900, depthMm: 700, heightMm: 500 }, 14),
        createBlock("container-fragile-600", "깨짐주의 보조 박스", { widthMm: 600, depthMm: 400, heightMm: 450 }, 12, true)
      ]
    }),
    createScenario({
      name: "2.5톤반 낮은 짐칸 혼합",
      runId: "field-truck-low-deck",
      spaceId: "preset-truck-2_5-ton-class",
      blocks: [
        createBlock("truck-low-1000", "낮은 긴 박스", { widthMm: 1000, depthMm: 600, heightMm: 350 }, 8),
        createBlock("truck-low-700", "낮은 일반 박스", { widthMm: 700, depthMm: 450, heightMm: 320 }, 12),
        createBlock("truck-low-fragile-500", "낮은 깨짐주의 박스", { widthMm: 500, depthMm: 400, heightMm: 300 }, 10, true)
      ]
    })
  ];
}

export function runFieldPackingScenarioAudit(
  scenarios: FieldPackingScenario[],
  runPackingEngine: PackingEngineRunner
): FieldPackingScenarioAudit {
  const audit = runFieldPackingScenarioPerformanceAudit(scenarios, runPackingEngine);

  return {
    scenarioCount: audit.scenarioCount,
    totalPackedBlockCount: audit.totalPackedBlockCount,
    totalUsedSpaceCount: audit.totalUsedSpaceCount,
    failedScenarioNames: audit.failedScenarioNames
  };
}

export function runFieldPackingScenarioPerformanceAudit(
  scenarios: FieldPackingScenario[],
  runPackingEngine: PackingEngineRunner,
  options: FieldPackingPerformanceAuditOptions = {}
): FieldPackingScenarioPerformanceAudit {
  const nowMs = options.nowMs ?? Date.now;
  const scenarioBudgetMs = options.scenarioBudgetMs ?? DEFAULT_SCENARIO_BUDGET_MS;
  const scenarioResults = scenarios.map((scenario) =>
    runFieldPackingScenarioPerformance(scenario, runPackingEngine, nowMs, scenarioBudgetMs)
  );

  const failedScenarioNames = scenarioResults
    .filter((result) => !result.isSafe || result.unloadedBlockCount > 0)
    .map((result) => result.name);
  const slowScenarioNames = scenarioResults
    .filter((result) => !result.isWithinBudget)
    .map((result) => result.name);
  const featureCheckResults = runFieldFeatureChecks(runPackingEngine);
  const failedFeatureCheckNames = featureCheckResults
    .filter((result) => !result.isSafe || !result.isExpected)
    .map((result) => result.name);

  const totalPackedBlockCount = scenarioResults.reduce((sum, result) => sum + result.packedBlockCount, 0);
  const totalUsedSpaceCount = scenarioResults.reduce((sum, result) => sum + result.usedSpaceCount, 0);
  const totalElapsedMs = scenarioResults.reduce((sum, result) => sum + result.elapsedMs, 0);

  return {
    scenarioCount: scenarios.length,
    totalPackedBlockCount,
    totalUsedSpaceCount,
    totalElapsedMs,
    failedScenarioNames,
    slowScenarioNames,
    scenarioResults,
    failedFeatureCheckNames,
    featureCheckResults
  };
}

function runFieldFeatureChecks(runPackingEngine: PackingEngineRunner): FieldFeatureCheckResult[] {
  return [
    runPartialSupportFeatureCheck(runPackingEngine),
    runOverhangPalletRecommendationFeatureCheck(runPackingEngine),
    ...runPinwheelPalletFeatureChecks(runPackingEngine),
    runBlockTemplateXlsxImportFeatureCheck(),
    runDraftBlockXlsxImportFeatureCheck(),
    runAdditionalSimulationFeatureCheck(),
    runFieldFeedbackAdditionalSimulationFeatureCheck(runPackingEngine)
  ];
}

function runPartialSupportFeatureCheck(runPackingEngine: PackingEngineRunner): FieldFeatureCheckResult {
  const space = createFeatureCheckSpace("field-partial-support-space", "부분 지지 검증 공간");
  const supportBlock = {
    ...createBlock(
      "field-partial-support-base",
      "55% 받침 기준 박스",
      { widthMm: 600, depthMm: 1000, heightMm: 500 },
      1
    ),
    loadPriority: 10
  };
  const topBlock = createBlock(
    "field-partial-support-top",
    "부분 지지 상단 박스",
    { widthMm: 1000, depthMm: 1000, heightMm: 500 },
    1
  );
  const offOutput = runPackingEngine({
    runId: "field-partial-support-off",
    space,
    blocks: [supportBlock, topBlock],
    policy: createFeaturePolicy(false)
  });
  const onOutput = runPackingEngine({
    runId: "field-partial-support-on",
    space,
    blocks: [supportBlock, topBlock],
    policy: createFeaturePolicy(true)
  });
  const usableSize = calculateUsableSize(space);
  const onPolicy = createValidationPolicy(true);
  const topPackedBlock = onOutput.spaces
    .flatMap((packedSpace) => packedSpace.blocks)
    .find((block) => block.blockTemplateId === topBlock.blockTemplateId);
  const isSafe =
    onOutput.spaces.length > 0 &&
    onOutput.spaces.every((packedSpace) => validatePackedSpace(packedSpace, usableSize, onPolicy).isValid);
  const isExpected =
    offOutput.usedSpaceCount > onOutput.usedSpaceCount &&
    onOutput.usedSpaceCount === 1 &&
    onOutput.unloadedBlockCount === 0 &&
    topPackedBlock?.zMm === 500;

  return {
    name: "부분 지지 허용 55% 현장 검증",
    detail: `부분 지지 끔 ${offOutput.usedSpaceCount}공간, 부분 지지 켬 ${onOutput.usedSpaceCount}공간`,
    isSafe,
    isExpected
  };
}

function runOverhangPalletRecommendationFeatureCheck(runPackingEngine: PackingEngineRunner): FieldFeatureCheckResult {
  const basicPallet = findPresetSpace(DEFAULT_PALLET_SPACE_ID);
  const overhangPallet = findPresetSpace(OVERHANG_PALLET_SPACE_ID);
  const policy = createFeaturePolicy(false);
  const blocks = [
    createBlock("field-overhang-fit", "오버행 검토 박스", { widthMm: 575, depthMm: 575, heightMm: 1120 }, 2)
  ];
  const basicOutput = runPackingEngine({
    runId: "field-overhang-basic-pallet",
    space: basicPallet,
    blocks,
    policy
  });
  const overhangOutput = runPackingEngine({
    runId: "field-overhang-overhang-pallet",
    space: overhangPallet,
    blocks,
    policy
  });
  const validationPolicy = createValidationPolicy(false);
  const isSafe =
    overhangOutput.spaces.length > 0 &&
    overhangOutput.spaces.every((packedSpace) =>
      validatePackedSpace(packedSpace, calculateUsableSize(overhangPallet), validationPolicy).isValid
    );
  const isExpected =
    basicOutput.usedSpaceCount === 2 &&
    overhangOutput.usedSpaceCount === 1 &&
    basicOutput.unloadedBlockCount === 0 &&
    overhangOutput.unloadedBlockCount === 0;

  return {
    name: "오버행 파레트 추천 현장 검증",
    detail: `기본 ${basicOutput.usedSpaceCount}공간, 오버행 ${overhangOutput.usedSpaceCount}공간`,
    isSafe,
    isExpected
  };
}

interface PinwheelCaseResult {
  label: string;
  input: OptimizationInput;
  output: OptimizationOutput;
  packedBlockCount: number;
  validationReasons: string[];
  isSafe: boolean;
}

function runPinwheelPalletFeatureChecks(runPackingEngine: PackingEngineRunner): FieldFeatureCheckResult[] {
  const space = findPresetSpace(DEFAULT_PALLET_SPACE_ID);
  const policy = createFeaturePolicy(false);
  const baseCase = runPinwheelCase(runPackingEngine, {
    label: "690x370x580 8개",
    runId: "field-pinwheel-pallet",
    space,
    policy,
    dimensions: { widthMm: 690, depthMm: 370, heightMm: 580 },
    quantity: 8
  });
  const permutationCases = [
    runPinwheelCase(runPackingEngine, {
      label: "370x690x580 8개",
      runId: "field-pinwheel-permutation-1",
      space,
      policy,
      dimensions: { widthMm: 370, depthMm: 690, heightMm: 580 },
      quantity: 8
    }),
    runPinwheelCase(runPackingEngine, {
      label: "580x370x690 8개",
      runId: "field-pinwheel-permutation-2",
      space,
      policy,
      dimensions: { widthMm: 580, depthMm: 370, heightMm: 690 },
      quantity: 8
    }),
    runPinwheelCase(runPackingEngine, {
      label: "690x580x370 8개",
      runId: "field-pinwheel-permutation-3",
      space,
      policy,
      dimensions: { widthMm: 690, depthMm: 580, heightMm: 370 },
      quantity: 8
    })
  ];
  const boundaryCase = runPinwheelCase(runPackingEngine, {
    label: "690x370x580 9개",
    runId: "field-pinwheel-boundary-9",
    space,
    policy,
    dimensions: { widthMm: 690, depthMm: 370, heightMm: 580 },
    quantity: 9
  });
  const nearDimensionCases = [
    runPinwheelCase(runPackingEngine, {
      label: "691x370x580 8개",
      runId: "field-pinwheel-near-width",
      space,
      policy,
      dimensions: { widthMm: 691, depthMm: 370, heightMm: 580 },
      quantity: 8
    }),
    runPinwheelCase(runPackingEngine, {
      label: "690x371x580 8개",
      runId: "field-pinwheel-near-depth",
      space,
      policy,
      dimensions: { widthMm: 690, depthMm: 371, heightMm: 580 },
      quantity: 8
    }),
    runPinwheelCase(runPackingEngine, {
      label: "690x370x581 8개",
      runId: "field-pinwheel-near-height",
      space,
      policy,
      dimensions: { widthMm: 690, depthMm: 370, heightMm: 581 },
      quantity: 8
    })
  ];
  const firstSpace = baseCase.output.spaces[0];
  const expectedSignature = [
    "z=0|y=0|x=0|rotation=xyz|w=690|d=370|h=580",
    "z=0|y=0|x=690|rotation=yxz|w=370|d=690|h=580",
    "z=0|y=370|x=0|rotation=yxz|w=370|d=690|h=580",
    "z=0|y=690|x=370|rotation=xyz|w=690|d=370|h=580",
    "z=580|y=0|x=0|rotation=xyz|w=690|d=370|h=580",
    "z=580|y=0|x=690|rotation=yxz|w=370|d=690|h=580",
    "z=580|y=370|x=0|rotation=yxz|w=370|d=690|h=580",
    "z=580|y=690|x=370|rotation=xyz|w=690|d=370|h=580"
  ];
  const hasExpectedSignature =
    !!firstSpace && createPackedSpaceSignature(firstSpace).join("\n") === expectedSignature.join("\n");
  const basicExpected =
    baseCase.output.usedSpaceCount === 1 &&
    baseCase.output.unloadedBlockCount === 0 &&
    baseCase.packedBlockCount === 8 &&
    hasExpectedSignature;
  const basicIssues = [
    ...baseCase.validationReasons,
    ...(hasExpectedSignature ? [] : ["기대 교차 회전 패턴 확인 필요"])
  ];
  const allPermutationCasesExpected = permutationCases.every(
    (result) =>
      result.output.usedSpaceCount === 1 && result.output.unloadedBlockCount === 0 && result.packedBlockCount === 8
  );
  const boundaryExpected =
    boundaryCase.output.usedSpaceCount > 1 &&
    boundaryCase.output.unloadedBlockCount === 0 &&
    boundaryCase.packedBlockCount === 9;
  const allNearDimensionCasesExpected = nearDimensionCases.every(
    (result) => result.output.unloadedBlockCount === 0 && result.packedBlockCount === 8
  );

  return [
    {
      name: "현장 바람개비 적재 검증 - 기본 8개",
      detail: createPinwheelSingleDetail(baseCase, "기본 파레트 1공간, 교차 회전 2층 배치", basicIssues),
      isSafe: baseCase.isSafe,
      isExpected: basicExpected
    },
    {
      name: "현장 바람개비 적재 검증 - 치수 순서 변형",
      detail: createPinwheelGroupDetail(
        permutationCases,
        "치수 순서 3건 모두 기본 파레트 1공간",
        permutationCases.flatMap((result) =>
          result.output.usedSpaceCount === 1 && result.output.unloadedBlockCount === 0 && result.packedBlockCount === 8
            ? []
            : [`${result.label} 기대값 확인: 1공간/적재 8개/미적재 0개 필요`]
        )
      ),
      isSafe: permutationCases.every((result) => result.isSafe),
      isExpected: allPermutationCasesExpected
    },
    {
      name: "현장 바람개비 적재 검증 - 9개 경계",
      detail: createPinwheelSingleDetail(
        boundaryCase,
        "9개는 1공간으로 과적하지 않고 안전하게 2공간 이상 사용",
        boundaryExpected ? [] : ["기대값 확인: 9개가 1공간에 과적되면 안 됩니다."]
      ),
      isSafe: boundaryCase.isSafe,
      isExpected: boundaryExpected
    },
    {
      name: "현장 바람개비 적재 검증 - 주변 치수",
      detail: createPinwheelGroupDetail(
        nearDimensionCases,
        "주변 치수 3건 모두 미적재 없이 안전 검증",
        nearDimensionCases.flatMap((result) =>
          result.output.unloadedBlockCount === 0 && result.packedBlockCount === 8
            ? []
            : [`${result.label} 기대값 확인: 미적재 없이 적재 8개 필요`]
        )
      ),
      isSafe: nearDimensionCases.every((result) => result.isSafe),
      isExpected: allNearDimensionCasesExpected
    }
  ];
}

function runPinwheelCase(
  runPackingEngine: PackingEngineRunner,
  {
    label,
    runId,
    space,
    policy,
    dimensions,
    quantity
  }: {
    label: string;
    runId: string;
    space: SpaceDefinition;
    policy: OptimizationInput["policy"];
    dimensions: BlockDefinition["dimensions"];
    quantity: number;
  }
): PinwheelCaseResult {
  const input: OptimizationInput = {
    runId,
    space,
    blocks: [createBlock(runId, "바람개비 검증 박스", dimensions, quantity)],
    policy
  };
  const output = runPackingEngine(input);
  const validation = validateOptimizationOutputInvariants(input, output);
  const packedBlockCount = output.spaces.reduce((sum, packedSpace) => sum + packedSpace.blocks.length, 0);

  return {
    label,
    input,
    output,
    packedBlockCount,
    validationReasons: validation.reasons,
    isSafe: validation.isValid
  };
}

function createPinwheelSingleDetail(
  result: PinwheelCaseResult,
  expectedLabel: string,
  extraIssues: string[] = []
) {
  const issues = [...result.validationReasons, ...extraIssues];

  return [
    result.label,
    expectedLabel,
    `결과 ${result.output.usedSpaceCount}공간`,
    `적재 ${result.packedBlockCount}개`,
    `미적재 ${result.output.unloadedBlockCount}개`,
    result.isSafe ? "invariant 통과" : "invariant 확인",
    issues.length > 0 ? `확인: ${issues.join("; ")}` : "안전 통과"
  ].join(", ");
}

function createPinwheelGroupDetail(
  results: PinwheelCaseResult[],
  expectedLabel: string,
  expectedIssues: string[] = []
) {
  const failedResults = results.filter((result) => result.validationReasons.length > 0);
  const issues = [
    ...expectedIssues,
    ...failedResults.map((result) => `${result.label} 안전 확인: ${result.validationReasons.join("; ")}`)
  ];
  const summaries = results.map(
    (result) =>
      `${result.label} ${result.output.usedSpaceCount}공간/적재 ${result.packedBlockCount}개/미적재 ${result.output.unloadedBlockCount}개/${
        result.isSafe ? "invariant 통과" : "invariant 확인"
      }`
  );

  return [
    expectedLabel,
    summaries.join(" | "),
    issues.length > 0 ? `확인: ${issues.join(" / ")}` : "안전 통과"
  ].join(", ");
}

function runBlockTemplateXlsxImportFeatureCheck(): FieldFeatureCheckResult {
  const preview = createBlockTemplateImportPreview([
    Array.from(BLOCK_TEMPLATE_XLSX_COLUMNS),
    ...BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS.map((row) => Array.from(row))
  ]);
  const hasExpectedRows =
    preview.rows.length === BLOCK_TEMPLATE_IMPORT_SAMPLE_ROWS.length &&
    preview.rows.some((row) => row.group1 === "금영" && row.group2 === "스피커" && row.weightKg === 18.5) &&
    preview.rows.some((row) => row.fragile);

  return {
    name: "저장 박스 엑셀 일괄등록 현장 검증",
    detail: `샘플 ${preview.rows.length}행, 오류 ${preview.errors.length}건`,
    isSafe: preview.errors.length === 0,
    isExpected: preview.canImport && hasExpectedRows
  };
}

function runDraftBlockXlsxImportFeatureCheck(): FieldFeatureCheckResult {
  const existingTemplates = [
    createBlockTemplate(
      "field-draft-xlsx-speaker",
      "KMS-210 스피커 박스",
      { widthMm: 420, depthMm: 360, heightMm: 520 },
      { weightKg: 18.5, group1: "금영", group2: "스피커" }
    ),
    createBlockTemplate(
      "field-draft-xlsx-amp",
      "EG-AMP 조합 박스",
      { widthMm: 500, depthMm: 410, heightMm: 220 },
      { fragile: true, group1: "엔터그레인", group2: "앰프" }
    )
  ];
  const preview = createDraftBlockImportPreview(
    [
      Array.from(DRAFT_BLOCK_XLSX_COLUMNS),
      ...DRAFT_BLOCK_IMPORT_SAMPLE_ROWS.map((row) => Array.from(row))
    ],
    { existingTemplates }
  );
  const hasExpectedRows =
    preview.rows.length === DRAFT_BLOCK_IMPORT_SAMPLE_ROWS.length &&
    preview.rows.some((row) => row.quantity === 12 && row.loadPriority === 5) &&
    preview.rows.some((row) => row.quantity === 4 && row.loadPriority === 5 && row.fragile);

  return {
    name: "현재 작업 엑셀 등록 현장 검증",
    detail: `샘플 ${preview.rows.length}행, 오류 ${preview.errors.length}건`,
    isSafe: preview.errors.length === 0,
    isExpected: preview.canImport && hasExpectedRows
  };
}

function runAdditionalSimulationFeatureCheck(): FieldFeatureCheckResult {
  const space = createFeatureCheckSpace("field-additional-simulation-space", "추가 시뮬레이션 검증 공간");
  const baseBlock = createPackedBlock("field-chain-base", "부분 지지 받침 박스", {
    widthMm: 600,
    depthMm: 1000,
    heightMm: 500
  });
  const result: ResultSummary = {
    resultId: "field-chain-result",
    runId: "field-chain-base-run",
    createdAt: TIMESTAMP,
    spaceSnapshot: space,
    usedSpaceCount: 1,
    averageUtilizationRate: 0.3,
    unloadedBlockCount: 0,
    spaces: [
      {
        spaceInstanceId: "field-chain-space-1",
        utilizationRate: 0.3,
        blocks: [baseBlock]
      }
    ],
    warnings: []
  };
  const additionalTemplate = createBlockTemplate(
    "field-chain-top",
    "부분 지지 추가 박스",
    { widthMm: 1000, depthMm: 1000, heightMm: 500 }
  );
  const output = runMultiChainSimulationV0({
    result,
    blockTemplates: [additionalTemplate],
    runId: "field-chain-partial-support",
    policy: createValidationPolicy(true)
  });
  const recommended = output.variants.find((variant) => variant.mode === "recommended");
  const onPolicy = createValidationPolicy(true);
  const variantValidations = validateSimulationVariants(space, onPolicy, output.variants);
  const variantValidationReasons = createVariantValidationReasons(variantValidations);
  const isSafe = !!recommended && recommended.spaces.length > 0 && variantValidationReasons.length === 0;
  const addedBlock = recommended?.spaces
    .flatMap((packedSpace) => packedSpace.blocks)
    .find((block) => block.blockTemplateId === additionalTemplate.blockTemplateId);
  const isExpected =
    output.warnings.length === 0 &&
    recommended?.totalAddedQuantity === 1 &&
    addedBlock?.zMm === 500;

  return {
    name: "추가 박스 시뮬레이션 현장 검증",
    detail: [
      `추가 ${recommended?.totalAddedQuantity ?? 0}개`,
      `추가 결과 방식 ${output.variants.length}개 전체 검증`,
      createVariantInvariantSummary(variantValidations),
      variantValidationReasons.length > 0 ? `확인: ${variantValidationReasons.join(" / ")}` : "안전 통과"
    ].join(", "),
    isSafe,
    isExpected
  };
}

function runFieldFeedbackAdditionalSimulationFeatureCheck(
  runPackingEngine: PackingEngineRunner
): FieldFeatureCheckResult {
  const space = findPresetSpace(DEFAULT_PALLET_SPACE_ID);
  const policy = createValidationPolicy(false);
  const baseOutput = runPackingEngine({
    runId: "field-feedback-base-pallet",
    space,
    blocks: [
      createBlock("field-feedback-small", "소형 박스", { widthMm: 200, depthMm: 150, heightMm: 200 }, 60),
      createBlock("field-feedback-large", "대형 박스", { widthMm: 1000, depthMm: 800, heightMm: 400 }, 5),
      createBlock("field-feedback-long", "장척 박스", { widthMm: 965, depthMm: 300, heightMm: 200 }, 10),
      createBlock("field-feedback-mid", "중형 박스", { widthMm: 600, depthMm: 250, heightMm: 150 }, 10)
    ],
    policy: createFeaturePolicy(false)
  });
  const result: ResultSummary = {
    resultId: "field-feedback-result",
    runId: baseOutput.runId,
    createdAt: TIMESTAMP,
    spaceSnapshot: space,
    usedSpaceCount: baseOutput.usedSpaceCount,
    averageUtilizationRate: baseOutput.averageUtilizationRate,
    unloadedBlockCount: baseOutput.unloadedBlockCount,
    spaces: baseOutput.spaces,
    warnings: baseOutput.warnings
  };
  const largeTemplate = createBlockTemplate(
    "field-feedback-chain-large",
    "대형 추가 박스",
    { widthMm: 1000, depthMm: 800, heightMm: 400 }
  );
  const longTemplate = createBlockTemplate(
    "field-feedback-chain-long",
    "장척 추가 박스",
    { widthMm: 965, depthMm: 300, heightMm: 200 }
  );
  const midTemplate = createBlockTemplate(
    "field-feedback-chain-mid",
    "중형 추가 박스",
    { widthMm: 600, depthMm: 250, heightMm: 150 }
  );
  const output = runMultiChainSimulationV0({
    result,
    blockTemplates: [largeTemplate, longTemplate, midTemplate],
    runId: "field-feedback-chain",
    policy,
    requestedQuantitiesByTemplateId: {
      [largeTemplate.blockTemplateId]: 6
    },
    priorityByTemplateId: {
      [largeTemplate.blockTemplateId]: 3,
      [longTemplate.blockTemplateId]: 2,
      [midTemplate.blockTemplateId]: 1
    }
  });
  const customPriority = output.variants.find((variant) => variant.mode === "custom-priority");
  const addedQuantityByTemplateId = new Map(
    customPriority?.addedQuantities.map((item) => [item.blockTemplateId, item.addedQuantity]) ?? []
  );
  const variantValidations = validateSimulationVariants(space, policy, output.variants);
  const variantValidationReasons = createVariantValidationReasons(variantValidations);
  const isSafe =
    !!customPriority &&
    output.variants.length >= 5 &&
    output.variants.every((variant) => variant.spaces.length === baseOutput.usedSpaceCount) &&
    variantValidationReasons.length === 0;
  const isExpected =
    baseOutput.usedSpaceCount === 3 &&
    baseOutput.unloadedBlockCount === 0 &&
    (customPriority?.remainingVolumeM3 ?? Number.POSITIVE_INFINITY) <= 1.084 &&
    (addedQuantityByTemplateId.get(largeTemplate.blockTemplateId) ?? 0) >= 2 &&
    (addedQuantityByTemplateId.get(longTemplate.blockTemplateId) ?? 0) > 0 &&
    (addedQuantityByTemplateId.get(midTemplate.blockTemplateId) ?? 0) > 0;
  const expectedIssues = isExpected
    ? []
    : ["기대값 확인: custom 결과는 기준 3공간 유지, 대형 2개 이상, 장척/중형 각 1개 이상 추가해야 합니다."];

  return {
    name: "현장 바람개비 적재 검증 - 혼합 추가 시뮬레이션 결과",
    detail: [
      `기준 ${baseOutput.usedSpaceCount}공간`,
      `우선순위 지정 추가 ${customPriority?.totalAddedQuantity ?? 0}개`,
      `추가 결과 방식 ${output.variants.length}개 전체 검증`,
      createVariantInvariantSummary(variantValidations),
      `남은 부피 ${customPriority?.remainingVolumeM3 ?? 0}m3`,
      [...expectedIssues, ...variantValidationReasons].length > 0
        ? `확인: ${[...expectedIssues, ...variantValidationReasons].join(" / ")}`
        : "안전 통과"
    ].join(", "),
    isSafe,
    isExpected
  };
}

function validateSimulationVariants(
  space: SpaceDefinition,
  policy: ReturnType<typeof createValidationPolicy>,
  variants: ReturnType<typeof runMultiChainSimulationV0>["variants"]
) {
  return variants.map((variant) => ({
    variant,
    validation: validatePackedSpacesInvariants({
      space,
      spaces: variant.spaces,
      policy,
      averageUtilizationRate: variant.averageUtilizationRate
    })
  }));
}

function createVariantValidationReasons(validations: ReturnType<typeof validateSimulationVariants>) {
  return validations.flatMap(({ variant, validation }) => {
    if (validation.isValid) {
      return [];
    }

    return [`${variant.label}: ${validation.reasons.join("; ")}`];
  });
}

function createVariantInvariantSummary(validations: ReturnType<typeof validateSimulationVariants>) {
  const variantSummaries = validations.map(({ variant, validation }) => {
    const packedBlockCount = variant.spaces.reduce((sum, space) => sum + space.blocks.length, 0);

    return `${variant.label} ${variant.spaces.length}공간/적재 ${packedBlockCount}개/${
      validation.isValid ? "invariant 통과" : "invariant 확인"
    }`;
  });

  return variantSummaries.join(" | ");
}

function runFieldPackingScenarioPerformance(
  scenario: FieldPackingScenario,
  runPackingEngine: PackingEngineRunner,
  nowMs: () => number,
  scenarioBudgetMs: number
): FieldPackingScenarioPerformanceResult {
  const startedAt = nowMs();
  const output = runPackingEngine(scenario.input);
  const finishedAt = nowMs();
  const elapsedMs = Math.max(0, Math.round(finishedAt - startedAt));
  const validation = validateOptimizationOutputInvariants(scenario.input, output);
  const isSafe = validation.isValid;
  const packedBlockCount = output.spaces.reduce((sum, space) => sum + space.blocks.length, 0);
  const isWithinBudget = elapsedMs <= scenarioBudgetMs;

  return {
    name: scenario.name,
    elapsedMs,
    packedBlockCount,
    usedSpaceCount: output.usedSpaceCount,
    unloadedBlockCount: output.unloadedBlockCount,
    isSafe,
    isWithinBudget,
    detail: createScenarioDetail({
      validationReasons: validation.reasons,
      unloadedBlockCount: output.unloadedBlockCount,
      elapsedMs,
      scenarioBudgetMs,
      isWithinBudget
    })
  };
}

function createScenarioDetail({
  validationReasons,
  unloadedBlockCount,
  elapsedMs,
  scenarioBudgetMs,
  isWithinBudget
}: {
  validationReasons: string[];
  unloadedBlockCount: number;
  elapsedMs: number;
  scenarioBudgetMs: number;
  isWithinBudget: boolean;
}) {
  const reasons = [
    ...validationReasons,
    ...(unloadedBlockCount > 0 ? [`미적재 ${unloadedBlockCount}개`] : []),
    ...(isWithinBudget ? [] : [`계산 시간 ${elapsedMs}ms로 예산 ${scenarioBudgetMs}ms 초과`])
  ];

  return reasons.length > 0 ? `확인: ${reasons.join("; ")}` : "안전 통과";
}

function createScenario({
  name,
  runId,
  spaceId,
  blocks
}: {
  name: string;
  runId: string;
  spaceId: string;
  blocks: BlockDefinition[];
}): FieldPackingScenario {
  return {
    name,
    input: {
      runId,
      space: findPresetSpace(spaceId),
      blocks,
      policy: {
        fragileStackOnFragileAllowed: true,
        nonFragileOnFragileAllowed: false,
        rotation: "orthogonal-90deg"
      }
    }
  };
}

function findPresetSpace(spaceId: string): SpaceDefinition {
  const space = PRESET_SPACES.find((candidate) => candidate.spaceId === spaceId);

  if (!space) {
    throw new Error(`field packing scenario preset not found: ${spaceId}`);
  }

  return space;
}

function createBlock(
  blockId: string,
  name: string,
  dimensions: BlockDefinition["dimensions"],
  quantity: number,
  fragile = false
): BlockDefinition {
  return {
    blockId,
    blockTemplateId: `template-${blockId}`,
    draftBlockItemId: `item-${blockId}`,
    entityVersion: 1,
    name,
    dimensions,
    quantity,
    fragile,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function createFeatureCheckSpace(spaceId: string, name: string): SpaceDefinition {
  return {
    spaceId,
    entityVersion: 1,
    name,
    type: "custom",
    dimensions: { widthMm: 1000, depthMm: 1000, heightMm: 1000 },
    offset: { widthMm: 0, depthMm: 0, heightMm: 0 },
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function createFeaturePolicy(partialSupportEnabled: boolean): OptimizationInput["policy"] {
  return {
    fragileStackOnFragileAllowed: true,
    nonFragileOnFragileAllowed: false,
    rotation: "orthogonal-90deg",
    partialSupportEnabled,
    minimumSupportRatio: partialSupportEnabled
      ? PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO
      : DEFAULT_MINIMUM_SUPPORT_RATIO
  };
}

function createValidationPolicy(partialSupportEnabled: boolean) {
  return {
    fragileStackOnFragileAllowed: true,
    nonFragileOnFragileAllowed: false,
    partialSupportEnabled,
    minimumSupportRatio: partialSupportEnabled
      ? PARTIAL_SUPPORT_MINIMUM_SUPPORT_RATIO
      : DEFAULT_MINIMUM_SUPPORT_RATIO
  };
}

function createPackedBlock(
  blockId: string,
  name: string,
  dimensions: { widthMm: number; depthMm: number; heightMm: number }
): PackedBlock {
  return {
    blockId,
    blockTemplateId: `template-${blockId}`,
    name,
    fragile: false,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: dimensions.widthMm,
    depthMm: dimensions.depthMm,
    heightMm: dimensions.heightMm,
    rotation: "xyz"
  };
}

function createBlockTemplate(
  blockId: string,
  name: string,
  dimensions: BlockTemplate["dimensions"],
  options: {
    fragile?: boolean;
    weightKg?: number | null;
    group1?: string;
    group2?: string;
  } = {}
): BlockTemplate {
  return {
    blockTemplateId: `template-${blockId}`,
    entityVersion: 1,
    name,
    dimensions,
    fragile: options.fragile ?? false,
    weightKg: options.weightKg ?? null,
    group1: options.group1,
    group2: options.group2,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}
